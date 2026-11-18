import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { request, type Entity, type Page } from "./api";
import { date } from "./domain";
import { Badge, Loading, Failure, Button, Empty } from "./ui";
import { EntityForm } from "./EntityForm";
import { CollectionPage } from "./CollectionPage";
export function StudentDetail() {
  const { id } = useParams();
  const [editing, setEditing] = useState(false);
  const [measure, setMeasure] = useState("weightKg");
  const student = useQuery({
    queryKey: ["students", id],
    queryFn: ({ signal }) => request<Entity>(`/students/${id}`, { signal }),
  });
  const assessments = useQuery({
    queryKey: ["assessments", "evolution", id],
    queryFn: ({ signal }) =>
      request<Page<Entity>>(
        `/assessments?studentId=${id}&size=12&direction=desc`,
        { signal },
      ),
  });
  if (student.isPending) return <Loading />;
  if (student.isError)
    return <Failure error={student.error} retry={() => student.refetch()} />;
  const s = student.data;
  const points = [...(assessments.data?.content ?? [])]
    .reverse()
    .filter((a) => a[measure] != null);
  const values = points.map((a) => Number(a[measure]));
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const coordinates = values
    .map(
      (v, i) =>
        `${points.length === 1 ? 250 : 20 + (i * 460) / (points.length - 1)},${125 - ((v - min) / (max - min)) * 100}`,
    )
    .join(" ");
  const metricOptions = [
    { value: "weightKg", label: "Peso (kg)" },
    { value: "waistCm", label: "Cintura (cm)" },
    { value: "chestCm", label: "Tórax (cm)" },
    { value: "hipCm", label: "Quadril (cm)" },
    { value: "bmi", label: "IMC" },
  ];
  return (
    <>
      <Link className="back-link" to="/alunos">
        <ArrowLeft size={15} />
        Todos os alunos
      </Link>
      <div className="page-heading">
        <div>
          <h1>{s.name}</h1>
          <p>Cadastro e histórico de acompanhamento</p>
        </div>
        <Button tone="neutral" onClick={() => setEditing(true)}>
          <Pencil size={15} />
          Editar cadastro
        </Button>
      </div>
      <section className="panel">
        <dl className="detail-summary">
          <div>
            <dt>Status</dt>
            <dd>
              <Badge value={s.active ? "Ativo" : "Arquivado"} />
            </dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>{String(s.email)}</dd>
          </div>
          <div>
            <dt>Telefone</dt>
            <dd>{String(s.phone)}</dd>
          </div>
          <div>
            <dt>Nascimento</dt>
            <dd>{date(s.birthDate)}</dd>
          </div>
          <div>
            <dt>Matrícula</dt>
            <dd>{date(s.enrollmentDate)}</dd>
          </div>
          <div>
            <dt>Plano</dt>
            <dd>{(s.plan as Entity | undefined)?.name ?? "Sem plano"}</dd>
          </div>
        </dl>
      </section>
      <section className="panel section-gap">
        <div className="panel-heading">
          <div>
            <h2>Evolução de medidas</h2>
            <p>
              Até 12 avaliações mais recentes. Valores sem interpretação
              clínica.
            </p>
          </div>
          <select
            className="filter"
            aria-label="Medida da evolução"
            value={measure}
            onChange={(e) => setMeasure(e.target.value)}
          >
            {metricOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {assessments.isPending ? (
          <Loading />
        ) : assessments.isError ? (
          <Failure
            error={assessments.error}
            retry={() => assessments.refetch()}
          />
        ) : points.length ? (
          <div className="chart-wrap">
            <svg
              viewBox="0 0 500 150"
              role="img"
              aria-label={`Evolução de ${metricOptions.find((o) => o.value === measure)?.label}. Valores na tabela abaixo.`}
            >
              <line
                x1="20"
                y1="135"
                x2="480"
                y2="135"
                stroke="var(--color-border)"
              />
              <polyline
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2"
                points={coordinates}
              />
              {values.map((v, i) => (
                <circle
                  key={i}
                  cx={
                    points.length === 1
                      ? 250
                      : 20 + (i * 460) / (points.length - 1)
                  }
                  cy={125 - ((v - min) / (max - min)) * 100}
                  r="4"
                  fill="var(--color-primary)"
                />
              ))}
            </svg>
            <div className="table-scroll">
              <table>
                <caption className="sr-only">Valores da evolução</caption>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>
                      {metricOptions.find((o) => o.value === measure)?.label}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((a) => (
                    <tr key={a.id}>
                      <td>{date(a.assessedOn)}</td>
                      <td>
                        {Number(a[measure]).toLocaleString("pt-BR", {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <Empty
            title="Ainda sem medidas para comparar"
            text="Registre avaliações para acompanhar a evolução."
          />
        )}
      </section>
      <CollectionPage kind="invoices" studentId={s.id} compact />
      <CollectionPage kind="workouts" studentId={s.id} compact />
      <CollectionPage kind="assessments" studentId={s.id} compact />
      {editing ? (
        <EntityForm
          kind="students"
          item={s}
          open
          onClose={() => setEditing(false)}
        />
      ) : null}
    </>
  );
}
