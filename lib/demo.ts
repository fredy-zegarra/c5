import { useCallback, useEffect, useRef, useState } from "react";
import { BOUNDS, CENTER } from "@/lib/constants";

// Modo demostración: todo vive en el navegador (localStorage). Nada llega a la base ni a servicios reales.

const STORAGE_KEY = "arequipa-c5-demo-state";
const VERSION = 2;
const DEMO_USER = "Operador demo";
const TICK_MS = 5000;

export type DemoState = { v: number; savedAt: number; units: any[]; cameras: any[]; incidents: any[] };

const iso = (ms: number) => new Date(ms).toISOString();

function seed(): DemoState {
  const now = Date.now();
  const ago = (min: number) => iso(now - min * 60_000);
  const ev = (n: number, min: number, kind: string, note: string | null = null) =>
    ({ id: n, created_at: ago(min), user_name: DEMO_USER, kind, note });
  const base = { reporter_name: null, reporter_phone: null, unit_id: null, unit_code: null, unit_agency: null,
    dispatched_at: null, arrived_at: null, closed_at: null, resolution: null };
  return {
    v: VERSION,
    savedAt: now,
    units: [
      { id: -1, code: "SIM-PNP-01", agency: "PNP", kind: "Patrullero", status: "disponible", lat: -16.3918, lng: -71.5352, position_at: ago(0) },
      { id: -2, code: "SIM-SER-01", agency: "SERENAZGO", kind: "Motocicleta", status: "disponible", lat: -16.4051, lng: -71.5261, position_at: ago(0) },
      { id: -3, code: "SIM-BOM-01", agency: "BOMBEROS", kind: "Bomba", status: "asignada", lat: -16.3952, lng: -71.5446, position_at: ago(0) },
      { id: -4, code: "SIM-SAMU-01", agency: "SAMU", kind: "Ambulancia", status: "en_camino", lat: -16.3862, lng: -71.548, position_at: ago(0) },
      { id: -5, code: "SIM-PNP-02", agency: "PNP", kind: "Patrullero", status: "disponible", lat: -16.3705, lng: -71.5612, position_at: ago(0) },
      { id: -6, code: "SIM-SER-02", agency: "SERENAZGO", kind: "A pie", status: "disponible", lat: -16.4238, lng: -71.5065, position_at: ago(0) },
    ],
    cameras: [
      { id: -1, name: "Cámara simulada · Plaza de Armas", lat: CENTER.lat, lng: CENTER.lng },
      { id: -2, name: "Cámara simulada · Yanahuara", lat: -16.389, lng: -71.537 },
    ],
    incidents: [
      { ...base, id: -1, code: "SIM-001", type: "Accidente de tránsito", priority: 2, status: "nuevo", source: "Cámara",
        description: "Colisión simulada; verificar la zona y apoyar el tránsito.", address: "Av. Ejército, referencia simulada",
        district: "Cayma", lat: -16.3896, lng: -71.5461, created_at: ago(5),
        events: [ev(1, 5, "creado", "Registrado por cámara")] },
      { ...base, id: -2, code: "SIM-002", type: "Emergencia médica", priority: 1, status: "en_camino", source: "Llamada telefónica",
        description: "Solicitud de asistencia médica de prueba.", address: "Plaza de Armas, referencia simulada",
        district: "Arequipa (Cercado)", lat: CENTER.lat, lng: CENTER.lng, created_at: ago(12),
        unit_id: -4, unit_code: "SIM-SAMU-01", unit_agency: "SAMU", dispatched_at: ago(10),
        events: [ev(1, 12, "creado", "Registrado por llamada telefónica"), ev(2, 10, "despachado", "Unidad SIM-SAMU-01"), ev(3, 9, "en_camino")] },
      { ...base, id: -3, code: "SIM-003", type: "Incendio", priority: 1, status: "despachado", source: "Cámara",
        description: "Alerta de humo simulada para demostración.", address: "Calle San Juan de Dios, referencia simulada",
        district: "Arequipa (Cercado)", lat: -16.4013, lng: -71.5382, created_at: ago(19),
        unit_id: -3, unit_code: "SIM-BOM-01", unit_agency: "BOMBEROS", dispatched_at: ago(17),
        events: [ev(1, 19, "creado", "Registrado por cámara"), ev(2, 17, "despachado", "Unidad SIM-BOM-01")] },
      { ...base, id: -4, code: "SIM-004", type: "Robo o hurto", priority: 3, status: "cerrado", source: "Presencial",
        description: "Caso ficticio de demostración, sin intervención real.", address: "Parque Selva Alegre, referencia simulada",
        district: "Alto Selva Alegre", lat: -16.3857, lng: -71.5201, created_at: ago(75), closed_at: ago(40),
        resolution: "Caso simulado: se orientó al denunciante.",
        events: [ev(1, 75, "creado", "Registrado por presencial"), ev(2, 40, "cerrado", "Caso simulado: se orientó al denunciante.")] },
    ],
  };
}

