import 'reflect-metadata'
import express from 'express'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { getAmqp } from './rabbit'
import { prisma } from './prisma'
import { OrdersService } from './orders.service'

async function bootstrap(){
  const app = await NestFactory.create(AppModule, { bodyParser: true })
  const port = Number(process.env.PORT||3001)
  await app.listen(port)
  console.log('orders-svc on', port)

  const { ch } = await getAmqp(process.env.RABBITMQ_URL||'amqp://guest:guest@localhost:5672')
  const q = await ch.assertQueue('orders-events', { durable: true, deadLetterExchange: 'dead-letter', deadLetterRoutingKey: 'orders.dlq' })
  await ch.bindQueue(q.queue, 'domain', 'orders.#')
  // listen to upstream events
  const svc = app.get(OrdersService)

  await ch.assertQueue('orders-listener', { durable: true, deadLetterExchange: 'dead-letter', deadLetterRoutingKey: 'orders.dlq' })
  await ch.bindQueue('orders-listener', 'domain', 'inventory.*')
  await ch.bindQueue('orders-listener', 'domain', 'payment.*')

  ch.consume('orders-listener', async (msg)=>{
    if (!msg) return
    try{
      const evt = JSON.parse(msg.content.toString())
      await svc.handleEvent(evt)
      ch.ack(msg)
    }catch(e){
      const retry = (msg.properties.headers['x-retry']||0)+1
      if (retry >= 3){
        ch.publish('dead-letter','orders.dlq', Buffer.from(JSON.stringify({ reason: String(e), raw: msg.content.toString() })))
        ch.ack(msg)
      } else {
        ch.nack(msg, false, false) // dead-letter after NACK
      }
    }
  })
}
bootstrap()
