import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { Module, Controller, Post, Body, Get } from '@nestjs/common'

const catalog:any[] = []

@Controller()
class Api {
  @Post('products')
  add(@Body() b:any){
    const item = { sku: b.sku, name: b.name, price: b.price, stock: b.stock||0 }
    catalog.push(item)
    return item
  }
  @Get('health') health(){ return { ok: true } }
  @Get('metrics') metrics(){ return "products_metrics 1\n" }
}

@Module({ controllers:[Api] })
class AppModule {}

async function bootstrap(){
  const app = await NestFactory.create(AppModule)
  const port = Number(process.env.PORT||3002)
  await app.listen(port)
  console.log('products-svc on', port)
}
bootstrap()