const shiftIso = (v: string | null | undefined, ms: number) => (v ? iso(new Date(v).getTime() + ms) : v ?? null);

/** El tiempo de la simulación se pausa al cerrar la página: al volver, todo conserva la antigüedad que tenía. */
function resume(s: DemoState): DemoState {
  const ms = Date.now() - s.savedAt;
  if (!(ms > 0)) return s;
  return {
    ...s,
    savedAt: Date.now(),
    units: s.units.map((u) => ({ ...u, position_at: shiftIso(u.position_at, ms) })),
    incidents: s.incidents.map((i) => ({
      ...i,
      created_at: shiftIso(i.created_at, ms),
      dispatched_at: shiftIso(i.dispatched_at, ms),
      arrived_at: shiftIso(i.arrived_at, ms),
      closed_at: shiftIso(i.closed_at, ms),
      events: i.events.map((e: any) => ({ ...e, created_at: shiftIso(e.created_at, ms) })),
    })),
  };
}

function read(): DemoState {
  let stored: any = null;
  try {
    stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
  } catch {}
  if (!stored || stored.v !== VERSION || !Array.isArray(stored.incidents) || !Array.isArray(stored.units)) return seed();
  return resume(stored);
}

function write(s: DemoState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, savedAt: Date.now() }));
}

function addEvent(inc: any, kind: string, note: string | null = null) {
  const id = inc.events.reduce((m: number, e: any) => Math.max(m, e.id), 0) + 1;
  inc.events = [...inc.events, { id, created_at: iso(Date.now()), user_name: DEMO_USER, kind, note }];
}

/** Libera una unidad si ya no tiene incidentes activos (igual que el servidor). */
function freeUnit(s: DemoState, unitId: number | null) {
  const u = s.units.find((x) => x.id === unitId);
  if (!u || u.status === "fuera_servicio") return;
  const busy = s.incidents.some((i) => i.unit_id === unitId && ["despachado", "en_camino", "en_sitio"].includes(i.status));
  if (!busy) u.status = "disponible";
}

export function createIncident(prev: DemoState, values: Record<string, any>) {
  const { lat, lng } = values;
  if (!(lat >= BOUNDS.latMin && lat <= BOUNDS.latMax && lng >= BOUNDS.lngMin && lng <= BOUNDS.lngMax)) {
    throw new Error("El punto está fuera de la región de Arequipa. Elige otro en el mapa.");
  }
  const s = structuredClone(prev);
  const id = Math.min(0, ...s.incidents.map((i) => i.id)) - 1;
  const seq = s.incidents.reduce((m, i) => Math.max(m, Number(/^SIM-(\d+)$/.exec(i.code)?.[1] ?? 0)), 0) + 1;
  const inc: any = {
    type: values.type, priority: values.priority, source: values.source,
    description: values.description ?? "", address: values.address ?? "", district: values.district ?? null,
    reporter_name: values.reporter_name || null, reporter_phone: values.reporter_phone || null, lat, lng,
    id, code: `SIM-${String(seq).padStart(3, "0")}`, status: "nuevo", created_at: iso(Date.now()),
    unit_id: null, unit_code: null, unit_agency: null, dispatched_at: null, arrived_at: null, closed_at: null, resolution: null,
    events: [],
  };
  addEvent(inc, "creado", `Registrado por ${String(values.source).toLowerCase()}`);
  s.incidents.unshift(inc);
  return { state: s, id };
}

