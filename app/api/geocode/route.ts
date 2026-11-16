import { handler, HttpError, STAFF } from "@/lib/server";
import { DISTRICTS } from "@/lib/constants";

// Búsqueda de direcciones con Nominatim (OpenStreetMap), limitada a la provincia de Arequipa.
const UA = `ArequipaC5/1.0 (${process.env.GEOCODER_CONTACT || "centro de operaciones"})`;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function district(addr: Record<string, string> = {}) {
  const vals = [addr.city_district, addr.suburb, addr.town, addr.village, addr.municipality, addr.city, addr.county]
    .filter(Boolean)
    .map(norm);
  for (const v of vals) {
    const hit = DISTRICTS.find((d) => {
      const n = norm(d).replace(" (cercado)", "");
      return v === n || (n !== "arequipa" && v.includes(n));
    });
    if (hit) return hit;
  }
  return null;
}

function label(r: any) {
  const a = r.address || {};
  const street = [a.road || a.pedestrian || a.neighbourhood, a.house_number].filter(Boolean).join(" ");
  return [r.name && r.name !== street ? r.name : null, street, a.neighbourhood && a.road ? a.neighbourhood : null]
    .filter(Boolean)
    .join(", ") || String(r.display_name || "").split(",").slice(0, 2).join(",");
}

export const GET = handler(STAFF, async ({ req }) => {
  const p = req.nextUrl.searchParams;
  const base = "https://nominatim.openstreetmap.org";
  let url: string;
  if (p.get("q")) {
    url = `${base}/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=pe&viewbox=-72.4,-15.5,-70.8,-17.0&bounded=1&q=${encodeURIComponent(p.get("q")!)}`;
  } else if (p.get("lat") && p.get("lng")) {
    url = `${base}/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${Number(p.get("lat"))}&lon=${Number(p.get("lng"))}`;
  } else throw new HttpError(400, "Falta q o lat/lng");

  let data: any;
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "es" }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error(String(r.status));
    data = await r.json();
  } catch {
    throw new HttpError(502, "El servicio de direcciones no respondió. Ubica el punto haciendo clic en el mapa.");
  }
  const list = Array.isArray(data) ? data : data?.error ? [] : [data];
  return list.map((r: any) => ({
    lat: Number(r.lat), lng: Number(r.lon), address: label(r), district: district(r.address), full: r.display_name,
  }));
});
