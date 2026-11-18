import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { login } from "./api";
import { Button } from "./ui";
const schema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});
export function Login({
  onSuccess,
  embedded = false,
}: {
  onSuccess: () => void;
  embedded?: boolean;
}) {
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const submit = handleSubmit(async (v) => {
    setError("");
    try {
      await login(v.email, v.password);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar.");
    }
  });
  return (
    <div className={embedded ? "reauth" : "login-page"}>
      {!embedded ? (
        <aside className="login-art">
          <div className="wordmark">
            <Activity />
            cadência<span>GESTÃO DE ACADEMIA</span>
          </div>
          <div>
            <p className="eyebrow">FOCO NO QUE MOVE SUA ACADEMIA</p>
            <h1>
              Uma rotina
              <br />
              mais leve.
              <br />
              <span>
                Uma gestão
                <br />
                mais forte.
              </span>
            </h1>
            <div className="rhythm" aria-hidden="true">
              {Array.from({ length: 14 }, (_, i) => (
                <i key={i} style={{ height: `${30 + (i % 5) * 18}px` }} />
              ))}
            </div>
          </div>
          <p>Organização para acompanhar cada evolução.</p>
        </aside>
      ) : null}
      <main className="login-main">
        <div className="login-form">
          <div className="login-mark">
            <Activity size={25} />
          </div>
          <p className="eyebrow">ÁREA ADMINISTRATIVA</p>
          <h2>{embedded ? "Sua sessão expirou" : "Bem-vindo de volta"}</h2>
          <p>
            {embedded
              ? "Entre novamente para continuar. Seus dados do formulário estão preservados nesta página."
              : "Entre para acompanhar o ritmo da sua academia."}
          </p>
          <form noValidate onSubmit={submit}>
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              autoComplete="username"
              type="email"
              {...register("email")}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email ? (
              <small id="email-error" className="error">
                {errors.email.message}
              </small>
            ) : null}
            <label htmlFor="password">Senha</label>
            <div className="password-field">
              <input
                id="password"
                autoComplete="current-password"
                type={visible ? "text" : "password"}
                {...register("password")}
                aria-invalid={!!errors.password}
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
              />
              <button
                type="button"
                className="icon-button"
                aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={visible}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password ? (
              <small id="password-error" className="error">
                {errors.password.message}
              </small>
            ) : null}
            {error ? (
              <p role="alert" className="form-error">
                {error}
              </p>
            ) : null}
            <Button type="submit" busy={isSubmitting}>
              Entrar na academia <ArrowRight size={17} />
            </Button>
          </form>
          <p className="login-security">
            <ShieldCheck size={16} /> Acesso restrito à administração
          </p>
        </div>
        <small className="login-foot">Cadência · Gestão de academia</small>
      </main>
    </div>
  );
}
