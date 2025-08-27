import { Controller, Post, Body, Get, Param } from '@nestjs/common'
import { OrdersService } from './orders.service'
import { prisma } from './prisma'

@Controller()
export class OrdersController{
  constructor(private svc: OrdersService){}

  @Post('checkout')
  async checkout(@Body() dto:any){
    const o = await this.svc.createOrder(dto)
    return { orderId: o.id, status: o.status }
  }

  @Get('orders/:id')
  async get(@Param('id') id:string){
    const o = await this.svc.getOrder(id)
    return o || {}
  }

  @Get('health')
  health(){ return { ok: true } }

  @Get('metrics')
  metrics(){ return "orders_metrics 1\n" }
}
