import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './module'
import { getAmqp } from './rabbit'
import { prisma } from './prisma'

async function bootstrap(){
  const app = await NestFactory.create(AppModule)
  const port = Number(process.env.PORT||3003)
  await app.listen(port)
  console.log('inventory-svc on', port)

  const { ch } = await getAmqp(process.env.RABBITMQ_URL||'amqp://guest:guest@localhost:5672')
  await ch.assertQueue('inventory', { durable: true, deadLetterExchange: 'dead-letter', deadLetterRoutingKey:'inventory.dlq' })
  await ch.bindQueue('inventory','domain','inventory.*')
  await ch.bindQueue('inventory','domain','orders.*') // not used here but available

  ch.consume('inventory', async (msg)=>{
    if(!msg) return
    try{
      const evt = JSON.parse(msg.content.toString())
      const seen = await prisma.processedEvent.findUnique({ where:{ eventId: evt.id } })
      if (!seen){
        await prisma.processedEvent.create({ data:{ eventId: evt.id } })
        if (msg.fields.routingKey==='inventory.reserve.requested'){
          // ensure stock exists
          for(const it of evt.items||[]){
            const s = await prisma.stock.findUnique({ where:{ sku: it.sku } }) ||
                      await prisma.stock.create({ data:{ sku: it.sku, qty: 0 } })
            if (s.qty < it.qty){
              ch.publish('domain','inventory.failed', Buffer.from(JSON.stringify({ id: 'evt-'+Date.now(), type:'INVENTORY_FAILED', orderId: evt.orderId, reason: 'insufficient stock' })))
              ch.ack(msg); continue
            }
          }
          for(const it of evt.items||[]){
            await prisma.stock.update({ where:{ sku: it.sku }, data:{ qty: { decrement: it.qty }}})
          }
          ch.publish('domain','inventory.reserved', Buffer.from(JSON.stringify({ id: 'evt-'+Date.now(), type:'INVENTORY_RESERVED', orderId: evt.orderId })))
        } else if (msg.fields.routingKey==='inventory.release.requested'){
          // naive release of 1 qty per item (demo)
          ch.publish('domain','inventory.released', Buffer.from(JSON.stringify({ id:'evt-'+Date.now(), type:'INVENTORY_RELEASED', orderId: evt.orderId })))
        }
      }
      ch.ack(msg)
    }catch(e){
      const retry = (msg.properties.headers['x-retry']||0)+1
      if (retry>=3){
        ch.publish('dead-letter','inventory.dlq', Buffer.from(JSON.stringify({ reason:String(e), raw: msg.content.toString() })))
        ch.ack(msg)
      } else {
        ch.nack(msg, false, false)
      }
    }
  })
}
bootstrap()
