import bcrypt from "bcryptjs";
import { z } from "zod";
import { q, setClause } from "@/lib/db";
import { audit, handler, HttpError } from "@/lib/server";
import { ROLES } from "@/lib/constants";

const Patch = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
  unit_id: z.number().int().nullable().optional(),
  password: z.string().min(10, "mínimo 10 caracteres").max(200).optional(),
});

export const PATCH = handler(["admin"], async ({ req, user, params }) => {
  const id = Number(params.id);
  const { password, ...b } = Patch.parse(await req.json());
  if (id === user.id && (b.active === false || (b.role && b.role !== "admin"))) {
    throw new HttpError(409, "No puedes desactivarte ni quitarte el rol de administrador");
  }
  const fields: Record<string, any> = { ...b };
  if (password) fields.password_hash = await bcrypt.hash(password, 11);
  const s = setClause(fields, 2);
  if (s.empty) throw new HttpError(400, "Nada que actualizar");
  const [u] = await q(`update users set ${s.sql} where id = $1 returning id, email, name, role, active, unit_id`, [id, ...s.vals]);
  if (!u) throw new HttpError(404, "Usuario no encontrado");
  await audit(req, user, password ? "usuario_clave_cambiada" : "usuario_editado", "user", id, b);
  return u;
});
