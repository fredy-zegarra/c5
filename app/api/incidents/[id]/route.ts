import { z } from "zod";
import { q, setClause } from "@/lib/db";
import { ALL, audit, handler, HttpError, User } from "@/lib/server";
import { DISTRICTS, INCIDENT_TYPES, STATUS_LABEL } from "@/lib/constants";

async function load(id: number) {
  const [inc] = await q(
    `select i.*, u.code as unit_code, u.agency as unit_agency
     from incidents i left join units u on u.id = i.unit_id where i.id = $1`,
    [id]
  );
  if (!inc) throw new HttpError(404, "Incidente no encontrado");
  return inc;
}

// Una unidad de campo solo puede ver y actualizar el incidente que tiene asignado.
function guard(user: User, inc: any) {
  if (user.role === "unidad" && (!user.unit_id || inc.unit_id !== user.unit_id)) {
    throw new HttpError(403, "Este incidente no está asignado a tu unidad");
  }
}

async function event(inc: number, user: User, kind: string, note?: string | null) {
  await q("insert into incident_events (incident_id, user_id, user_name, kind, note) values ($1,$2,$3,$4,$5)", [
    inc, user.id, user.name, kind, note ?? null,
  ]);
}

/** Libera una unidad si ya no tiene incidentes activos. */
async function freeUnit(unitId: number | null) {
  if (!unitId) return;
  await q(
    `update units set status = 'disponible'
     where id = $1 and status <> 'fuera_servicio'
       and not exists (select 1 from incidents where unit_id = $1 and status in ('despachado','en_camino','en_sitio'))`,
    [unitId]
  );
}

export const GET = handler(ALL, async ({ user, params }) => {
  const inc = await load(Number(params.id));
  guard(user, inc);
  const events = await q("select * from incident_events where incident_id = $1 order by created_at, id", [inc.id]);
  return { ...inc, events };
});

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("assign"), unit_id: z.number().int().nullable() }),
  z.object({
    action: z.literal("status"),
    status: z.enum(["en_camino", "en_sitio", "cerrado", "cancelado", "nuevo"]),
    resolution: z.string().max(2000).optional(),
  }),
  z.object({ action: z.literal("note"), note: z.string().min(1).max(2000) }),
  z.object({
    action: z.literal("edit"),
    type: z.enum(INCIDENT_TYPES).optional(),
    priority: z.number().int().min(1).max(4).optional(),
    description: z.string().max(2000).optional(),
    address: z.string().max(300).optional(),
    district: z.enum(DISTRICTS).nullable().optional(),
    reporter_name: z.string().max(120).nullable().optional(),
    reporter_phone: z.string().max(30).nullable().optional(),
  }),
]);

export const PATCH = handler(ALL, async ({ req, user, params }) => {
  const inc = await load(Number(params.id));
  guard(user, inc);
  const b = Body.parse(await req.json());
  const closed = inc.status === "cerrado" || inc.status === "cancelado";
  const staff = user.role !== "unidad";

  if (b.action === "note") {
    await event(inc.id, user, "nota", b.note);
  } else if (b.action === "assign") {
    if (!staff) throw new HttpError(403, "Solo la central asigna unidades");
    if (closed) throw new HttpError(409, "El incidente ya está cerrado");
    if (b.unit_id == null) {
      await q("update incidents set unit_id = null, status = 'nuevo' where id = $1", [inc.id]);
      await freeUnit(inc.unit_id);
      await event(inc.id, user, "unidad_retirada", inc.unit_code);
    } else {
      const [unit] = await q("select * from units where id = $1", [b.unit_id]);
      if (!unit) throw new HttpError(404, "Unidad no encontrada");
      if (unit.status === "fuera_servicio") throw new HttpError(409, "La unidad está fuera de servicio");
      await q(
        "update incidents set unit_id = $2, status = 'despachado', dispatched_at = coalesce(dispatched_at, now()), arrived_at = null where id = $1",
        [inc.id, unit.id]
      );
      await q("update units set status = 'asignada' where id = $1", [unit.id]);
      if (inc.unit_id && inc.unit_id !== unit.id) await freeUnit(inc.unit_id);
      await event(inc.id, user, "despachado", `Unidad ${unit.code}`);
    }
    await audit(req, user, "incidente_asignado", "incident", inc.id, { code: inc.code, unit_id: b.unit_id });
  } else if (b.action === "status") {
    if (closed) throw new HttpError(409, "El incidente ya está cerrado");
    if (b.status === "nuevo" || b.status === "cancelado") {
      if (!staff) throw new HttpError(403, "Solo la central puede hacer este cambio");
    }
    if ((b.status === "en_camino" || b.status === "en_sitio") && !inc.unit_id) {
      throw new HttpError(409, "Primero asigna una unidad");
    }
    if (b.status === "cerrado" && !b.resolution?.trim()) throw new HttpError(400, "Indica cómo se resolvió el incidente");

    if (b.status === "en_camino") {
      await q("update incidents set status = 'en_camino' where id = $1", [inc.id]);
      await q("update units set status = 'en_camino' where id = $1", [inc.unit_id]);
    } else if (b.status === "en_sitio") {
      await q("update incidents set status = 'en_sitio', arrived_at = coalesce(arrived_at, now()) where id = $1", [inc.id]);
      await q("update units set status = 'en_sitio' where id = $1", [inc.unit_id]);
    } else if (b.status === "cerrado" || b.status === "cancelado") {
      await q("update incidents set status = $2, closed_at = now(), resolution = $3 where id = $1", [
        inc.id, b.status, b.resolution?.trim() || null,
      ]);
      await freeUnit(inc.unit_id);
    } else {
      await q("update incidents set status = 'nuevo', unit_id = null where id = $1", [inc.id]);
      await freeUnit(inc.unit_id);
    }
    await event(inc.id, user, b.status, b.resolution?.trim() || null);
    await audit(req, user, "incidente_estado", "incident", inc.id, { code: inc.code, status: STATUS_LABEL[b.status] });
  } else {
    if (!staff) throw new HttpError(403, "Solo la central edita el incidente");
    const { action, ...fields } = b;
    const s = setClause(fields, 2);
    if (!s.empty) {
      await q(`update incidents set ${s.sql} where id = $1`, [inc.id, ...s.vals]);
      await event(inc.id, user, "editado", Object.keys(fields).join(", "));
      await audit(req, user, "incidente_editado", "incident", inc.id, fields);
    }
  }
  const out = await load(inc.id);
  const events = await q("select * from incident_events where incident_id = $1 order by created_at, id", [inc.id]);
  return { ...out, events };
});
