import { z } from "zod";
import { q } from "@/lib/db";
import { ALL, audit, handler, HttpError } from "@/lib/server";
import { BOUNDS } from "@/lib/constants";

const Body = z.object({
  lat: z.number().min(BOUNDS.latMin).max(BOUNDS.latMax),
  lng: z.number().min(BOUNDS.lngMin).max(BOUNDS.lngMax),
});

// Posición de la unidad: la envía el GPS del celular del efectivo (modo unidad)
// o la fija manualmente la central.
export const POST = handler(ALL, async ({ req, user, params }) => {
  const id = Number(params.id);
  if (user.role === "operador") throw new HttpError(403, "Sin permiso");
  if (user.role === "unidad" && user.unit_id !== id) throw new HttpError(403, "No es tu unidad");
  const b = Body.parse(await req.json());
  const [u] = await q("update units set lat = $2, lng = $3, position_at = now() where id = $1 returning id", [id, b.lat, b.lng]);
  if (!u) throw new HttpError(404, "Unidad no encontrada");
  if (user.role !== "unidad") await audit(req, user, "unidad_posicion_manual", "unit", id, b);
  return { ok: true };
});
