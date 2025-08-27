import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { Module, Controller, Get } from '@nestjs/common'
import { getAmqp } from './rabbit'

@Controller()
class Api {
  @Get('health') health(){ return { ok: true } }
  @Get('metrics') metrics(){ return "payments_metrics 1\n" }
}

@Module({ controllers:[Api] })
class AppModule {}

async function bootstrap(){
  const app = await NestFactory.create(AppModule)
  const port = Number(process.env.PORT||3004)
  await app.listen(port)
  console.log('payments-svc on', port)

  const { ch } = await getAmqp(process.env.RABBITMQ_URL||'amqp://guest:guest@localhost:5672')
  await ch.assertQueue('payments', { durable:true, deadLetterExchange:'dead-letter', deadLetterRoutingKey:'payments.dlq' })
  await ch.bindQueue('payments','domain','payment.*')
  await ch.consume('payments', async (msg)=>{
    if(!msg) return
    try{
      const evt = JSON.parse(msg.content.toString())
      if (msg.fields.routingKey==='payment.charge.requested'){
        // simulate failure if amount==13.37
        if (Number(evt.amount) === 13.37){
          ch.publish('domain','payment.failed', Buffer.from(JSON.stringify({ id:'evt-'+Date.now(), type:'PAYMENT_FAILED', orderId: evt.orderId, reason:'simulated failure' })))
        } else {
          ch.publish('domain','payment.charged', Buffer.from(JSON.stringify({ id:'evt-'+Date.now(), type:'PAYMENT_CHARGED', orderId: evt.orderId })))
        }
      }
      if (msg.fields.routingKey==='payment.refund.requested'){
        ch.publish('domain','payment.refunded', Buffer.from(JSON.stringify({ id:'evt-'+Date.now(), type:'PAYMENT_REFUNDED', orderId: evt.orderId })))
      }
      ch.ack(msg)
    }catch(e){
      const retry = (msg.properties.headers['x-retry']||0)+1
      if (retry>=3){
        ch.publish('dead-letter','payments.dlq', Buffer.from(JSON.stringify({ reason:String(e), raw: msg.content.toString() })))
        ch.ack(msg)
      } else {
        ch.nack(msg, false, false)
      }
    }
  })
}
bootstrap()
