import { z } from "zod";
import { q } from "@/lib/db";
import { audit, handler, MANAGERS, STAFF } from "@/lib/server";
import { AGENCIES, DISTRICTS, UNIT_KINDS } from "@/lib/constants";

const UnitBody = z.object({
  code: z.string().trim().min(2).max(30),
  agency: z.enum(AGENCIES),
  kind: z.enum(UNIT_KINDS),
  district: z.enum(DISTRICTS).nullable().optional(),
});

export const GET = handler(STAFF, async () => q("select * from units order by agency, code"));

export const POST = handler(MANAGERS, async ({ req, user }) => {
  const b = UnitBody.parse(await req.json());
  const [u] = await q("insert into units (code, agency, kind, district) values ($1,$2,$3,$4) returning *", [
    b.code.toUpperCase(), b.agency, b.kind, b.district ?? null,
  ]);
  await audit(req, user, "unidad_creada", "unit", u.id, b);
  return u;
});
