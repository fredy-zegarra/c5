"use client";
import { useState } from "react";
import { usePoll } from "@/lib/client";
import { fmtDate } from "@/lib/constants";

export default function Auditoria() {
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const { data, error } = usePoll<any[]>(`/api/audit?q=${encodeURIComponent(applied)}`, 20000);
  return (
    <>
      <div className="top"><h1>Auditoría</h1></div>
      <div className="page col">
        <form className="row" onSubmit={(e) => { e.preventDefault(); setApplied(q); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por usuario, acción o código…" style={{ maxWidth: 360 }} />
          <button className="btn">Filtrar</button>
          <span className="muted small">Últimos 500 registros. Los registros no se pueden editar ni borrar desde la aplicación.</span>
        </form>
        {error && <div className="err">{error}</div>}
        <div className="card tablewrap">
          <table>
            <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Objeto</th><th>Detalle</th><th>IP</th></tr></thead>
            <tbody>
              {(data ?? []).map((r) => (
                <tr key={r.id}>
                  <td className="mono small">{fmtDate(r.created_at)}</td><td>{r.user_email || "—"}</td><td>{r.action}</td>
                  <td>{r.entity ? `${r.entity} ${r.entity_id ?? ""}` : "—"}</td>
                  <td className="mono small" style={{ maxWidth: 380, overflowWrap: "anywhere" }}>{r.detail || ""}</td>
                  <td className="mono small">{r.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
