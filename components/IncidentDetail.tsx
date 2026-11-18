"use client";
import { useState } from "react";
import { api, usePoll } from "@/lib/client";
import { AGENCY_LABEL, PRIORITIES, STATUS_LABEL, ago, distKm, fmtDate, fmtTime } from "@/lib/constants";

const EVENT_LABEL: Record<string, string> = {
  creado: "Incidente registrado", despachado: "Unidad despachada", unidad_retirada: "Unidad retirada",
  en_camino: "Unidad en camino", en_sitio: "Unidad en el lugar", cerrado: "Incidente cerrado",
  cancelado: "Incidente cancelado", nuevo: "Devuelto a la cola", nota: "Nota", editado: "Datos editados",
};

/** En modo demostración el incidente y sus acciones vienen del navegador, no de la API. */
export type DemoSource = { incident: any | null; act: (body: any) => void };

export default function IncidentDetail({ id, units, onChange, onClose, demo }: {
  id: number; units?: any[]; onChange?: () => void; onClose?: () => void; demo?: DemoSource;
}) {
  const live = usePoll<any>(demo ? null : `/api/incidents/${id}`, 5000);
  const inc = demo ? demo.incident : live.data;
  const error = demo ? (demo.incident ? null : "Incidente no encontrado") : live.error;
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [unitId, setUnitId] = useState("");
  const [closing, setClosing] = useState<null | "cerrado" | "cancelado">(null);
  const [resolution, setResolution] = useState("");

  async function act(body: any) {
    setErr("");
    try {
      if (demo) demo.act(body);
      else {
        await api(`/api/incidents/${id}`, "PATCH", body);
        await live.refresh();
      }
      onChange?.();
      return true;
    } catch (e: any) {
      setErr(e.message);
      return false;
    }
  }

  if (!inc) return <div className="muted">{error || "Cargando…"}</div>;
  const open = inc.status !== "cerrado" && inc.status !== "cancelado";
  const candidates = (units ?? [])
    .filter((u) => u.status === "disponible" && u.id !== inc.unit_id)
    .map((u) => ({ ...u, km: u.lat != null ? distKm(u, inc) : null }))
    .sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9));

  return (
    <div className="col">
      <div className="row">
        <span className="mono">{inc.code}</span>
        <span className={`badge ${inc.status}`}>{STATUS_LABEL[inc.status]}</span>
        {onClose && <button className="btn sm right" onClick={onClose}>✕</button>}
      </div>
      <h1>{inc.type}</h1>
      <dl className="dl">
        <dt>Prioridad</dt><dd className={`pr p${inc.priority}`}>{PRIORITIES[inc.priority]}</dd>
        <dt>Registrado</dt><dd>{fmtDate(inc.created_at)} <span className="muted">· hace {ago(inc.created_at)}</span></dd>
        <dt>Dirección</dt><dd>{inc.address || "—"}</dd>
        <dt>Distrito</dt><dd>{inc.district || "—"}</dd>
        <dt>Coordenadas</dt><dd className="mono small">{inc.lat.toFixed(5)}, {inc.lng.toFixed(5)}</dd>
        <dt>Origen</dt><dd>{inc.source || "—"}</dd>
        <dt>Informante</dt><dd>{[inc.reporter_name, inc.reporter_phone].filter(Boolean).join(" · ") || "—"}</dd>
        <dt>Descripción</dt><dd>{inc.description || "—"}</dd>
        <dt>Unidad</dt><dd>{inc.unit_code ? `${inc.unit_code} (${AGENCY_LABEL[inc.unit_agency]})` : "Sin asignar"}</dd>
        {inc.resolution && (<><dt>Resolución</dt><dd>{inc.resolution}</dd></>)}
      </dl>

      {err && <div className="err">{err}</div>}

      {open && units && (
        <>
          <hr style={{ margin: "4px 0" }} />
          <h2>Despacho</h2>
          <div className="row">
            <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">{candidates.length ? "Elegir unidad disponible…" : "No hay unidades disponibles"}</option>
              {candidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code} · {AGENCY_LABEL[u.agency]}{u.km != null ? ` · ${u.km.toFixed(1)} km` : " · sin posición"}
                </option>
              ))}
            </select>
            <button className="btn primary" disabled={!unitId}
              onClick={async () => { if (await act({ action: "assign", unit_id: Number(unitId) })) setUnitId(""); }}>
              {inc.unit_id ? "Reasignar" : "Despachar"}
            </button>
          </div>
          <div className="row wrap">
            {inc.unit_id && inc.status === "despachado" && <button className="btn" onClick={() => act({ action: "status", status: "en_camino" })}>En camino</button>}
            {inc.unit_id && (inc.status === "despachado" || inc.status === "en_camino") && <button className="btn" onClick={() => act({ action: "status", status: "en_sitio" })}>En sitio</button>}
            {inc.unit_id && <button className="btn" onClick={() => act({ action: "assign", unit_id: null })}>Retirar unidad</button>}
            <button className="btn ok" onClick={() => setClosing("cerrado")}>Cerrar</button>
            <button className="btn danger" onClick={() => setClosing("cancelado")}>Cancelar</button>
          </div>
          {closing && (
            <div className="col card">
              <label>{closing === "cerrado" ? "¿Cómo se resolvió? (obligatorio)" : "Motivo de la cancelación"}</label>
              <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} autoFocus />
              <div className="row">
                <button className="btn primary"
                  onClick={async () => { if (await act({ action: "status", status: closing, resolution })) { setClosing(null); setResolution(""); } }}>
                  Confirmar
                </button>
                <button className="btn" onClick={() => setClosing(null)}>Volver</button>
              </div>
            </div>
          )}
        </>
      )}

      <hr style={{ margin: "4px 0" }} />
      <h2>Bitácora</h2>
      <div className="timeline">
        {inc.events.map((e: any) => (
          <div key={e.id}>
            <div className="when">{fmtTime(e.created_at)} · {e.user_name || "sistema"}</div>
            <div><b>{EVENT_LABEL[e.kind] ?? e.kind}</b>{e.note ? ` — ${e.note}` : ""}</div>
          </div>
        ))}
      </div>
      <div className="row">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Agregar nota a la bitácora…"
          onKeyDown={async (e) => { if (e.key === "Enter" && note.trim() && (await act({ action: "note", note }))) setNote(""); }} />
        <button className="btn" disabled={!note.trim()} onClick={async () => { if (await act({ action: "note", note })) setNote(""); }}>Anotar</button>
      </div>
      {demo && <div className="muted small">Emergencia simulada · Nada se envía a servicios reales.</div>}
    </div>
  );
}
