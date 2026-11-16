// Catálogos compartidos entre frontend y backend.

// Los 29 distritos de la provincia de Arequipa.
export const DISTRICTS = [
  "Arequipa (Cercado)", "Alto Selva Alegre", "Cayma", "Cerro Colorado", "Characato", "Chiguata",
  "Jacobo Hunter", "José Luis Bustamante y Rivero", "La Joya", "Mariano Melgar", "Miraflores",
  "Mollebaya", "Paucarpata", "Pocsi", "Polobaya", "Quequeña", "Sabandía", "Sachaca",
  "San Juan de Siguas", "San Juan de Tarucani", "Santa Isabel de Siguas", "Santa Rita de Siguas",
  "Socabaya", "Tiabaya", "Uchumayo", "Vítor", "Yanahuara", "Yarabamba", "Yura",
] as const;

export const INCIDENT_TYPES = [
  "Robo o hurto", "Robo de vehículo", "Violencia familiar", "Riña o alteración del orden",
  "Accidente de tránsito", "Incendio", "Emergencia médica", "Persona o vehículo sospechoso",
  "Consumo de alcohol o drogas en vía pública", "Ruidos molestos", "Persona desaparecida",
  "Huaico, inundación o desastre", "Otro",
] as const;

export const PRIORITIES: Record<number, string> = { 1: "Crítica", 2: "Alta", 3: "Media", 4: "Baja" };

export const INCIDENT_STATUS = ["nuevo", "despachado", "en_camino", "en_sitio", "cerrado", "cancelado"] as const;
export const STATUS_LABEL: Record<string, string> = {
  nuevo: "Nuevo", despachado: "Despachado", en_camino: "En camino", en_sitio: "En sitio",
  cerrado: "Cerrado", cancelado: "Cancelado",
};

export const SOURCES = ["Llamada telefónica", "Cámara", "Patrulla", "WhatsApp o mensaje", "Presencial", "Otro"] as const;

export const AGENCIES = ["PNP", "SERENAZGO", "BOMBEROS", "SAMU"] as const;
export const AGENCY_LABEL: Record<string, string> = {
  PNP: "PNP", SERENAZGO: "Serenazgo", BOMBEROS: "Bomberos", SAMU: "SAMU",
};
export const UNIT_KINDS = ["Patrullero", "Motocicleta", "A pie", "Ambulancia", "Bomba", "Otro"] as const;
export const UNIT_STATUS = ["disponible", "asignada", "en_camino", "en_sitio", "fuera_servicio"] as const;
export const UNIT_STATUS_LABEL: Record<string, string> = {
  disponible: "Disponible", asignada: "Asignada", en_camino: "En camino", en_sitio: "En sitio",
  fuera_servicio: "Fuera de servicio",
};

export const ROLES = ["admin", "supervisor", "operador", "unidad"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador", supervisor: "Supervisor", operador: "Operador", unidad: "Unidad de campo",
};

export const STREAM_TYPES = ["hls", "mjpeg", "iframe"] as const;

// Plaza de Armas de Arequipa
export const CENTER = { lat: -16.3989, lng: -71.5369 };
// Límites amplios de la región para validar coordenadas
export const BOUNDS = { latMin: -17.6, latMax: -14.5, lngMin: -73.6, lngMax: -70.5 };

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-PE", {
    timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}
export function fmtTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false });
}
export function ago(d: string | Date) {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "ahora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
  return `${Math.floor(s / 86400)} d`;
}
export function fmtDur(sec: number | null | undefined) {
  if (sec == null) return "—";
  if (sec < 60) return `${Math.round(sec)} s`;
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  return `${(sec / 3600).toFixed(1)} h`;
}
export function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
