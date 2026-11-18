import type { Entity } from '../src/api';
import type { Kind } from '../src/domain';
export const records:Record<Kind,Entity[]>={
 plans:[{id:1,version:0,name:'Essencial',price:149.90,periodMonths:1,benefits:'Musculação',active:true}],
 students:[{id:1,version:0,name:'Ana Teste',email:'ana@example.test',phone:'11999999999',birthDate:'2000-01-01',enrollmentDate:'2026-01-01',plan:{id:1,name:'Essencial'},active:true}],
 teachers:[{id:1,version:0,name:'Rafael Teste',email:'rafael@example.test',phone:'11999999999',specialties:'Força',registration:'TEST-001',active:true}],
 invoices:[{id:1,version:0,student:{id:1,name:'Ana Teste'},competence:'2026-01',dueDate:'2026-01-10',amount:149.90,periodMonths:1,paidOn:null,status:'OVERDUE'}],
 workouts:[{id:1,version:0,name:'Ficha A',student:{id:1,name:'Ana Teste'},teacher:{id:1,name:'Rafael Teste'},issuedOn:'2026-01-01',notes:'Orientação',active:true,exercises:[{name:'Agachamento',sets:3,repetitions:'12',loadKg:20,restSeconds:60,notes:''}]}],
 assessments:[{id:1,version:0,student:{id:1,name:'Ana Teste'},assessedOn:'2026-01-02',weightKg:80,heightCm:180,waistCm:85,chestCm:100,hipCm:95,bmi:24.69,notes:'Acompanhamento'}],
};
export const dashboard={activeStudents:1,activeTeachers:1,availablePlans:1,monthlyRevenue:149.90,pendingAmount:149.90,pendingInvoices:1,overdueInvoices:1,overdueAmount:149.90,recentActivities:[{id:1,actor:'sistema',description:'Aluno cadastrado · Ana Teste',occurredAt:'2026-01-01T12:00:00Z'},{id:2,actor:'admin@example.test',description:'Plano cadastrado',occurredAt:'2026-01-01T12:05:00Z'}]};
