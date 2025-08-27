import amqp from 'amqplib'
export async function getAmqp(url: string) {
  const conn = await amqp.connect(url)
  const ch = await conn.createChannel()
  await ch.assertExchange('domain', 'topic', { durable: true })
  await ch.assertExchange('dead-letter', 'topic', { durable: true })
  return { conn, ch }
}
