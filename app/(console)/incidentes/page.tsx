"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { DISTRICTS, INCIDENT_STATUS, INCIDENT_TYPES, PRIORITIES, STATUS_LABEL, fmtDate } from "@/lib/constants";
import IncidentDetail from "@/components/IncidentDetail";
import { Modal } from "@/components/ui";

export default function Historial() {
  const [f, setF] = useState({ q: "", status: "", type: "", district: "", from: "", to: "" });
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  async function load() {
    setErr("");
    try {
      const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
      setRows(await api(`/api/incidents?${qs}`));
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  function csv() {
    const cols = ["code", "created_at", "type", "priority", "status", "district", "address", "lat", "lng", "source", "unit_code", "dispatched_at", "arrived_at", "closed_at", "resolution", "description"];
    const cell = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const text = [cols.join(","), ...(rows ?? []).map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
    a.download = `incidentes-c5-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <>
      <div className="top"><h1>Historial de incidentes</h1></div>
      <div className="page col">
        <form className="card row wrap" onSubmit={(e) => { e.preventDefault(); load(); }} style={{ alignItems: "flex-end" }}>
          <div className="field"><label>Buscar</label><input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Código, dirección, teléfono…" /></div>
          <div className="field"><label>Estado</label>
            <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Todos</option>{INCIDENT_STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></div>
          <div className="field"><label>Tipo</label>
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="">Todos</option>{INCIDENT_TYPES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="field"><label>Distrito</label>
            <select value={f.district} onChange={(e) => setF({ ...f, district: e.target.value })}><option value="">Todos</option>{DISTRICTS.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="field"><label>Desde</label><input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></div>
          <div className="field"><label>Hasta</label><input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></div>
          <button className="btn primary">Filtrar</button>
          <button type="button" className="btn" onClick={csv} disabled={!rows?.length}>Exportar CSV</button>
        </form>
        {err && <div className="err">{err}</div>}
        <div className="card tablewrap">
          <table>
            <thead><tr><th>Código</th><th>Fecha</th><th>Tipo</th><th>Prioridad</th><th>Estado</th><th>Distrito</th><th>Dirección</th><th>Unidad</th></tr></thead>
            <tbody>
              {(rows ?? []).map((r) => (
                <tr key={r.id} className="click" onClick={() => setOpen(r.id)}>
                  <td className="mono">{r.code}</td><td>{fmtDate(r.created_at)}</td><td>{r.type}</td>
                  <td className={`pr p${r.priority}`}>{PRIORITIES[r.priority]}</td>
                  <td><span className={`badge ${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                  <td>{r.district || "—"}</td><td>{r.address || "—"}</td><td>{r.unit_code || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows && rows.length === 0 && <div className="muted" style={{ padding: 12 }}>Sin resultados.</div>}
          {!rows && !err && <div className="muted" style={{ padding: 12 }}>Cargando…</div>}
        </div>
      </div>
      {open && <Modal title="Incidente" onClose={() => setOpen(null)}><IncidentDetail id={open} /></Modal>}
    </>
  );
}
