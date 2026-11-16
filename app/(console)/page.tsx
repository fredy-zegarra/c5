"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePoll } from "@/lib/client";
import { PRIORITIES, STATUS_LABEL, ago } from "@/lib/constants";
import MapView from "@/components/MapView";
import IncidentDetail from "@/components/IncidentDetail";
import NewIncident from "@/components/NewIncident";
import { Clock } from "@/components/Shell";

const FILTERS: Record<string, (i: any) => boolean> = {
  Activos: (i) => i.status !== "cerrado" && i.status !== "cancelado",
  "Sin despachar": (i) => i.status === "nuevo",
  "En atención": (i) => ["despachado", "en_camino", "en_sitio"].includes(i.status),
  Cerrados: (i) => i.status === "cerrado" || i.status === "cancelado",
};

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 880; g.gain.value = 0.08;
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.25);
  } catch {}
}

export default function Operaciones() {
  const { data, refresh, error } = usePoll<any>("/api/state", 4000);
  const [sel, setSel] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [pick, setPick] = useState<{ lat: number; lng: number } | null>(null);
  const [filter, setFilter] = useState("Activos");
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);

  const incidents: any[] = data?.incidents ?? [];
  const units: any[] = data?.units ?? [];
  const active = incidents.filter(FILTERS.Activos);
  const list = useMemo(
    () => incidents.filter(FILTERS[filter]).sort((a, b) => a.priority - b.priority || +new Date(b.created_at) - +new Date(a.created_at)),
    [incidents, filter]
  );
  const onMap = filter === "Cerrados" ? list : active;

  // Aviso sonoro cuando entra un incidente nuevo
  const seen = useRef<Set<number> | null>(null);
  useEffect(() => {
    if (!data) return;
    const ids = new Set<number>(incidents.map((i) => i.id));
    if (seen.current && incidents.some((i) => i.status === "nuevo" && !seen.current!.has(i.id))) beep();
    seen.current = ids;
  }, [data]); // eslint-disable-line

  function select(id: number) {
    setCreating(false);
    setPick(null);
    setSel(id);
    const i = incidents.find((x) => x.id === id);
    if (i) setFocus({ lat: i.lat, lng: i.lng });
  }

  const available = units.filter((u) => u.status === "disponible").length;
  const critical = active.filter((i) => i.priority === 1).length;
  const waiting = active.filter((i) => i.status === "nuevo").length;

  return (
    <>
      <div className="top">
        <h1>Operaciones</h1>
        <div className="kpis">
          <div className="kpi"><b>{active.length}</b><span>Activos</span></div>
          <div className={`kpi ${waiting ? "alert" : ""}`}><b>{waiting}</b><span>Sin despachar</span></div>
          <div className={`kpi ${critical ? "alert" : ""}`}><b>{critical}</b><span>Críticos</span></div>
          <div className="kpi"><b>{available}/{units.length}</b><span>Unidades libres</span></div>
        </div>
        <div className="right row">
          {error && <span className="badge nuevo">Sin conexión</span>}
          <Clock />
        </div>
      </div>
      <div className="ops">
        <div className="list">
          <div className="listhead">
            <button className="btn primary" style={{ width: "100%" }} onClick={() => { setSel(null); setCreating(true); }}>+ Nuevo incidente</button>
            <div className="chips">
              {Object.keys(FILTERS).map((k) => (
                <button key={k} className={`chip ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)}>{k}</button>
              ))}
            </div>
          </div>
          {!data && <div className="muted" style={{ padding: 12 }}>Cargando…</div>}
          {data && list.length === 0 && <div className="muted" style={{ padding: 12 }}>No hay incidentes en esta vista.</div>}
          {list.map((i) => (
            <div key={i.id} className={`inc p${i.priority} ${sel === i.id ? "sel" : ""}`} onClick={() => select(i.id)}>
              <div className="row">
                <span className="t grow">{i.type}</span>
                <span className={`badge ${i.status}`}>{STATUS_LABEL[i.status]}</span>
              </div>
              <div className="small muted">{i.address || "Sin dirección"}{i.district ? ` · ${i.district}` : ""}</div>
              <div className="row small">
                <span className={`pr p${i.priority}`}>{PRIORITIES[i.priority]}</span>
                <span className="muted mono">{i.code}</span>
                {i.unit_code && <span className="muted">· {i.unit_code}</span>}
                <span className="muted right">{ago(i.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mapwrap">
          <MapView incidents={onMap} units={units} cameras={data?.cameras} selectedId={sel} onSelectIncident={select}
            onPick={creating ? (lat, lng) => setPick({ lat, lng }) : undefined} pick={pick} focus={creating ? pick : focus} />
          <div className="legend">
            <span><i style={{ background: "#15803d" }} />PNP</span>
            <span><i style={{ background: "#1d4ed8" }} />Serenazgo</span>
            <span><i style={{ background: "#b91c1c" }} />Bomberos</span>
            <span><i style={{ background: "#0e7490" }} />SAMU</span>
            <span><i style={{ background: "#334155" }} />Cámara</span>
          </div>
        </div>
        <div className={`detail ${!creating && !sel ? "empty" : ""}`}>
          {creating ? (
            <NewIncident pick={pick} setPick={setPick} onCancel={() => { setCreating(false); setPick(null); }}
              onDone={(id) => { setCreating(false); refresh(); setSel(id); }} />
          ) : sel ? (
            <IncidentDetail key={sel} id={sel} units={units} onChange={refresh} onClose={() => setSel(null)} />
          ) : (
            <div className="col">
              <h2>Sin selección</h2>
              <div className="muted">Elige un incidente de la lista o del mapa, o registra uno nuevo.</div>
              <hr />
              <h2>Unidades</h2>
              {units.length === 0 && <div className="muted">Aún no hay unidades. Regístralas en el módulo Unidades.</div>}
              {units.map((u) => (
                <div key={u.id} className="row small">
                  <span className="mono">{u.code}</span>
                  <span className="muted grow">{u.kind}</span>
                  <span className={`badge ${u.status}`}>{u.status.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
