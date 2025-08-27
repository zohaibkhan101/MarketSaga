import { useState } from 'react'
export default function Home(){
  const [orderId,setOrderId]=useState<string>('')
  async function checkout(success=true){
    const amount = success? 100 : 13.37
    const res = await fetch(process.env.NEXT_PUBLIC_ORDERS_URL + '/checkout',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ items:[{ sku:'SKU-1', qty:1 }], payment:{ amount, card:'demo' } })
    })
    const json = await res.json()
    setOrderId(json.orderId)
  }
  return <div style={{padding:20}}>
    <h1>Market Saga Demo</h1>
    <button onClick={()=>checkout(true)}>Successful checkout</button>
    <button onClick={()=>checkout(false)} style={{marginLeft:10}}>Failing checkout</button>
    <div>Order ID: {orderId}</div>
  </div>
}