/** Mismas acciones y reglas que PATCH /api/incidents/[id]. */
export function applyAction(prev: DemoState, id: number, b: any): DemoState {
  const s = structuredClone(prev);
  const inc = s.incidents.find((i) => i.id === id);
  if (!inc) throw new Error("Incidente no encontrado");
  const closed = inc.status === "cerrado" || inc.status === "cancelado";
  const now = iso(Date.now());

  if (b.action === "note") {
    if (!String(b.note ?? "").trim()) throw new Error("Escribe la nota");
    addEvent(inc, "nota", b.note);
  } else if (b.action === "assign") {
    if (closed) throw new Error("El incidente ya está cerrado");
    const prevUnit = inc.unit_id;
    if (b.unit_id == null) {
      Object.assign(inc, { unit_id: null, unit_code: null, unit_agency: null, status: "nuevo" });
      freeUnit(s, prevUnit);
      addEvent(inc, "unidad_retirada", prevUnit != null ? s.units.find((u) => u.id === prevUnit)?.code ?? null : null);
    } else {
      const unit = s.units.find((u) => u.id === b.unit_id);
      if (!unit) throw new Error("Unidad no encontrada");
      if (unit.status === "fuera_servicio") throw new Error("La unidad está fuera de servicio");
      Object.assign(inc, { unit_id: unit.id, unit_code: unit.code, unit_agency: unit.agency, status: "despachado",
        dispatched_at: inc.dispatched_at ?? now, arrived_at: null });
      unit.status = "asignada";
      if (prevUnit && prevUnit !== unit.id) freeUnit(s, prevUnit);
      addEvent(inc, "despachado", `Unidad ${unit.code}`);
    }
  } else if (b.action === "status") {
    if (closed) throw new Error("El incidente ya está cerrado");
    if ((b.status === "en_camino" || b.status === "en_sitio") && !inc.unit_id) throw new Error("Primero asigna una unidad");
    const resolution = String(b.resolution ?? "").trim() || null;
    if (b.status === "cerrado" && !resolution) throw new Error("Indica cómo se resolvió el incidente");
    const unit = s.units.find((u) => u.id === inc.unit_id);
    if (b.status === "en_camino") {
      inc.status = "en_camino";
      if (unit) unit.status = "en_camino";
    } else if (b.status === "en_sitio") {
      inc.status = "en_sitio";
      inc.arrived_at = inc.arrived_at ?? now;
      if (unit) Object.assign(unit, { status: "en_sitio", lat: inc.lat, lng: inc.lng, position_at: now });
    } else if (b.status === "cerrado" || b.status === "cancelado") {
      Object.assign(inc, { status: b.status, closed_at: now, resolution });
      freeUnit(s, inc.unit_id);
    } else if (b.status === "nuevo") {
      const prevUnit = inc.unit_id;
      Object.assign(inc, { status: "nuevo", unit_id: null, unit_code: null, unit_agency: null });
      freeUnit(s, prevUnit);
    } else {
      throw new Error("Estado no válido");
    }
    addEvent(inc, b.status, resolution);
  } else {
    throw new Error("Acción no disponible en la demostración");
  }
  return s;
}

/** Simula el GPS: las unidades reportan posición y las que van en camino se acercan al incidente. */
function tick(prev: DemoState): DemoState {
  const now = iso(Date.now());
  return {
    ...prev,
    units: prev.units.map((u) => {
      if (u.status === "fuera_servicio") return u;
      const inc = prev.incidents.find((i) => i.unit_id === u.id && i.status === u.status && (u.status === "en_camino" || u.status === "en_sitio"));
      if (!inc) return { ...u, position_at: now };
      const k = u.status === "en_sitio" ? 1 : 0.25;
      return { ...u, lat: u.lat + (inc.lat - u.lat) * k, lng: u.lng + (inc.lng - u.lng) * k, position_at: now };
    }),
  };
}

/** Estado de la demostración para la consola: se guarda en este navegador y se sincroniza entre pestañas. */
export function useDemo(enabled: boolean) {
  const [data, setData] = useState<DemoState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fromOtherTab = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    setData(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      fromOtherTab.current = true;
      setData(read());
    };
    const t = setInterval(() => {
      if (document.visibilityState === "visible") setData((s) => (s ? tick(s) : s));
    }, TICK_MS);
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(t);
      window.removeEventListener("storage", onStorage);
    };
  }, [enabled]);

  // Guarda cada cambio; lo que llega de otra pestaña ya está guardado (evita que se reboten).
  useEffect(() => {
    if (!data) return;
    if (fromOtherTab.current) {
      fromOtherTab.current = false;
      return;
    }
    try {
      write(data);
      setError(null);
    } catch {
      setError("El navegador no permite guardar: los cambios de la demostración se perderán al recargar.");
    }
  }, [data]);

  const create = useCallback((values: Record<string, any>) => {
    if (!data) throw new Error("La demostración aún se está cargando");
    const r = createIncident(data, values);
    setData(r.state);
    return r.id;
  }, [data]);

  const act = useCallback((id: number, body: any) => {
    if (!data) throw new Error("La demostración aún se está cargando");
    setData(applyAction(data, id, body));
  }, [data]);

  const reset = useCallback(() => setData(seed()), []);

  return { data, error, create, act, reset };
}
