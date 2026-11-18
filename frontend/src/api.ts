export class ApiError extends Error {
  constructor(public status:number,message:string,public fields:Record<string,string>={}){super(message)}
}
let token: {token:string;headerName:string}|undefined;
export async function csrf(){ token=await request<{token:string;headerName:string}>('/auth/csrf');return token! }
export async function request<T>(path:string, options:RequestInit={}):Promise<T>{
  let response:Response;
  try{response=await fetch(`/api${path}`,{credentials:'same-origin',...options,signal:options.signal??AbortSignal.timeout(20000)})}catch(e){if(e instanceof DOMException&&e.name==='AbortError')throw e;throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.')}
  if((response.status===401||response.status===403)&&!path.startsWith('/auth/'))window.dispatchEvent(new Event('session-expired'));
  if(!response.ok){const problem=await response.json().catch(()=>({detail:'O servidor não respondeu corretamente.'}));throw new ApiError(response.status,problem.detail??'Não foi possível concluir a operação.',problem.fields)}
  if(response.status===204)return undefined as T;
  return response.json();
}
export async function mutate<T>(path:string,method:string,body?:unknown){
  const current=token??await csrf();
  return request<T>(path,{method,headers:{'Content-Type':'application/json',[current.headerName]:current.token},body:body===undefined?undefined:JSON.stringify(body)});
}
export async function login(email:string,password:string){
  const current=await csrf();
  await request('/auth/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',[current.headerName]:current.token},body:new URLSearchParams({email,password})});
  await csrf();
}
export interface Page<T>{content:T[];totalElements:number;totalPages:number;number:number;size:number}
export interface Entity {id:number;version:number;name?:string;active?:boolean;[key:string]:unknown}
