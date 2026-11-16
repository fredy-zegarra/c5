import bcrypt from "bcryptjs";
import { z } from "zod";
import { q } from "@/lib/db";
import { audit, handler } from "@/lib/server";
import { ROLES } from "@/lib/constants";

const Create = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).max(120),
  role: z.enum(ROLES),
  password: z.string().min(10, "mínimo 10 caracteres").max(200),
  unit_id: z.number().int().nullable().optional(),
});

export const GET = handler(["admin"], async () =>
  q(`select u.id, u.email, u.name, u.role, u.active, u.unit_id, u.created_at, un.code as unit_code
     from users u left join units un on un.id = u.unit_id order by u.active desc, u.name`)
);

export const POST = handler(["admin"], async ({ req, user }) => {
  const b = Create.parse(await req.json());
  const [u] = await q(
    "insert into users (email, name, role, password_hash, unit_id) values ($1,$2,$3,$4,$5) returning id, email, name, role",
    [b.email.trim().toLowerCase(), b.name, b.role, await bcrypt.hash(b.password, 11), b.role === "unidad" ? b.unit_id ?? null : null]
  );
  await audit(req, user, "usuario_creado", "user", u.id, { email: u.email, role: u.role });
  return u;
});
