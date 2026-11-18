import type { Kind } from "./domain";
export interface FieldSpec {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "tel"
    | "date"
    | "month"
    | "number"
    | "textarea"
    | "checkbox"
    | "select"
    | "reference";
  options?: { value: string; label: string }[];
  reference?: "students" | "plans" | "teachers";
  full?: boolean;
  step?: string;
}
export interface ModuleSpec {
  title: string;
  singular: string;
  description: string;
  path: string;
  action: string;
  fields: FieldSpec[];
  defaults: Record<string, unknown>;
  columns: {
    key: string;
    label: string;
    format?:
      "money" | "date" | "status" | "active" | "plan" | "student" | "teacher";
  }[];
}
const contact: FieldSpec[] = [
  { name: "name", label: "Nome completo", full: true },
  { name: "email", label: "E-mail", type: "email" },
  { name: "phone", label: "Telefone", type: "tel" },
];
export const modules: Record<Kind, ModuleSpec> = {
  plans: {
    title: "Planos",
    singular: "plano",
    path: "planos",
    description: "Planos claros para cada objetivo.",
    action: "Novo plano",
    defaults: {
      name: "",
      price: "",
      periodMonths: "1",
      benefits: "",
      active: true,
    },
    fields: [
      { name: "name", label: "Nome do plano", full: true },
      { name: "price", label: "Valor (R$)", type: "number", step: "0.01" },
      {
        name: "periodMonths",
        label: "Periodicidade",
        type: "select",
        options: [
          { value: "1", label: "Mensal" },
          { value: "3", label: "Trimestral" },
          { value: "6", label: "Semestral" },
          { value: "12", label: "Anual" },
        ],
      },
      { name: "benefits", label: "Benefícios", type: "textarea", full: true },
      { name: "active", label: "Plano ativo", type: "checkbox" },
    ],
    columns: [
      { key: "name", label: "Plano" },
      { key: "price", label: "Valor", format: "money" },
      { key: "periodMonths", label: "Período (meses)" },
      { key: "active", label: "Status", format: "active" },
    ],
  },
  students: {
    title: "Alunos",
    singular: "aluno",
    path: "alunos",
    description: "Cada aluno, uma trajetória para acompanhar.",
    action: "Novo aluno",
    defaults: {
      name: "",
      email: "",
      phone: "",
      birthDate: "",
      enrollmentDate: "",
      planId: "",
      active: true,
    },
    fields: [
      ...contact,
      { name: "birthDate", label: "Nascimento", type: "date" },
      { name: "enrollmentDate", label: "Matrícula", type: "date" },
      {
        name: "planId",
        label: "Plano",
        type: "reference",
        reference: "plans",
        full: true,
      },
      { name: "active", label: "Aluno ativo", type: "checkbox" },
    ],
    columns: [
      { key: "name", label: "Aluno" },
      { key: "phone", label: "Telefone" },
      { key: "plan", label: "Plano", format: "plan" },
      { key: "enrollmentDate", label: "Matrícula", format: "date" },
      { key: "active", label: "Status", format: "active" },
    ],
  },
  teachers: {
    title: "Professores",
    singular: "professor",
    path: "professores",
    description: "Quem orienta cada conquista.",
    action: "Novo professor",
    defaults: {
      name: "",
      email: "",
      phone: "",
      specialties: "",
      registration: "",
      active: true,
    },
    fields: [
      ...contact,
      { name: "registration", label: "Registro profissional (opcional)" },
      {
        name: "specialties",
        label: "Especialidades",
        type: "textarea",
        full: true,
      },
      { name: "active", label: "Professor ativo", type: "checkbox" },
    ],
    columns: [
      { key: "name", label: "Professor" },
      { key: "specialties", label: "Especialidades" },
      { key: "registration", label: "Registro" },
      { key: "active", label: "Status", format: "active" },
    ],
  },
  invoices: {
    title: "Mensalidades",
    singular: "mensalidade",
    path: "mensalidades",
    description: "Recebimentos e pendências, com tudo no lugar.",
    action: "Gerar mensalidade",
    defaults: { studentId: "", competence: "", dueDate: "" },
    fields: [
      {
        name: "studentId",
        label: "Aluno",
        type: "reference",
        reference: "students",
        full: true,
      },
      { name: "competence", label: "Competência", type: "month" },
      { name: "dueDate", label: "Vencimento", type: "date" },
    ],
    columns: [
      { key: "student", label: "Aluno", format: "student" },
      { key: "competence", label: "Competência" },
      { key: "amount", label: "Valor", format: "money" },
      { key: "dueDate", label: "Vencimento", format: "date" },
      { key: "status", label: "Situação", format: "status" },
    ],
  },
  workouts: {
    title: "Treinos",
    singular: "ficha de treino",
    path: "treinos",
    description: "Planejamento que acompanha a evolução.",
    action: "Nova ficha",
    defaults: {
      name: "",
      studentId: "",
      teacherId: "",
      issuedOn: "",
      notes: "",
      exercises: [],
    },
    fields: [
      { name: "name", label: "Nome da ficha", full: true },
      {
        name: "studentId",
        label: "Aluno",
        type: "reference",
        reference: "students",
      },
      {
        name: "teacherId",
        label: "Professor responsável",
        type: "reference",
        reference: "teachers",
      },
      { name: "issuedOn", label: "Data da ficha", type: "date" },
      { name: "notes", label: "Observações", type: "textarea", full: true },
    ],
    columns: [
      { key: "name", label: "Ficha" },
      { key: "student", label: "Aluno", format: "student" },
      { key: "teacher", label: "Professor", format: "teacher" },
      { key: "issuedOn", label: "Data", format: "date" },
      { key: "active", label: "Status", format: "active" },
    ],
  },
  assessments: {
    title: "Avaliações",
    singular: "avaliação",
    path: "avaliacoes",
    description: "Medidas para observar a evolução ao longo do tempo.",
    action: "Nova avaliação",
    defaults: {
      studentId: "",
      assessedOn: "",
      weightKg: "",
      heightCm: "",
      waistCm: "",
      chestCm: "",
      hipCm: "",
      notes: "",
    },
    fields: [
      {
        name: "studentId",
        label: "Aluno",
        type: "reference",
        reference: "students",
        full: true,
      },
      { name: "assessedOn", label: "Data da avaliação", type: "date" },
      { name: "weightKg", label: "Peso (kg)", type: "number", step: "0.01" },
      { name: "heightCm", label: "Altura (cm)", type: "number", step: "0.01" },
      {
        name: "waistCm",
        label: "Cintura (cm, opcional)",
        type: "number",
        step: "0.01",
      },
      {
        name: "chestCm",
        label: "Tórax (cm, opcional)",
        type: "number",
        step: "0.01",
      },
      {
        name: "hipCm",
        label: "Quadril (cm, opcional)",
        type: "number",
        step: "0.01",
      },
      { name: "notes", label: "Observações", type: "textarea", full: true },
    ],
    columns: [
      { key: "student", label: "Aluno", format: "student" },
      { key: "assessedOn", label: "Data", format: "date" },
      { key: "weightKg", label: "Peso (kg)" },
      { key: "heightCm", label: "Altura (cm)" },
      { key: "bmi", label: "IMC" },
    ],
  },
};
