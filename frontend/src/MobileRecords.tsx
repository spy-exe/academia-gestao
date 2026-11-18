import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Entity } from "./api";
import { type Kind, labels } from "./domain";
import type { ModuleSpec } from "./registry";
import { Badge } from "./ui";
export function MobileRecords({
  items,
  kind,
  spec,
  renderCell,
  renderActions,
}: {
  items: Entity[];
  kind: Kind;
  spec: ModuleSpec;
  renderCell: (value: unknown, format?: string) => ReactNode;
  renderActions: (item: Entity, mobile: boolean) => ReactNode;
}) {
  return (
    <ul className="mobile-record-list" aria-label={spec.title}>
      {items.map((item) => {
        const name =
          item.name ?? (item.student as Entity)?.name ?? spec.singular;
        const status =
          kind === "invoices"
            ? labels[String(item.status)]
            : item.active === undefined
              ? undefined
              : item.active
                ? "Ativo"
                : "Arquivado";
        return (
          <li key={item.id} className="mobile-record">
            <div className="mobile-record-heading">
              <div className="mobile-record-person">
                <span className="person-icon" aria-hidden="true">
                  {name
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")}
                </span>
                <div>
                  {kind === "students" ? (
                    <Link
                      className="mobile-record-title"
                      to={`/alunos/${item.id}`}
                    >
                      {name}
                    </Link>
                  ) : (
                    <strong className="mobile-record-title">{name}</strong>
                  )}
                  {item.email ? (
                    <p className="mobile-record-email">{String(item.email)}</p>
                  ) : null}
                </div>
              </div>
              {status ? <Badge value={status} /> : null}
            </div>
            <dl className="mobile-record-values">
              {spec.columns
                .filter(
                  (column) =>
                    column.key !== spec.columns[0].key &&
                    !["active", "status"].includes(column.key),
                )
                .map((column) => (
                  <div
                    key={column.key}
                    data-field={column.key}
                    data-format={column.format}
                  >
                    <dt>{column.label}</dt>
                    <dd>{renderCell(item[column.key], column.format)}</dd>
                  </div>
                ))}
            </dl>
            {renderActions(item, true)}
          </li>
        );
      })}
    </ul>
  );
}
