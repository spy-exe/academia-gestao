import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
import { render,screen,waitFor,fireEvent,act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter,Routes,Route } from 'react-router-dom';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { CollectionPage } from '../src/CollectionPage';
import { EntityForm,ReferenceField } from '../src/EntityForm';
import { Dashboard } from '../src/Dashboard';
import { StudentDetail } from '../src/StudentDetail';
import { FeedbackProvider } from '../src/ui';
import { ApiError,type Entity } from '../src/api';
import { modules } from '../src/registry';
import type { Kind } from '../src/domain';
import { records,dashboard } from './fixtures';
const api=vi.hoisted(()=>({request:vi.fn(),mutate:vi.fn()}));
vi.mock('../src/api',async original=>({...await original<typeof import('../src/api')>(),request:api.request,mutate:api.mutate}));
let store:Record<Kind,Entity[]>;
let totalOverride:number|undefined;
beforeEach(()=>{
 store=structuredClone(records);totalOverride=undefined;api.request.mockReset();api.mutate.mockReset();
 api.request.mockImplementation(async(path:string)=>{
  const url=new URL(path,'http://example.test');if(url.pathname==='/dashboard')return structuredClone(dashboard);
  const [kind,id]=url.pathname.slice(1).split('/') as [Kind,string|undefined];
  if(id)return store[kind].find(r=>r.id===Number(id));
  let rows=store[kind]??[];const q=url.searchParams.get('q');if(q)rows=rows.filter(r=>String(r.name??(r.student as Entity)?.name).toLowerCase().includes(q.toLowerCase()));
  return {content:structuredClone(rows),totalElements:totalOverride??rows.length,totalPages:totalOverride?Math.ceil(totalOverride/10):rows.length?1:0,number:0,size:10};
 });
 api.mutate.mockImplementation(async(path:string,method:string,body:Record<string,unknown>)=>{
  const [kind,id,action]=path.slice(1).split('/') as [Kind,string|undefined,string|undefined];
  if(action==='payment'){store.invoices[0]={...store.invoices[0],status:'PAID',paidOn:'2026-01-15'};return store.invoices[0]}
  if(method==='DELETE'){store[kind]=store[kind].map(r=>r.id===Number(id)?{...r,active:false}:r);return}
  const next={...body,id:id?Number(id):100,version:1,student:store.students[0],teacher:store.teachers[0],plan:store.plans[0],amount:149.90,status:'OPEN',active:Boolean(body.active??true)} as Entity;
  store[kind]=id?store[kind].map(r=>r.id===Number(id)?next:r):[...store[kind],next];return next;
 });
});
afterEach(()=>vi.restoreAllMocks());
function view(node:React.ReactNode,path='/'){
 const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{retry:false}}});
 return render(<QueryClientProvider client={client}><FeedbackProvider><MemoryRouter initialEntries={[path]}>{node}</MemoryRouter></FeedbackProvider></QueryClientProvider>);
}
function collection(kind:Kind,path?:string){return view(<CollectionPage kind={kind}/>,path??'/'+modules[kind].path)}
async function change(label:string,value:string){fireEvent.change(screen.getByLabelText(label,{exact:true}),{target:{value}})}
async function reference(user:ReturnType<typeof userEvent.setup>,label:string,name:string){await screen.findByRole('option',{name});await user.selectOptions(screen.getByLabelText(label,{exact:true}),'1')}
async function fill(kind:Kind,user:ReturnType<typeof userEvent.setup>){
 if(kind==='plans'){await change('Nome do plano','Plano novo');await change('Valor (R$)','169.90');await user.selectOptions(screen.getByLabelText('Periodicidade'),'1');await change('Benefícios','Musculação e aulas')}
 if(kind==='students'||kind==='teachers'){await change('Nome completo',kind==='students'?'Aluno novo':'Professor novo');await change('E-mail','novo@example.test');await change('Telefone','11999997777')}
 if(kind==='students'){await change('Nascimento','2000-01-01');await change('Matrícula','2026-01-01');await reference(user,'Plano','Essencial')}
 if(kind==='teachers'){await change('Registro profissional (opcional)','TEST-NEW');await change('Especialidades','Condicionamento')}
 if(kind==='invoices'){await reference(user,'Aluno','Ana Teste');await change('Competência','2026-02');await change('Vencimento','2026-02-10')}
 if(kind==='workouts'){await change('Nome da ficha','Ficha nova');await reference(user,'Aluno','Ana Teste');await reference(user,'Professor responsável','Rafael Teste');await change('Data da ficha','2026-01-01');await change('Observações','Acompanhamento');await user.click(screen.getByRole('button',{name:'Adicionar exercício'}));await change('Exercício','Remada')}
 if(kind==='assessments'){await reference(user,'Aluno','Ana Teste');await change('Data da avaliação','2026-01-05');await change('Peso (kg)','79');await change('Altura (cm)','180');await change('Cintura (cm, opcional)','84');await change('Tórax (cm, opcional)','99');await change('Quadril (cm, opcional)','95');await change('Observações','Medidas registradas')}
}
describe.each(Object.keys(modules) as Kind[])('%s',kind=>{
 it('cria registro com validação e atualiza os dados exibidos',async()=>{
  const user=userEvent.setup();collection(kind);await screen.findByRole('table');await user.click(screen.getByRole('button',{name:modules[kind].action}));
  await fill(kind,user);await user.click(screen.getByRole('button',{name:kind==='invoices'?'Gerar mensalidade':'Salvar cadastro'}));
  await waitFor(()=>expect(api.mutate).toHaveBeenCalledWith('/'+kind,'POST',expect.any(Object)));await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());expect(screen.getByRole('status')).toHaveTextContent(/cadastrad|registrad/);
 });
 it('mostra falha de consulta e oferece recuperação',async()=>{api.request.mockRejectedValueOnce(new Error('Servidor indisponível'));const user=userEvent.setup();collection(kind);await screen.findByText('Servidor indisponível');await user.click(screen.getByRole('button',{name:'Tentar novamente'}));await screen.findByRole('table')});
 it('comunica lista vazia e pesquisa sem resultado',async()=>{store[kind]=[];collection(kind);await screen.findByText('Nenhum registro por aqui');expect(screen.getByText(`Use “${modules[kind].action}” para adicionar um registro.`)).toBeVisible()});
});
it('edita cadastro com versão e rejeita perda acidental das alterações',async()=>{
 const user=userEvent.setup();collection('students');await user.click(await screen.findByRole('button',{name:'Editar Ana Teste'}));await change('Nome completo','Ana Atualizada');await user.click(screen.getByRole('button',{name:'Cancelar'}));expect(await screen.findByText('Descartar alterações?')).toBeVisible();await user.click(screen.getAllByRole('button',{name:'Cancelar'}).at(-1)!);await user.click(screen.getByRole('button',{name:'Salvar alterações'}));await screen.findByRole('link',{name:'Ana Atualizada'});expect(api.mutate).toHaveBeenCalledWith('/students/1','PUT',expect.objectContaining({version:0,name:'Ana Atualizada'}));
});
it('arquiva após confirmação e preserva o estado do cadastro',async()=>{const user=userEvent.setup();collection('teachers');await user.click(await screen.findByRole('button',{name:'Arquivar Rafael Teste'}));await user.click(screen.getByRole('button',{name:'Cancelar'}));expect(api.mutate).not.toHaveBeenCalled();await user.click(screen.getByRole('button',{name:'Arquivar Rafael Teste'}));await user.click(screen.getByRole('button',{name:'Arquivar'}));await screen.findByText('Arquivado');expect(api.mutate).toHaveBeenCalledWith('/teachers/1','DELETE')});
it('registra pagamento administrativo e atualiza a situação',async()=>{const user=userEvent.setup();collection('invoices');await user.click(await screen.findByRole('button',{name:'Registrar pagamento de Ana Teste'}));expect(screen.getByText(/Nenhuma transação bancária/)).toBeVisible();await user.click(screen.getByRole('button',{name:'Registrar pagamento'}));await screen.findByText('Paga');expect(screen.queryByRole('button',{name:'Registrar pagamento de Ana Teste'})).not.toBeInTheDocument()});
it('mantém a confirmação aberta em caso de erro financeiro',async()=>{api.mutate.mockRejectedValue(new Error('Pagamento não registrado'));const user=userEvent.setup();collection('invoices');await user.click(await screen.findByRole('button',{name:'Registrar pagamento de Ana Teste'}));await user.click(screen.getByRole('button',{name:'Registrar pagamento'}));expect(await screen.findByText('Pagamento não registrado')).toBeVisible()});
it('busca, limpa, ordena, filtra e muda a paginação',async()=>{
 totalOverride=21;const user=userEvent.setup();collection('students');await screen.findByRole('table');await user.type(screen.getByRole('textbox',{name:'Pesquisar alunos'}),'Nada');await user.keyboard('{Enter}');await screen.findByText('Tente outro termo ou limpe a pesquisa.');await user.click(screen.getByRole('button',{name:'Limpar pesquisa de alunos'}));await screen.findByRole('table');expect(screen.getByRole('textbox',{name:'Pesquisar alunos'})).toHaveFocus();await user.click(screen.getByRole('button',{name:'Aluno'}));await user.selectOptions(screen.getByRole('combobox',{name:'Filtrar alunos'}),'true');await user.click(screen.getByRole('button',{name:'Próxima página de alunos'}));await screen.findByText('2 / 3');await user.click(screen.getByRole('button',{name:'Página anterior de alunos'}));await screen.findByText('1 / 3');expect(api.request.mock.calls.some(([path])=>String(path).includes('direction=desc'))).toBe(true);
});
it('debounce de busca respeita composição e ajuste da página vazia',async()=>{
 const user=userEvent.setup();collection('students','/alunos?page=99');await screen.findByText('1 / 1');const input=screen.getByRole('textbox',{name:'Pesquisar alunos'});fireEvent.compositionStart(input);fireEvent.change(input,{target:{value:'Ana'}});await act(async()=>{await new Promise(resolve=>setTimeout(resolve,350))});expect(api.request.mock.calls.some(([path])=>String(path).includes('q=Ana'))).toBe(false);fireEvent.compositionEnd(input);await waitFor(()=>expect(api.request.mock.calls.some(([path])=>String(path).includes('q=Ana'))).toBe(true));await user.clear(input);
});
describe.each(['plans','teachers','workouts','assessments','invoices'] as Kind[])('consulta %s',kind=>{
 it('abre e fecha consulta individual',async()=>{const user=userEvent.setup();collection(kind);await user.click(await screen.findByRole('button',{name:`Consultar ${store[kind][0].name??modules[kind].singular}`}));expect(await screen.findByText('Dados registrados na academia.')).toBeVisible();await user.click(screen.getByRole('button',{name:'Fechar consulta'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument()});
});
it('encaminha consulta de aluno ao histórico completo',async()=>{const user=userEvent.setup();collection('students');await user.click(await screen.findByRole('button',{name:'Consultar Ana Teste'}));expect(screen.getByRole('link',{name:'Abrir histórico completo'})).toHaveAttribute('href','/alunos/1')});
it('comunica falha de consulta individual e edição',async()=>{const user=userEvent.setup();collection('teachers');await screen.findByRole('table');api.request.mockRejectedValue(new Error('Consulta indisponível'));await user.click(screen.getByRole('button',{name:'Editar Rafael Teste'}));await screen.findByText('Consulta indisponível');await user.click(screen.getByRole('button',{name:'Consultar Rafael Teste'}));expect(screen.getByRole('alert')).toHaveTextContent('Consulta indisponível')});
it('mantém entrada após erro de validação do servidor',async()=>{
 api.mutate.mockRejectedValueOnce(new ApiError(400,'Confira o nome',{name:'Nome já cadastrado'}));const user=userEvent.setup();view(<EntityForm kind="plans" open onClose={vi.fn()}/>);await fill('plans',user);await user.click(screen.getByRole('button',{name:'Salvar cadastro'}));expect(await screen.findByText('Confira o nome')).toBeVisible();expect(screen.getByText('Nome já cadastrado')).toBeVisible();expect(screen.getByLabelText('Nome do plano')).toHaveValue('Plano novo');
});
it('validação foca o primeiro campo inválido e permite descartar',async()=>{const user=userEvent.setup();const close=vi.fn();view(<EntityForm kind="students" open onClose={close}/>);await user.click(screen.getByRole('button',{name:'Salvar cadastro'}));await screen.findByText('Informe este campo.');await waitFor(()=>expect(screen.getByLabelText('Nome completo')).toHaveFocus());await change('Nome completo','Rascunho');await user.click(screen.getByRole('button',{name:'Fechar'}));await user.click(screen.getByRole('button',{name:'Descartar'}));expect(close).toHaveBeenCalled()});
it('edita e ordena exercícios com alternativas ao arraste',async()=>{
 const user=userEvent.setup();const close=vi.fn();view(<EntityForm kind="workouts" item={records.workouts[0]} open onClose={close}/>);await user.click(screen.getByRole('button',{name:'Adicionar exercício'}));const names=screen.getAllByLabelText('Exercício');fireEvent.change(names[1],{target:{value:'Remada'}});await user.click(screen.getByRole('button',{name:'Subir exercício 2'}));expect(screen.getAllByLabelText('Exercício')[0]).toHaveValue('Remada');await user.click(screen.getByRole('button',{name:'Descer exercício 1'}));await user.click(screen.getByRole('button',{name:'Remover exercício 2'}));await user.click(screen.getByRole('button',{name:'Salvar alterações'}));await waitFor(()=>expect(close).toHaveBeenCalled());expect(api.mutate).toHaveBeenCalledWith('/workouts/1','PUT',expect.objectContaining({exercises:[expect.objectContaining({name:'Agachamento'})]}));
});
it('recupera opções, inclui selecionado inativo e limpa busca',async()=>{
 const user=userEvent.setup();store.plans[0].active=false;api.request.mockImplementation(async path=>path.endsWith('/1')?store.plans[0]:{content:[],totalElements:0,totalPages:0});const change=vi.fn();view(<ReferenceField spec={{name:'planId',label:'Plano',reference:'plans'}} value={1} onChange={change} id="ref-plan" invalid={false}/>);expect(await screen.findByRole('option',{name:'Essencial (inativo)'})).toBeVisible();await user.type(screen.getByRole('textbox',{name:'Buscar plano'}),'Ess');await user.click(screen.getByRole('button',{name:'Limpar busca de plano'}));expect(screen.getByRole('textbox',{name:'Buscar plano'})).toHaveValue('');await user.selectOptions(screen.getByRole('combobox'),'');expect(change).toHaveBeenCalledWith('');
});
it('apresenta falha das opções e tenta novamente',async()=>{api.request.mockRejectedValueOnce(new Error('Falha'));const user=userEvent.setup();view(<ReferenceField spec={{name:'studentId',label:'Aluno',reference:'students'}} value="" onChange={vi.fn()} id="ref-student" invalid/>);await screen.findByText(/Não foi possível carregar as opções/);await user.click(screen.getByRole('button',{name:'Tentar novamente'}));await screen.findByRole('option',{name:'Ana Teste'})});
it('dashboard utiliza indicadores e atividades reais da resposta',async()=>{view(<Dashboard/>);await screen.findByRole('heading',{name:'Visão geral'});expect(screen.getByText('Aluno cadastrado · Ana Teste')).toBeVisible();expect(screen.getAllByText(/149,90/)).toHaveLength(3)});
it('dashboard vazio orienta a primeira ação e falha permite repetição',async()=>{api.request.mockRejectedValueOnce(new Error('Falha no dashboard'));const user=userEvent.setup();view(<Dashboard/>);await screen.findByText('Falha no dashboard');api.request.mockResolvedValue({...dashboard,recentActivities:[],overdueInvoices:0});await user.click(screen.getByRole('button',{name:'Tentar novamente'}));await screen.findByText('O movimento começa aqui')});

it('histórico do aluno apresenta evolução, detalhes e edição',async()=>{const user=userEvent.setup();view(<Routes><Route path="/alunos/:id" element={<StudentDetail/>}/></Routes>,'/alunos/1');await screen.findByRole('heading',{name:'Ana Teste'});expect(screen.getByRole('img',{name:/Evolução de Peso/})).toBeVisible();await user.selectOptions(screen.getByRole('combobox',{name:'Medida da evolução'}),'waistCm');expect(screen.getByRole('img',{name:/Evolução de Cintura/})).toBeVisible();await user.click(screen.getByRole('button',{name:'Editar cadastro'}));await screen.findByRole('heading',{name:'Editar aluno'});await user.click(screen.getByRole('button',{name:'Cancelar'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument()});
it('histórico sem avaliações apresenta orientação',async()=>{store.assessments=[];store.students[0].plan=null;store.students[0].active=false;view(<Routes><Route path="/alunos/:id" element={<StudentDetail/>}/></Routes>,'/alunos/1');await screen.findByText('Ainda sem medidas para comparar');expect(screen.getByText('Sem plano')).toBeVisible()});
it('histórico oferece recuperação quando o cadastro falha',async()=>{const user=userEvent.setup();const normal=api.request.getMockImplementation()!;api.request.mockImplementation(async path=>{if(path==='/students/1')throw new Error('Aluno indisponível');return normal(path)});view(<Routes><Route path="/alunos/:id" element={<StudentDetail/>}/></Routes>,'/alunos/1');await screen.findByText('Aluno indisponível');api.request.mockImplementation(normal);await user.click(screen.getByRole('button',{name:'Tentar novamente'}));await screen.findByRole('heading',{name:'Ana Teste'})});
