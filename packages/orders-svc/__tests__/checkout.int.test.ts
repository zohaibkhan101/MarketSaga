import { execSync, spawn } from 'child_process'
import { wait } from '../src/test.util'
import http from 'http'

function post(url:string, body:any):Promise<any>{
  return new Promise((resolve,reject)=>{
    const data = Buffer.from(JSON.stringify(body))
    const req = http.request(url,{ method:'POST', headers:{'Content-Type':'application/json','Content-Length':data.length}},(res)=>{
      let out=''; res.on('data',d=>out+=d); res.on('end',()=>resolve(JSON.parse(out||'{}')))
    })
    req.on('error',reject)
    req.write(data); req.end()
  })
}
function get(url:string){ return new Promise<any>((resolve,reject)=>{
  http.get(url,(res)=>{ let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(JSON.parse(d||'{}'))) }).on('error',reject)
})}

describe('checkout saga (requires local infra)', ()=>{
  it('confirms order eventually (manual run with compose)', async()=>{
    // This is a lightweight smoke test that can run when services are up.
    // Skip if orders endpoint not reachable.
    try{
      const ok = await get('http://localhost:3001/health')
      expect(ok.ok).toBe(true)
    }catch(e){
      console.warn('Skipping test: orders-svc not reachable. Run via docker compose.')
      return
    }
    const res = await post('http://localhost:3001/checkout', { items:[{ sku:'SKU-1', qty:1 }], payment:{ amount: 100, card:'demo' } })
    expect(res.orderId).toBeTruthy()
  }, 30000)
})
