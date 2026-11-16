"use client";
import { useMemo, useState } from "react";
import { usePoll } from "@/lib/client";
import { PRIORITIES, fmtDur } from "@/lib/constants";
import MapView from "@/components/MapView";

function Bars({ rows, label }: { rows: { k: any; n: number }[]; label?: (k: any) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  if (!rows.length) return <div className="muted">Sin datos en el periodo.</div>;
  return (
    <div className="bars">
      {rows.map((r) => (
        <div className="bar" key={r.k}>
          <span title={String(r.k)} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label ? label(r.k) : r.k}</span>
          <div><i style={{ width: `${(r.n / max) * 100}%` }} /></div>
          <b>{r.n}</b>
        </div>
      ))}
    </div>
  );
}

export default function Estadisticas() {
  const [days, setDays] = useState(30);
  const { data } = usePoll<any>(`/api/stats?days=${days}`, 30000);
  const heat = useMemo(
    () => (data?.points ?? []).map((p: any) => [p.lat, p.lng, (5 - p.priority) / 4] as [number, number, number]),
    [data]
  );
  const hours = useMemo(() => {
    const h = Array(24).fill(0);
    for (const r of data?.byHour ?? []) h[r.k] = r.n;
    return h as number[];
  }, [data]);
  const maxH = Math.max(1, ...hours);
  const t = data?.totals;

  return (
    <>
      <div className="top">
        <h1>Estadísticas</h1>
        <div className="right row">
          <span className="muted small">Periodo</span>
          <select style={{ width: "auto" }} value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={1}>Últimas 24 h</option><option value={7}>7 días</option><option value={30}>30 días</option>
            <option value={90}>90 días</option><option value={365}>1 año</option>
          </select>
        </div>
      </div>
      <div className="page">
        <div className="note" style={{ marginBottom: 14 }}>
          Cifras calculadas solo con los incidentes registrados en este sistema. No son estadísticas oficiales de la PNP, el INEI ni el Ministerio Público.
        </div>
        {!data ? <div className="muted">Cargando…</div> : (
          <>
            <div className="kpibig">
              <div className="card"><b>{t.total}</b><span className="muted small">Incidentes</span></div>
              <div className="card"><b>{t.abiertos}</b><span className="muted small">Abiertos</span></div>
              <div className="card"><b>{t.cerrados}</b><span className="muted small">Cerrados</span></div>
              <div className="card"><b>{fmtDur(t.t_despacho)}</b><span className="muted small">Tiempo medio hasta el despacho</span></div>
              <div className="card"><b>{fmtDur(t.t_llegada)}</b><span className="muted small">Tiempo medio hasta la llegada</span></div>
              <div className="card"><b>{fmtDur(t.t_cierre)}</b><span className="muted small">Tiempo medio hasta el cierre</span></div>
            </div>
            <div className="grid2">
              <div className="card"><h2>Por tipo</h2><Bars rows={data.byType} /></div>
              <div className="card"><h2>Por distrito</h2><Bars rows={data.byDistrict} /></div>
              <div className="card">
                <h2>Por hora del día</h2>
                <div className="hours">{hours.map((n, i) => <div key={i} title={`${i}:00 — ${n}`} style={{ height: `${(n / maxH) * 100}%` }} />)}</div>
                <div className="hourlab">{hours.map((_, i) => <span key={i}>{i % 3 === 0 ? i : ""}</span>)}</div>
              </div>
              <div className="card"><h2>Por prioridad</h2><Bars rows={data.byPriority} label={(k) => `${k} · ${PRIORITIES[k]}`} /></div>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Mapa de calor de incidentes</h2>
              <div style={{ height: 460 }}><MapView heat={heat} zoom={12} /></div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
