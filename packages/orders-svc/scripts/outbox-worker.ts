import { prisma } from '../src/prisma'
import { getAmqp } from '../src/rabbit'

async function run(){
  const { ch } = await getAmqp(process.env.RABBITMQ_URL||'amqp://guest:guest@localhost:5672')
  while(true){
    const batch = await prisma.outbox.findMany({ where: { sentAt: null }, take: 20, orderBy: { createdAt: 'asc' } })
    for(const row of batch){
      const evt = { id: row.id, ...row.payload as any }
      ch.publish('domain', row.topic, Buffer.from(JSON.stringify(evt)), { persistent: true })
      await prisma.outbox.update({ where:{ id: row.id }, data:{ sentAt: new Date() } })
    }
    await new Promise(r=>setTimeout(r, 500))
  }
}
run().catch(e=>{ console.error(e); process.exit(1) })
