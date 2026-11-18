"use client";
import { useState } from "react";
import { api } from "@/lib/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await api("/api/auth/login", "POST", { email, password });
      window.location.href = r.role === "unidad" ? "/unidad" : "/";
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="center">
      <form className="card login col" onSubmit={submit}>
        <div className="brand">
          <b>AREQUIPA <span>C5</span></b>
          <small>Centro de operaciones de seguridad ciudadana</small>
        </div>
        <div>
          <label htmlFor="email">Correo</label>
          <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="pass">Contraseña</label>
          <input id="pass" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <div className="err">{err}</div>}
        <button className="btn primary" disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</button>
        <div className="muted small">Acceso restringido a personal autorizado. Toda actividad queda registrada.</div>
        <a className="small" href="/" style={{ textDecoration: "underline" }}>Ver la demostración sin iniciar sesión</a>
      </form>
    </div>
  );
}
