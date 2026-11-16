import { z } from "zod";
import { q, setClause } from "@/lib/db";
import { audit, handler, HttpError, MANAGERS } from "@/lib/server";
import { AGENCIES, DISTRICTS, UNIT_KINDS } from "@/lib/constants";

const Patch = z.object({
  code: z.string().trim().min(2).max(30).optional(),
  agency: z.enum(AGENCIES).optional(),
  kind: z.enum(UNIT_KINDS).optional(),
  district: z.enum(DISTRICTS).nullable().optional(),
  status: z.enum(["disponible", "fuera_servicio"]).optional(),
});

export const PATCH = handler(MANAGERS, async ({ req, user, params }) => {
  const id = Number(params.id);
  const b = Patch.parse(await req.json());
  if (b.code) b.code = b.code.toUpperCase();
  if (b.status) {
    const [busy] = await q("select 1 from incidents where unit_id = $1 and status in ('despachado','en_camino','en_sitio') limit 1", [id]);
    if (busy) throw new HttpError(409, "La unidad tiene un incidente activo. Ciérralo o reasígnalo primero.");
  }
  const s = setClause(b, 2);
  if (s.empty) throw new HttpError(400, "Nada que actualizar");
  const [u] = await q(`update units set ${s.sql} where id = $1 returning *`, [id, ...s.vals]);
  if (!u) throw new HttpError(404, "Unidad no encontrada");
  await audit(req, user, "unidad_editada", "unit", id, b);
  return u;
});

export const DELETE = handler(MANAGERS, async ({ req, user, params }) => {
  const id = Number(params.id);
  const [busy] = await q("select 1 from incidents where unit_id = $1 and status in ('despachado','en_camino','en_sitio') limit 1", [id]);
  if (busy) throw new HttpError(409, "La unidad tiene un incidente activo");
  const [u] = await q("delete from units where id = $1 returning code", [id]);
  if (!u) throw new HttpError(404, "Unidad no encontrada");
  await audit(req, user, "unidad_eliminada", "unit", id, u);
  return { ok: true };
});
