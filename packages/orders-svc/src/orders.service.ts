import { Injectable } from '@nestjs/common'
import { prisma } from './prisma'
import { reduce, SagaState } from './saga'

const RABBIT = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'

@Injectable()
export class OrdersService {
  async createOrder(dto:any){
    const total = (dto.items||[]).reduce((s:any,i:any)=>s+i.qty*(dto.payment?.amount? dto.payment.amount : 100),0)
    const order = await prisma.$transaction(async (tx)=>{
      const created = await tx.order.create({ data: { status: 'NEW', total } })
      for(const it of dto.items||[]){
        await tx.orderItem.create({ data: { orderId: created.id, sku: it.sku, qty: it.qty } })
      }
      await tx.outbox.create({ data: {
        topic: 'inventory.reserve.requested',
        payload: { orderId: created.id, items: dto.items }
      }})
      await tx.idempotencyKey.create({ data: { key: `checkout:${created.id}` } })
      return created
    })
    return order
  }

  async handleEvent(evt:any){
    const exists = await prisma.processedEvent.findUnique({ where: { eventId: evt.id } })
    if (exists) return
    await prisma.processedEvent.create({ data: { eventId: evt.id } })

    const order = await prisma.order.findUnique({ where: { id: evt.orderId } })
    if (!order) return
    let state = (order.status as SagaState) || 'NEW'
    if (evt.type==='INVENTORY_RESERVED') state = reduce(state,{type:'RESERVE_OK'})
    if (evt.type==='INVENTORY_FAILED')   state = reduce(state,{type:'RESERVE_FAIL', reason: evt.reason})
    if (evt.type==='PAYMENT_CHARGED')    state = reduce(state,{type:'CHARGE_OK'})
    if (evt.type==='PAYMENT_FAILED')     state = reduce(state,{type:'CHARGE_FAIL', reason: evt.reason})

    await prisma.order.update({ where:{ id: order.id }, data:{ status: state }})

    if (evt.type==='INVENTORY_RESERVED'){
      // charge
      await prisma.outbox.create({ data: { topic:'payment.charge.requested', payload: { orderId: order.id, amount: order.total }}})
    }
    if (evt.type==='PAYMENT_CHARGED'){
      await prisma.outbox.create({ data: { topic:'order.confirmed', payload: { orderId: order.id }}})
    }
    if (evt.type==='INVENTORY_FAILED'){
      // nothing - order failed
    }
    if (evt.type==='PAYMENT_FAILED'){
      // compensation: release inventory
      await prisma.outbox.create({ data: { topic: 'inventory.release.requested', payload: { orderId: order.id }}})
    }
  }

  async getOrder(id:string){
    return prisma.order.findUnique({ where:{ id } })
  }
}
