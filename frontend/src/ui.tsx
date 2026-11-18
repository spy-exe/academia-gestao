import { createContext,useContext,useState,type ReactNode,type ButtonHTMLAttributes } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { LoaderCircle,X,CheckCircle2,AlertCircle } from 'lucide-react';
export function Button({children,busy=false,tone='primary',className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{busy?:boolean;tone?:'primary'|'neutral'|'danger'|'ghost'}){
 return <button {...props} disabled={props.disabled||busy} aria-busy={busy} className={`button ${tone} ${className}`}>{busy?<LoaderCircle className="spin" size={17}/>:null}{children}</button>;
}
export function Loading(){return <div className="state" role="status"><LoaderCircle className="spin" size={22}/><span>Carregando dados…</span></div>}
export function Failure({error,retry}:{error:Error;retry:()=>void}){return <div className="state error" role="alert"><AlertCircle size={24}/><p>{error.message}</p><Button tone="neutral" onClick={retry}>Tentar novamente</Button></div>}
export function Empty({title='Nenhum registro por aqui',text='Adicione o primeiro registro para começar.'}:{title?:string;text?:string}){return <div className="state"><div className="empty-symbol"><span>—</span></div><h3>{title}</h3><p>{text}</p></div>}
export function Modal({open,onClose,title,description,children}:{open:boolean;onClose:()=>void;title:string;description?:string;children:ReactNode}){
 return <Dialog.Root open={open} onOpenChange={v=>{if(!v)onClose()}}><Dialog.Portal><Dialog.Overlay className="overlay"/><Dialog.Content className="dialog"><header><div><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description??'Preencha os dados e salve para concluir.'}</Dialog.Description></div><Dialog.Close asChild><button type="button" className="icon-button" aria-label="Fechar"><X size={20}/></button></Dialog.Close></header>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
export function Confirm({open,title,text,label='Arquivar',onClose,onConfirm,busy,error}:{open:boolean;title:string;text:string;label?:string;onClose:()=>void;onConfirm:()=>void;busy?:boolean;error?:string}){
 return <Modal open={open} onClose={()=>{if(!busy)onClose()}} title={title} description={text}><div className="dialog-body">{error?<p role="alert" className="error">{error}</p>:null}</div><footer><Button autoFocus tone="neutral" onClick={onClose} disabled={busy}>Cancelar</Button><Button tone={label==='Registrar pagamento'?'primary':'danger'} busy={busy} onClick={onConfirm}>{label}</Button></footer></Modal>;
}
const FeedbackContext=createContext<(message:string)=>void>(()=>{});
export function FeedbackProvider({children}:{children:ReactNode}){
 const [message,setMessage]=useState('');
 return <FeedbackContext.Provider value={setMessage}>{children}<div className={`toast ${message?'visible':''}`} role="status" aria-live="polite">{message?<><CheckCircle2 size={18}/><span>{message}</span><button className="icon-button" aria-label="Fechar notificação" onClick={()=>setMessage('')}><X size={16}/></button></>:null}</div></FeedbackContext.Provider>;
}
export const useFeedback=()=>useContext(FeedbackContext);
export function Badge({value}:{value:unknown}){const text=String(value);return <span className={`badge ${text==='Ativo'||text==='Paga'?'success':text==='Vencida'?'danger':'neutral'}`}>{text}</span>}
