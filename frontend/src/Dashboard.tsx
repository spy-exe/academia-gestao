import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  GraduationCap,
  Layers,
  Wallet,
  ArrowUpRight,
  UserPlus,
  ClipboardList,
  Ruler,
  Activity,
  Clock3,
} from "lucide-react";
import { request } from "./api";
import { money } from "./domain";
import { Loading, Failure, Empty } from "./ui";
interface DashboardData {
  activeStudents: number;
  activeTeachers: number;
  availablePlans: number;
  monthlyRevenue: number;
  pendingAmount: number;
  pendingInvoices: number;
  overdueInvoices: number;
  overdueAmount: number;
  recentActivities: {
    id: number;
    actor: string;
    description: string;
    occurredAt: string;
  }[];
}
export function Dashboard() {
  const data = useQuery({
    queryKey: ["dashboard"],
    queryFn: ({ signal }) => request<DashboardData>("/dashboard", { signal }),
  });
  if (data.isPending) return <Loading />;
  if (data.isError)
    return <Failure error={data.error} retry={() => data.refetch()} />;
  const d = data.data;
  const stats = [
    {
      label: "Alunos ativos",
      value: d.activeStudents,
      icon: Users,
      note: "Pessoas em movimento",
    },
    {
      label: "Professores ativos",
      value: d.activeTeachers,
      icon: GraduationCap,
      note: "Orientação a cada etapa",
    },
    {
      label: "Planos disponíveis",
      value: d.availablePlans,
      icon: Layers,
      note: "Opções para cada objetivo",
    },
    {
      label: "Receita no mês",
      value: money(d.monthlyRevenue),
      icon: Wallet,
      note: "Pagamentos registrados no mês",
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SUA ACADEMIA, EM PERSPECTIVA</p>
          <h1>Visão geral</h1>
          <p>Acompanhe o movimento. Cuide do próximo passo.</p>
        </div>
        <Link className="button neutral" to="/alunos">
          Ver alunos <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="metrics">
        {stats.map((s) => (
          <div className="metric" key={s.label}>
            <div>
              <span>{s.label}</span>
              <s.icon size={17} />
            </div>
            <strong>{s.value}</strong>
            <small>{s.note}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Um olhar para o financeiro</h2>
              <p>Valores reais das mensalidades emitidas</p>
            </div>
            <Link
              to="/mensalidades"
              className="icon-button"
              aria-label="Abrir mensalidades"
            >
              <ArrowUpRight size={19} />
            </Link>
          </div>
          <div className="finance-row">
            <div>
              <span className="activity-icon">
                <Wallet size={17} />
              </span>
              <div>
                <span>Valores pendentes</span>
                <small>
                  {d.pendingInvoices} mensalidades aguardando pagamento
                </small>
              </div>
            </div>
            <strong>{money(d.pendingAmount)}</strong>
          </div>
          <div className="finance-row">
            <div>
              <span className="activity-icon">
                <Clock3 size={17} />
              </span>
              <div>
                <span>Vencidas</span>
                <small>
                  {d.overdueInvoices} mensalidades após o vencimento
                </small>
              </div>
            </div>
            <strong className={d.overdueInvoices ? "error" : ""}>
              {money(d.overdueAmount)}
            </strong>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Próximo passo</h2>
              <p>Acesso rápido à rotina da recepção</p>
            </div>
          </div>
          <div className="quick-actions">
            {[
              { to: "/alunos?new=1", label: "Cadastrar aluno", icon: UserPlus },
              {
                to: "/mensalidades?new=1",
                label: "Gerar mensalidade",
                icon: Wallet,
              },
              {
                to: "/treinos?new=1",
                label: "Criar ficha",
                icon: ClipboardList,
              },
              { to: "/avaliacoes?new=1", label: "Nova avaliação", icon: Ruler },
            ].map((a) => (
              <Link key={a.to} to={a.to}>
                <a.icon size={17} />
                {a.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Atividades recentes</h2>
            <p>Os últimos registros da sua academia · horário de Brasília</p>
          </div>
          <Activity size={19} className="muted" />
        </div>
        {d.recentActivities.length ? (
          <ul className="activity-list">
            {d.recentActivities.map((a) => (
              <li key={a.id}>
                <div>
                  <span className="activity-icon">
                    <CheckIcon />
                  </span>
                  <div>
                    <strong>{a.description}</strong>
                    <br />
                    <small>{a.actor === "sistema" ? "Sistema" : a.actor}</small>
                  </div>
                </div>
                <small>
                  {new Intl.DateTimeFormat("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(a.occurredAt))}
                </small>
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            title="O movimento começa aqui"
            text="Cadastre alunos, organize planos e acompanhe as próximas atividades."
          />
        )}
      </section>
    </>
  );
}
function CheckIcon() {
  return <Activity size={15} />;
}
