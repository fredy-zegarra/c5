import bcrypt from "bcryptjs";
import { z } from "zod";
import { q } from "@/lib/db";
import { audit, createSession, handler, HttpError, ipOf } from "@/lib/server";

const Body = z.object({ email: z.string().email(), password: z.string().min(1).max(200) });

export const POST = handler("public", async ({ req }) => {
  const { email: raw, password } = Body.parse(await req.json());
  const email = raw.trim().toLowerCase();
  const ip = ipOf(req);

  // Límite de intentos fallidos: 8 en 15 minutos por correo o por IP.
  const [{ n }] = await q<{ n: number }>(
    "select count(*)::int as n from login_attempts where (email = $1 or ip = $2) and created_at > now() - interval '15 minutes'",
    [email, ip]
  );
  if (n >= 8) throw new HttpError(429, "Demasiados intentos fallidos. Espera 15 minutos.");

  const [{ total }] = await q<{ total: number }>("select count(*)::int as total from users");
  if (total === 0) {
    throw new HttpError(503, "Aún no hay usuarios. Define ADMIN_EMAIL y ADMIN_PASSWORD en las variables de entorno y vuelve a desplegar.");
  }

  const [u] = await q<any>("select id, email, role, password_hash, active from users where email = $1", [email]);
  const ok = u && u.active && (await bcrypt.compare(password, u.password_hash));
  if (!ok) {
    await q("insert into login_attempts (email, ip) values ($1, $2)", [email, ip]);
    await audit(req, null, "login_fallido", "user", email);
    throw new HttpError(401, "Correo o contraseña incorrectos");
  }
  await q("delete from login_attempts where email = $1 or created_at < now() - interval '1 day'", [email]);
  await createSession(u.id);
  await audit(req, u, "login", "user", u.id);
  return { ok: true, role: u.role };
});
