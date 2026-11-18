import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { request, mutate, login, csrf, ApiError } from "../src/api";
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());
const response = (value: unknown, status = 200) =>
  new Response(value === undefined ? null : JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
it("lê JSON e respostas sem conteúdo", async () => {
  fetchMock
    .mockResolvedValueOnce(response({ name: "Ana" }))
    .mockResolvedValueOnce(response(undefined, 204));
  expect(await request("/students/1")).toEqual({ name: "Ana" });
  expect(await request("/empty")).toBeUndefined();
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/students/1",
    expect.objectContaining({ credentials: "same-origin" }),
  );
});
it("padroniza falhas e campos de validação", async () => {
  fetchMock.mockResolvedValueOnce(
    response(
      { detail: "Revise os campos", fields: { name: "Obrigatório" } },
      400,
    ),
  );
  await expect(request("/students")).rejects.toMatchObject({
    status: 400,
    fields: { name: "Obrigatório" },
  });
  fetchMock.mockResolvedValueOnce(response({}, 500));
  await expect(request("/students")).rejects.toThrow(
    "Não foi possível concluir",
  );
  fetchMock.mockResolvedValueOnce(new Response("invalid", { status: 500 }));
  await expect(request("/students")).rejects.toThrow(
    "O servidor não respondeu corretamente.",
  );
});
it("avisa sessão expirada sem repetir a falha de login", async () => {
  const handler = vi.fn();
  window.addEventListener("session-expired", handler);
  for (const status of [401, 403]) {
    fetchMock.mockResolvedValueOnce(response({ detail: "Sessão" }, status));
    await expect(request("/students")).rejects.toBeInstanceOf(ApiError);
  }
  fetchMock.mockResolvedValueOnce(response({}, 401));
  await expect(request("/auth/login")).rejects.toBeInstanceOf(ApiError);
  expect(handler).toHaveBeenCalledTimes(2);
  window.removeEventListener("session-expired", handler);
});
it("distingue cancelamento de falha de conexão", async () => {
  const abort = new DOMException("cancelled", "AbortError");
  fetchMock.mockRejectedValueOnce(abort);
  await expect(request("/students")).rejects.toBe(abort);
  fetchMock.mockRejectedValueOnce(new TypeError("network"));
  await expect(request("/students")).rejects.toThrow("Verifique sua conexão");
});
it("obtém token CSRF e envia dados protegidos", async () => {
  fetchMock
    .mockResolvedValueOnce(
      response({ token: "csrf-for-test", headerName: "X-CSRF-TOKEN" }),
    )
    .mockResolvedValueOnce(response({ id: 1 }))
    .mockResolvedValueOnce(response(undefined, 204));
  await csrf();
  await expect(mutate("/plans", "POST", { name: "Mensal" })).resolves.toEqual({
    id: 1,
  });
  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    "/api/plans",
    expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "X-CSRF-TOKEN": "csrf-for-test" }),
      body: '{"name":"Mensal"}',
    }),
  );
  await mutate("/auth/logout", "POST");
  expect(fetchMock.mock.calls[2][1].body).toBeUndefined();
});
it("login troca o token após renovar a sessão", async () => {
  fetchMock
    .mockResolvedValueOnce(
      response({ token: "before", headerName: "X-CSRF-TOKEN" }),
    )
    .mockResolvedValueOnce(response({ authenticated: true }))
    .mockResolvedValueOnce(
      response({ token: "after", headerName: "X-CSRF-TOKEN" }),
    );
  await login("a@example.test", "test-only-password");
  expect(fetchMock.mock.calls[1][1].body.toString()).toContain(
    "email=a%40example.test",
  );
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
