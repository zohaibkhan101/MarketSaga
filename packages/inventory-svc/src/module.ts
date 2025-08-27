import { Module } from '@nestjs/common'
import { Controller, Post, Body, Get } from '@nestjs/common'
import { prisma } from './prisma'

@Controller()
class Api {
  @Post('seed')
  async seed(@Body() b:any){
    for(const s of b.stocks||[]) await prisma.stock.upsert({ where:{ sku:s.sku }, update:{ qty:s.qty }, create:{ sku:s.sku, qty:s.qty } })
    return { ok:true }
  }
  @Get('health') health(){ return { ok:true } }
  @Get('metrics') metrics(){ return 'inventory_metrics 1\n' }
}
@Module({ controllers:[Api] })
export class AppModule {}
