import {requestHeaders} from './firebase';
export class ApiError extends Error{constructor(message:string,public status:number,public fieldErrors?:Record<string,string[]>){super(message);}}
async function request(path:string,options:RequestInit={}){
 const headers=new Headers(options.headers);
 for(const [key,value] of Object.entries(await requestHeaders()))headers.set(key,value);
 if(options.body&&typeof options.body==='string'&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
 const response=await fetch(path,{...options,headers,credentials:'same-origin',cache:'no-store'});
 if(!response.ok){const data=await response.json().catch(()=>({}));throw new ApiError(data.error||'הבקשה לא הושלמה. נסו שוב.',response.status,data.fieldErrors);}
 return response;
}
export async function api<T>(path:string,options?:RequestInit):Promise<T>{return (await request(path,options)).json();}
export async function apiDownload(path:string,filename='export.csv'):Promise<void>{
 const response=await request(path);
 const disposition=response.headers.get('content-disposition');
 const encoded=disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
 if(encoded)filename=decodeURIComponent(encoded);
 const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
