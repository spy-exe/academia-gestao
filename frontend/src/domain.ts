import { z } from 'zod';
const required=(max:number)=>z.string().trim().min(1,'Informe este campo.').max(max,`Use até ${max} caracteres.`);
const numeric=(min:number,max:number)=>z.coerce.number().min(min,`Informe pelo menos ${min}.`).max(max,`Informe até ${max}.`);
const civilDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Informe uma data válida.').refine(v=>!Number.isNaN(Date.parse(v)) && new Date(`${v}T12:00:00Z`).toISOString().slice(0,10)===v,'Data inválida.');
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const pastDate=civilDate.refine(v=>v<=today(),'A data não pode estar no futuro.');
const relation=z.coerce.number().int().positive('Selecione um registro.');
const optionalNumber=(min:number,max:number)=>z.preprocess(v=>v===''||v===null?null:v,numeric(min,max).nullable());
const contact={name:required(120),email:z.email('Informe um e-mail válido.').max(180),phone:z.string().regex(/^[+()0-9 .-]{8,30}$/,'Informe um telefone com 8 a 30 caracteres.'),active:z.boolean()};
const exercise=z.object({name:required(120),sets:numeric(1,30).int(),repetitions:required(40),loadKg:numeric(0,1000),restSeconds:numeric(0,1800).int(),notes:z.string().max(500)});
export const schemas={
 plans:z.object({name:required(100),price:numeric(0.01,9999999999.99).refine(v=>Math.abs(v*100-Math.round(v*100))<0.00001,'Use até duas casas decimais.'),periodMonths:z.coerce.number().refine(v=>[1,3,6,12].includes(v),'Escolha a periodicidade.'),benefits:z.string().max(2000),active:z.boolean()}),
 students:z.object({...contact,birthDate:pastDate,enrollmentDate:pastDate,planId:z.preprocess(v=>v===''?null:v,relation.nullable())}).refine(v=>v.birthDate<v.enrollmentDate,{path:['birthDate'],message:'Nascimento deve ser anterior à matrícula.'}),
 teachers:z.object({...contact,specialties:required(500),registration:z.string().max(40)}),
 invoices:z.object({studentId:relation,competence:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/,'Informe mês e ano.'),dueDate:civilDate}),
 workouts:z.object({name:required(120),studentId:relation,teacherId:relation,issuedOn:pastDate,notes:z.string().max(2000),exercises:z.array(exercise).min(1,'Adicione pelo menos um exercício.').max(50,'Limite de 50 exercícios.')}),
 assessments:z.object({studentId:relation,assessedOn:pastDate,weightKg:numeric(1,500),heightCm:numeric(30,260),waistCm:optionalNumber(1,300),chestCm:optionalNumber(1,300),hipCm:optionalNumber(1,300),notes:z.string().max(2000)}),
};
export type Kind=keyof typeof schemas;
export const money=(v:unknown)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v));
export const date=(v:unknown)=>v?new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(`${String(v).slice(0,10)}T12:00:00Z`)):'—';
export const labels:Record<string,string>={PAID:'Paga',OPEN:'Em aberto',OVERDUE:'Vencida'};
export function invoiceStatus(item:{paidOn:string|null;dueDate:string},day:string){return item.paidOn?'PAID':item.dueDate<day?'OVERDUE':'OPEN'}
