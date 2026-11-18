import { describe, it, expect } from "vitest";
import { schemas, money, date } from "../src/domain";
describe("dados administrativos", () => {
  it("rejeita plano com valor negativo e periodicidade inválida", () => {
    expect(
      schemas.plans.safeParse({
        name: "Plano",
        price: -1,
        periodMonths: 2,
        benefits: "",
        active: true,
      }).success,
    ).toBe(false);
  });
  it("aceita plano e preserva centavos", () => {
    expect(
      schemas.plans.parse({
        name: "Mensal",
        price: "149.90",
        periodMonths: "1",
        benefits: "Acesso",
        active: true,
      }).price,
    ).toBe(149.9);
  });
  it("valida nascimento e contato do aluno", () => {
    expect(
      schemas.students.safeParse({
        name: "Ana",
        email: "x",
        phone: "123",
        birthDate: "2099-01-01",
        enrollmentDate: "2025-01-01",
        planId: "",
        active: true,
      }).success,
    ).toBe(false);
  });
  it("formata dinheiro e data civil no Brasil", () => {
    expect(money(149.9)).toContain("149,90");
    expect(date("2026-01-10")).toBe("10/01/2026");
  });
});
import { today, invoiceStatus } from "../src/domain";
it("calcula situação pelo vencimento e pelo pagamento", () => {
  expect(
    invoiceStatus({ paidOn: null, dueDate: "2026-01-10" }, "2026-01-10"),
  ).toBe("OPEN");
  expect(
    invoiceStatus({ paidOn: null, dueDate: "2026-01-10" }, "2026-01-11"),
  ).toBe("OVERDUE");
  expect(
    invoiceStatus(
      { paidOn: "2026-01-01", dueDate: "2026-01-10" },
      "2026-01-11",
    ),
  ).toBe("PAID");
  expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(date(null)).toBe("—");
});
it("valida medidas opcionais, exercícios e periodicidade", () => {
  const assessment = {
    studentId: 1,
    assessedOn: "2026-01-01",
    weightKg: "80",
    heightCm: "180",
    waistCm: "",
    chestCm: null,
    hipCm: "98",
    notes: "",
  };
  expect(schemas.assessments.parse(assessment)).toMatchObject({
    waistCm: null,
    chestCm: null,
    hipCm: 98,
  });
  expect(
    schemas.assessments.safeParse({ ...assessment, assessedOn: "2026-02-30" })
      .success,
  ).toBe(false);
  expect(
    schemas.assessments.safeParse({ ...assessment, heightCm: 0 }).success,
  ).toBe(false);
  expect(
    schemas.plans.safeParse({
      name: "Teste",
      price: 1.111,
      periodMonths: 1,
      benefits: "",
      active: true,
    }).success,
  ).toBe(false);
  expect(
    schemas.teachers.safeParse({
      name: "Rafael",
      email: "r@example.test",
      phone: "11999999999",
      specialties: "Força",
      registration: "",
      active: true,
    }).success,
  ).toBe(true);
  expect(
    schemas.invoices.safeParse({
      studentId: 1,
      competence: "2026-01",
      dueDate: "2026-01-15",
    }).success,
  ).toBe(true);
  expect(
    schemas.workouts.safeParse({
      name: "Ficha",
      studentId: 1,
      teacherId: 2,
      issuedOn: "2026-01-01",
      notes: "",
      exercises: [],
    }).success,
  ).toBe(false);
  expect(
    schemas.students.safeParse({
      name: "Ana",
      email: "a@example.test",
      phone: "11999999999",
      birthDate: "2000-01-01",
      enrollmentDate: "2026-01-01",
      planId: "",
      active: true,
    }).success,
  ).toBe(true);
});
