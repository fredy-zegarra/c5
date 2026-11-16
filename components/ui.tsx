"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { DISTRICTS } from "@/lib/constants";
import MapView from "./MapView";

export type Me = { id: number; email: string; name: string; role: string; unit_id: number | null };
export const MeCtx = createContext<Me>(null as unknown as Me);
export const useMe = () => useContext(MeCtx);
export const isManager = (me: Me) => me.role === "admin" || me.role === "supervisor";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={title}>
        <div className="row" style={{ marginBottom: 12 }}>
          <h1>{title}</h1>
          <button className="btn sm right" onClick={onClose}>Cerrar</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DistrictSelect({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">— Sin distrito —</option>
      {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
    </select>
  );
}

export type Loc = { lat: number | null; lng: number | null; address: string; district: string | null };

/** Buscador de dirección; devuelve punto, dirección y distrito. */
export function AddressSearch({ value, onChange, onFound }: { value: string; onChange: (v: string) => void; onFound: (r: any) => void }) {
  const [res, setRes] = useState<any[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function search() {
    if (!value.trim()) return;
    setBusy(true);
    setErr("");
    setRes(null);
    try {
      const r = await api(`/api/geocode?q=${encodeURIComponent(value)}`);
      if (r.length === 1) onFound(r[0]);
      else if (r.length === 0) setErr("Sin resultados. Ubica el punto haciendo clic en el mapa.");
      else setRes(r);
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }
  return (
    <div>
      <label>Dirección o referencia</label>
      <div className="row">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Ej. Av. Ejército 710, Cayma"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }} />
        <button type="button" className="btn" onClick={search} disabled={busy}>{busy ? "…" : "Buscar"}</button>
      </div>
      {err && <div className="muted small" style={{ marginTop: 4 }}>{err}</div>}
      {res && (
        <div className="col" style={{ gap: 4, marginTop: 6 }}>
          {res.map((r, i) => (
            <button type="button" key={i} className="btn sm" style={{ textAlign: "left", whiteSpace: "normal" }}
              onClick={() => { onFound(r); setRes(null); }}>{r.full}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Campo de ubicación con mini mapa (cámaras y posición manual de unidades). */
export function LocationField({ value, onChange }: { value: Loc; onChange: (v: Loc) => void }) {
  const pt = value.lat != null && value.lng != null ? { lat: value.lat, lng: value.lng } : null;
  async function pick(lat: number, lng: number) {
    onChange({ ...value, lat, lng });
    try {
      const [r] = await api(`/api/geocode?lat=${lat}&lng=${lng}`);
      if (r) onChange({ lat, lng, address: value.address || r.address, district: r.district ?? value.district });
    } catch {}
  }
  return (
    <div className="col">
      <AddressSearch value={value.address} onChange={(address) => onChange({ ...value, address })}
        onFound={(r) => onChange({ lat: r.lat, lng: r.lng, address: value.address || r.address, district: r.district ?? value.district })} />
      <div style={{ height: 240 }}><MapView onPick={pick} pick={pt} focus={pt} /></div>
      <div className="muted small">{pt ? `Punto: ${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)}` : "Haz clic en el mapa para fijar el punto."}</div>
      <div>
        <label>Distrito</label>
        <DistrictSelect value={value.district} onChange={(district) => onChange({ ...value, district })} />
      </div>
    </div>
  );
}
