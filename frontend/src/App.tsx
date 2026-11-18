import { useState,useEffect,lazy,Suspense } from 'react';
import { createBrowserRouter,RouterProvider,Outlet,NavLink,useLocation,useNavigate } from 'react-router-dom';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { MotionConfig,motion } from 'motion/react';
import { Activity,LayoutDashboard,Users,Layers,Wallet,GraduationCap,ClipboardList,Ruler,LogOut,Menu,ChevronRight,CalendarDays } from 'lucide-react';
import { request,mutate } from './api';
import { modules } from './registry';
import type { Kind } from './domain';
const Login=lazy(()=>import('./Login').then(module=>({default:module.Login})));
import { Loading,Failure,Modal,Button,FeedbackProvider } from './ui';
const CollectionPage=lazy(()=>import('./CollectionPage').then(module=>({default:module.CollectionPage})));
const Dashboard=lazy(()=>import('./Dashboard').then(module=>({default:module.Dashboard})));
const StudentDetail=lazy(()=>import('./StudentDetail').then(module=>({default:module.StudentDetail})));
const links=[{to:'/',label:'Visão geral',icon:LayoutDashboard},{to:'/alunos',label:'Alunos',icon:Users},{to:'/planos',label:'Planos',icon:Layers},{to:'/mensalidades',label:'Mensalidades',icon:Wallet},{to:'/professores',label:'Professores',icon:GraduationCap},{to:'/treinos',label:'Treinos',icon:ClipboardList},{to:'/avaliacoes',label:'Avaliações',icon:Ruler}];
function Navigation({onNavigate}:{onNavigate?:()=>void}){return <nav aria-label="Navegação principal">{links.map(a=><NavLink key={a.to} to={a.to} end={a.to==='/'} onClick={onNavigate}><a.icon size={18}/>{a.label}</NavLink>)}</nav>}
function Shell(){
 const cache=useQueryClient();const location=useLocation();const navigate=useNavigate();const [mobile,setMobile]=useState(false);const [expired,setExpired]=useState(false);const [logoutError,setLogoutError]=useState('');
 const session=useQuery({queryKey:['session'],queryFn:()=>request<{email:string}>('/auth/me'),retry:false,staleTime:300000});
 useEffect(()=>{const handler=()=>setExpired(true);window.addEventListener('session-expired',handler);return()=>window.removeEventListener('session-expired',handler)},[]);
 const title=links.find(a=>a.to==='/'?location.pathname==='/':location.pathname.startsWith(a.to))?.label??'Página não encontrada';
 useEffect(()=>{document.title=`${title} · Cadência`},[title]);
 if(session.isPending)return <Loading/>;
 if(session.isError&&!('status' in session.error))return <Failure error={session.error} retry={()=>session.refetch()}/>;
 if(!session.data)return <Login onSuccess={()=>{cache.clear();session.refetch()}}/>;
 const logout=async()=>{try{await mutate('/auth/logout','POST');cache.clear();navigate('/');session.refetch()}catch(e){setLogoutError((e as Error).message)}};
 return <><a className="skip-link" href="#content">Pular para o conteúdo</a><aside className="sidebar"><div className="wordmark"><Activity size={25}/>cadência<span>GESTÃO DE ACADEMIA</span></div><div className="nav-section">GESTÃO</div><Navigation/><div className="sidebar-bottom"><div className="user-info"><span className="avatar">AD</span><div><strong>Administração</strong><small>Acesso administrativo</small></div></div><Button tone="ghost" onClick={logout}><LogOut size={17}/>Sair da conta</Button>{logoutError?<p role="alert" className="error">{logoutError}</p>:null}</div></aside><div className="workspace"><header className="topbar"><div><button className="icon-button mobile-menu" aria-label="Abrir menu" onClick={()=>setMobile(true)}><Menu size={20}/></button><span>Academia</span><ChevronRight size={12}/><b>{title}</b></div><div className="topbar-date"><CalendarDays size={15}/>{new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'numeric',month:'long',year:'numeric'}).format(new Date())}</div><span className="avatar" title="Administração">AD</span></header><main id="content" className="page"><motion.div key={location.pathname} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{duration:.18}}><Outlet/></motion.div></main></div><Modal open={mobile} title="Cadência" description="Navegue pela gestão da academia." onClose={()=>setMobile(false)}><div className="mobile-nav"><Navigation onNavigate={()=>setMobile(false)}/><Button tone="ghost" onClick={logout}><LogOut size={17}/>Sair da conta</Button></div></Modal><Modal open={expired} title="Entre novamente" description="Sua sessão expirou." onClose={()=>{}}><div className="dialog-body"><Login embedded onSuccess={()=>{setExpired(false);cache.invalidateQueries()}}/></div></Modal></>;
}
function NotFound(){return <div className="state"><h1>Página não encontrada</h1><p>Use a navegação para voltar à gestão da academia.</p><NavLink to="/">Voltar à visão geral</NavLink></div>}
const router=createBrowserRouter([{element:<Shell/>,errorElement:<NotFound/>,children:[{index:true,element:<Dashboard/>},...(Object.entries(modules) as [Kind,(typeof modules)[Kind]][]).map(([kind,spec])=>({path:spec.path,element:<CollectionPage key={kind} kind={kind}/>})),{path:'alunos/:id',element:<StudentDetail/>},{path:'*',element:<NotFound/>}]}]);
export function App(){return <MotionConfig reducedMotion="user"><FeedbackProvider><Suspense fallback={<Loading/>}><RouterProvider router={router}/></Suspense></FeedbackProvider></MotionConfig>}
