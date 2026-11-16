import { q, setClause } from "@/lib/db";
import { audit, handler, HttpError, MANAGERS } from "@/lib/server";
import { CamBody } from "@/lib/schemas";

export const PATCH = handler(MANAGERS, async ({ req, user, params }) => {
  const id = Number(params.id);
  const b = CamBody.partial().parse(await req.json());
  const s = setClause(b, 2);
  if (s.empty) throw new HttpError(400, "Nada que actualizar");
  const [c] = await q(`update cameras set ${s.sql} where id = $1 returning *`, [id, ...s.vals]);
  if (!c) throw new HttpError(404, "Cámara no encontrada");
  await audit(req, user, "camara_editada", "camera", id, b);
  return c;
});

export const DELETE = handler(MANAGERS, async ({ req, user, params }) => {
  const [c] = await q("delete from cameras where id = $1 returning name", [Number(params.id)]);
  if (!c) throw new HttpError(404, "Cámara no encontrada");
  await audit(req, user, "camara_eliminada", "camera", params.id, c);
  return { ok: true };
});
