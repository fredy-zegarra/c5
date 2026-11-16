import { z } from "zod";
import { q } from "@/lib/db";
import { audit, handler, STAFF } from "@/lib/server";
import { BOUNDS, DISTRICTS, INCIDENT_TYPES, SOURCES } from "@/lib/constants";

const Create = z.object({
  type: z.enum(INCIDENT_TYPES),
  priority: z.number().int().min(1).max(4),
  description: z.string().max(2000).default(""),
  address: z.string().max(300).default(""),
  district: z.enum(DISTRICTS).nullable().optional(),
  lat: z.number().min(BOUNDS.latMin).max(BOUNDS.latMax),
  lng: z.number().min(BOUNDS.lngMin).max(BOUNDS.lngMax),
  reporter_name: z.string().max(120).nullable().optional(),
  reporter_phone: z.string().max(30).nullable().optional(),
  source: z.enum(SOURCES).default("Llamada telefónica"),
});

export const POST = handler(STAFF, async ({ req, user }) => {
  const b = Create.parse(await req.json());
  const [row] = await q(
    `insert into incidents (type, priority, description, address, district, lat, lng, reporter_name, reporter_phone, source, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`,
    [b.type, b.priority, b.description, b.address, b.district ?? null, b.lat, b.lng, b.reporter_name || null, b.reporter_phone || null, b.source, user.id]
  );
  const [inc] = await q(
    `update incidents set code = 'AQP-' || to_char(created_at at time zone 'America/Lima', 'YYMMDD') || '-' || lpad(id::text, 5, '0')
     where id = $1 returning *`,
    [row.id]
  );
  await q("insert into incident_events (incident_id, user_id, user_name, kind, note) values ($1,$2,$3,'creado',$4)", [
    inc.id, user.id, user.name, `Registrado por ${b.source.toLowerCase()}`,
  ]);
  await audit(req, user, "incidente_creado", "incident", inc.id, { code: inc.code, type: b.type, priority: b.priority });
  return inc;
});

// Historial con filtros
export const GET = handler(STAFF, async ({ req }) => {
  const p = req.nextUrl.searchParams;
  const where: string[] = [];
  const vals: any[] = [];
  const add = (sql: string, v: any) => {
    vals.push(v);
    where.push(sql.replace("?", `$${vals.length}`));
  };
  if (p.get("status")) add("i.status = ?", p.get("status"));
  if (p.get("type")) add("i.type = ?", p.get("type"));
  if (p.get("district")) add("i.district = ?", p.get("district"));
  if (p.get("from")) add("i.created_at >= (?::date at time zone 'America/Lima')", p.get("from"));
  if (p.get("to")) add("i.created_at < ((?::date + 1) at time zone 'America/Lima')", p.get("to"));
  if (p.get("q")) {
    vals.push(`%${p.get("q")}%`);
    const n = `$${vals.length}`;
    where.push(`(i.code ilike ${n} or i.address ilike ${n} or i.description ilike ${n} or i.reporter_phone ilike ${n})`);
  }
  return q(
    `select i.*, u.code as unit_code, u.agency as unit_agency
     from incidents i left join units u on u.id = i.unit_id
     ${where.length ? "where " + where.join(" and ") : ""}
     order by i.created_at desc limit 1000`,
    vals
  );
});
