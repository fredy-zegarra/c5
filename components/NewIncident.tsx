"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { INCIDENT_TYPES, PRIORITIES, SOURCES } from "@/lib/constants";
import { AddressSearch, DistrictSelect } from "./ui";

type Pt = { lat: number; lng: number };

// Prioridad sugerida por tipo; el operador siempre puede cambiarla.
const DEFAULT_PRIORITY: Record<string, number> = {
  "Robo o hurto": 2, "Robo de vehículo": 2, "Violencia familiar": 1, "Riña o alteración del orden": 2,
  "Accidente de tránsito": 2, "Incendio": 1, "Emergencia médica": 1, "Persona o vehículo sospechoso": 3,
  "Consumo de alcohol o drogas en vía pública": 4, "Ruidos molestos": 4, "Persona desaparecida": 2,
  "Huaico, inundación o desastre": 1, "Otro": 3,
};

export default function NewIncident({ pick, setPick, onDone, onCancel, demoCreate }: {
  pick: Pt | null; setPick: (p: Pt | null) => void; onDone: (id: number) => void; onCancel: () => void;
  /** Modo demostración: registra el incidente en el navegador en lugar de la API. */
  demoCreate?: (values: Record<string, unknown>) => number;
}) {
  const demo = !!demoCreate;
  const [f, setF] = useState({
    type: INCIDENT_TYPES[0] as string, priority: 2, source: SOURCES[0] as string, description: "",
    address: "", district: null as string | null, reporter_name: "", reporter_phone: "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const fromSearch = useRef(false);

  // Al hacer clic en el mapa, completa dirección y distrito del punto.
  useEffect(() => {
    if (!pick || demo) return;
    if (fromSearch.current) { fromSearch.current = false; return; }
    let dead = false;
    api(`/api/geocode?lat=${pick.lat}&lng=${pick.lng}`)
      .then(([r]) => { if (!dead && r) setF((x) => ({ ...x, address: r.address || x.address, district: r.district ?? x.district })); })
      .catch(() => {});
    return () => { dead = true; };
  }, [pick, demo]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pick) return setErr("Ubica el incidente: busca la dirección o haz clic en el mapa.");
    setBusy(true);
    setErr("");
    try {
      if (demoCreate) {
        const id = demoCreate({ ...f, lat: pick.lat, lng: pick.lng });
        setPick(null);
        onDone(id);
        return;
      }
      const inc = await api("/api/incidents", "POST", { ...f, lat: pick.lat, lng: pick.lng });
      setPick(null);
      onDone(inc.id);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <form className="col" onSubmit={submit}>
      <div className="row"><h1>Nuevo incidente</h1><button type="button" className="btn sm right" onClick={onCancel}>✕</button></div>
      <div>
        <label>Tipo</label>
        <select value={f.type} onChange={(e) => set({ type: e.target.value, priority: DEFAULT_PRIORITY[e.target.value] ?? 3 })}>
          {INCIDENT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="row">
        <div className="field">
          <label>Prioridad</label>
          <select value={f.priority} onChange={(e) => set({ priority: Number(e.target.value) })}>
            {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Origen</label>
          <select value={f.source} onChange={(e) => set({ source: e.target.value })}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
      </div>
      {demo ? (
        <div><label>Dirección o referencia</label><input value={f.address} onChange={(e) => set({ address: e.target.value })} placeholder="Referencia simulada (opcional)" /></div>
      ) : (
        <AddressSearch value={f.address} onChange={(address) => set({ address })}
          onFound={(r) => { fromSearch.current = true; setPick({ lat: r.lat, lng: r.lng }); set({ district: r.district ?? f.district, address: f.address || r.address }); }} />
      )}
      <div className={pick ? "note" : "err"}>
        {pick ? `Punto fijado: ${pick.lat.toFixed(5)}, ${pick.lng.toFixed(5)}. Haz clic en el mapa para corregirlo.` : demo ? "Falta ubicar: haz clic en el mapa para fijar un punto simulado." : "Falta ubicar: haz clic en el mapa o busca la dirección."}
      </div>
      <div><label>Distrito</label><DistrictSelect value={f.district} onChange={(district) => set({ district })} /></div>
      <div><label>Descripción</label><textarea value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="Qué ocurre, cuántas personas, armas, vehículos…" /></div>
      <div className="row">
        <div className="field"><label>Informante</label><input value={f.reporter_name} onChange={(e) => set({ reporter_name: e.target.value })} /></div>
        <div className="field"><label>Teléfono</label><input value={f.reporter_phone} onChange={(e) => set({ reporter_phone: e.target.value })} inputMode="tel" /></div>
      </div>
      {err && <div className="err">{err}</div>}
      <button className="btn primary" disabled={busy}>{busy ? "Registrando…" : "Registrar incidente"}</button>
    </form>
  );
}
