import http from 'http'

export async function wait(ms:number){ return new Promise(r=>setTimeout(r,ms)) }

export async function get(url:string){
  return new Promise<string>((resolve,reject)=>{
    http.get(url,(res)=>{
      let data=''; res.on('data',d=>data+=d); res.on('end',()=>resolve(data))
    }).on('error',reject)
  })
}
