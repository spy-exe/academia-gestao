import { useState, useEffect, useRef } from "react";
import {
  useForm,
  useWatch,
  Controller,
  type FieldErrors,
} from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import { type Entity, type Page, request, mutate, ApiError } from "./api";
import { schemas, today, type Kind } from "./domain";
import { modules, type FieldSpec } from "./registry";
import { Button, Modal, Confirm, useFeedback } from "./ui";
export function ReferenceField({
  spec,
  value,
  onChange,
  id,
  invalid,
  describedBy,
}: {
  spec: FieldSpec;
  value: unknown;
  onChange: (value: string) => void;
  id: string;
  invalid: boolean;
  describedBy?: string;
}) {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [composing, setComposing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (composing) return;
    const timer = setTimeout(() => setQ(search), 300);
    return () => clearTimeout(timer);
  }, [search, composing]);
  const data = useQuery({
    queryKey: [spec.reference, "options", q],
    queryFn: ({ signal }) =>
      request<Page<Entity>>(
        `/${spec.reference}?size=50&active=true&q=${encodeURIComponent(q)}`,
        { signal },
      ),
  });
  const selected = useQuery({
    queryKey: [spec.reference, "selected", value],
    enabled: !!value,
    queryFn: ({ signal }) =>
      request<Entity>(`/${spec.reference}/${value}`, { signal }),
  });
  const options = [...(data.data?.content ?? [])];
  if (selected.data && !options.some((o) => o.id === selected.data.id))
    options.unshift(selected.data);
  return (
    <>
      <div className="ref-search search">
        <input
          ref={searchRef}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          aria-label={`Buscar ${spec.label.toLowerCase()}`}
          placeholder="Digite para buscar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search ? (
          <button
            type="button"
            className="icon-button"
            aria-label={`Limpar busca de ${spec.label.toLowerCase()}`}
            onClick={() => {
              setSearch("");
              setQ("");
              searchRef.current?.focus();
            }}
          >
            ×
          </button>
        ) : null}
      </div>
      <select
        id={id}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      >
        <option value="">Selecione…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
            {o.active === false ? " (inativo)" : ""}
          </option>
        ))}
      </select>
      {data.isError ? (
        <small className="error">
          Não foi possível carregar as opções.{" "}
          <button type="button" onClick={() => data.refetch()}>
            Tentar novamente
          </button>
        </small>
      ) : null}
      {data.isFetching ? <small role="status">Buscando opções…</small> : null}
    </>
  );
}
export function EntityForm({
  kind,
  item,
  open,
  onClose,
  studentId,
}: {
  kind: Kind;
  item?: Entity;
  open: boolean;
  onClose: () => void;
  studentId?: number;
}) {
  const spec = modules[kind];
  const cache = useQueryClient();
  const feedback = useFeedback();
  const [error, setError] = useState("");
  const [discard, setDiscard] = useState(false);
  const defaults: Record<string, unknown> = {
    ...spec.defaults,
    ...item,
    studentId:
      studentId ??
      (item?.student as Entity | undefined)?.id ??
      item?.studentId ??
      spec.defaults.studentId,
    teacherId: (item?.teacher as Entity | undefined)?.id ?? "",
    planId: (item?.plan as Entity | undefined)?.id ?? "",
    registration: item?.registration ?? spec.defaults.registration,
  };
  for (const key of ["enrollmentDate", "issuedOn", "assessedOn"])
    if (key in defaults && !defaults[key]) defaults[key] = today();
  for (const key of ["waistCm", "chestCm", "hipCm"])
    if (key in defaults && defaults[key] === null) defaults[key] = "";
  const form = useForm<Record<string, unknown>>({
    defaultValues: defaults,
    resolver: async (values) => {
      const parsed = schemas[kind].safeParse(values);
      if (parsed.success) return { values: parsed.data, errors: {} };
      const errors: FieldErrors<Record<string, unknown>> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        errors[path] = { type: "validation", message: issue.message };
      }
      return { values: {}, errors };
    },
  });
  const {
    register,
    handleSubmit,
    control,
    setError: fieldError,
    formState: { errors, isSubmitting, isDirty },
  } = form;
  const exercises = (useWatch({ control, name: "exercises" }) ?? []) as Record<
    string,
    unknown
  >[];
  const setExercises = (items: Record<string, unknown>[]) =>
    form.setValue("exercises", items, { shouldDirty: true });
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
  const close = () => {
    if (isSubmitting) return;
    if (isDirty) setDiscard(true);
    else onClose();
  };
  const save = handleSubmit(
    async (values) => {
      setError("");
      try {
        await mutate(
          `/${kind}${item ? `/${item.id}` : ""}`,
          item ? "PUT" : "POST",
          { ...values, ...(item ? { version: item.version } : {}) },
        );
        await cache.invalidateQueries();
        feedback(
          item
            ? "Alterações salvas."
            : `${spec.singular.charAt(0).toUpperCase() + spec.singular.slice(1)} ${kind === "invoices" || kind === "assessments" ? "registrada" : "cadastrado"}.`,
        );
        onClose();
      } catch (e) {
        if (e instanceof ApiError) {
          for (const [key, message] of Object.entries(e.fields))
            fieldError(key, { message });
        }
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível salvar. Tente novamente.",
        );
      }
    },
    (validation) => {
      const first = Object.keys(validation)[0];
      requestAnimationFrame(() =>
        document.getElementById(`field-${first}`)?.focus(),
      );
    },
  );
  return (
    <>
      <Modal
        open={open}
        onClose={close}
        title={item ? `Editar ${spec.singular}` : spec.action}
        description={
          kind === "invoices"
            ? "O valor será copiado do plano atual. Emitir a mesma competência não duplica a cobrança."
            : undefined
        }
      >
        <form noValidate onSubmit={save}>
          <div className="dialog-body">
            <div className="form-grid">
              {spec.fields.map((field) => {
                const id = `field-${field.name}`;
                const message = errors[field.name]?.message;
                const common = {
                  id,
                  "aria-invalid": !!message,
                  "aria-describedby": message ? `${id}-error` : undefined,
                };
                return (
                  <div
                    key={field.name}
                    className={`field ${field.full ? "full" : ""}`}
                  >
                    {field.type === "checkbox" ? (
                      <div className="checkbox-field">
                        <input
                          {...common}
                          type="checkbox"
                          {...register(field.name)}
                        />
                        <label htmlFor={id}>{field.label}</label>
                      </div>
                    ) : (
                      <>
                        <label htmlFor={id}>{field.label}</label>
                        {field.type === "reference" ? (
                          <Controller
                            name={field.name}
                            control={control}
                            render={({ field: f }) => (
                              <ReferenceField
                                spec={field}
                                id={id}
                                value={f.value}
                                onChange={f.onChange}
                                invalid={!!message}
                                describedBy={
                                  message ? `${id}-error` : undefined
                                }
                              />
                            )}
                          />
                        ) : field.type === "select" ? (
                          <select {...common} {...register(field.name)}>
                            {field.options?.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : field.type === "textarea" ? (
                          <textarea
                            className="resize-none"
                            {...common}
                            {...register(field.name)}
                            rows={3}
                          />
                        ) : (
                          <input
                            {...common}
                            type={field.type ?? "text"}
                            step={field.step}
                            {...register(field.name)}
                          />
                        )}
                      </>
                    )}
                    {message ? (
                      <small id={`${id}-error`} className="error">
                        {String(message)}
                      </small>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {kind === "workouts" ? (
              <div className="section-gap">
                <div className="exercise-head">
                  <h3>Exercícios</h3>
                  <Button
                    type="button"
                    tone="neutral"
                    onClick={() =>
                      setExercises([
                        ...exercises,
                        {
                          name: "",
                          sets: 3,
                          repetitions: "12",
                          loadKg: 0,
                          restSeconds: 60,
                          notes: "",
                        },
                      ])
                    }
                  >
                    <Plus size={15} />
                    Adicionar exercício
                  </Button>
                </div>
                {exercises.map((ex, index) => (
                  <div className="exercise" key={index}>
                    <div className="exercise-head">
                      <strong>Exercício {index + 1}</strong>
                      <div>
                        <button
                          className="icon-button"
                          type="button"
                          aria-label={`Subir exercício ${index + 1}`}
                          disabled={index === 0}
                          onClick={() => {
                            const next = [...exercises];
                            [next[index - 1], next[index]] = [
                              next[index],
                              next[index - 1],
                            ];
                            setExercises(next);
                          }}
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          className="icon-button"
                          type="button"
                          aria-label={`Descer exercício ${index + 1}`}
                          disabled={index === exercises.length - 1}
                          onClick={() => {
                            const next = [...exercises];
                            [next[index + 1], next[index]] = [
                              next[index],
                              next[index + 1],
                            ];
                            setExercises(next);
                          }}
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          className="icon-button error"
                          type="button"
                          aria-label={`Remover exercício ${index + 1}`}
                          onClick={() =>
                            setExercises(
                              exercises.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="exercise-grid">
                      {[
                        { name: "name", label: "Exercício", full: true },
                        { name: "sets", label: "Séries", type: "number" },
                        { name: "repetitions", label: "Repetições" },
                        { name: "loadKg", label: "Carga (kg)", type: "number" },
                        {
                          name: "restSeconds",
                          label: "Descanso (s)",
                          type: "number",
                        },
                        { name: "notes", label: "Observações", full: true },
                      ].map((f) => {
                        const key = `exercises.${index}.${f.name}`;
                        return (
                          <div key={key} className={f.full ? "full" : ""}>
                            <label htmlFor={`field-${key}`}>{f.label}</label>
                            <input
                              id={`field-${key}`}
                              type={f.type ?? "text"}
                              value={String(ex[f.name] ?? "")}
                              aria-invalid={!!errors[key]}
                              aria-describedby={
                                errors[key] ? `${key}-error` : undefined
                              }
                              onChange={(e) =>
                                setExercises(
                                  exercises.map((old, i) =>
                                    i === index
                                      ? { ...old, [f.name]: e.target.value }
                                      : old,
                                  ),
                                )
                              }
                            />
                            {errors[key] ? (
                              <small id={`${key}-error`} className="error">
                                {String(errors[key]?.message)}
                              </small>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {errors.exercises ? (
                  <p className="error" id="field-exercises" tabIndex={-1}>
                    {String(errors.exercises.message)}
                  </p>
                ) : null}
              </div>
            ) : null}
            {kind === "assessments" ? (
              <p className="muted section-gap">
                O IMC é calculado a partir do peso e altura. Esta ficha não
                fornece diagnóstico clínico.
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="form-error section-gap">
                {error}
              </p>
            ) : null}
          </div>
          <footer>
            <Button
              type="button"
              tone="neutral"
              onClick={close}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" busy={isSubmitting}>
              {item
                ? "Salvar alterações"
                : kind === "invoices"
                  ? "Gerar mensalidade"
                  : "Salvar cadastro"}
            </Button>
          </footer>
        </form>
      </Modal>
      <Confirm
        open={discard}
        title="Descartar alterações?"
        text="Os dados que ainda não foram salvos serão perdidos."
        label="Descartar"
        onClose={() => setDiscard(false)}
        onConfirm={() => {
          setDiscard(false);
          onClose();
        }}
      />
    </>
  );
}
