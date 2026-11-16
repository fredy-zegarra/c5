import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { ZodError } from "zod";
import { q } from "./db";
import type { Role } from "./constants";

export const COOKIE = "c5_session";
const HOURS = 12;

export type User = { id: number; email: string; name: string; role: Role; unit_id: number | null };

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new HttpError(500, "Falta SESSION_SECRET (mínimo 32 caracteres) en las variables de entorno.");
    }
    return new TextEncoder().encode("solo-para-desarrollo-local-no-usar-en-produccion");
  }
  return new TextEncoder().encode(s);
}

export async function createSession(userId: number) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${HOURS}h`)
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: HOURS * 3600,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** Usuario de la sesión actual (se revalida contra la base en cada petición). */
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    const rows = await q<User>("select id, email, name, role, unit_id from users where id = $1 and active", [
      Number(payload.sub),
    ]);
    return rows[0] ?? null;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    return null;
  }
}

export function ipOf(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

export async function audit(
  req: NextRequest,
  user: { id: number; email: string } | null,
  action: string,
  entity?: string,
  entityId?: string | number,
  detail?: unknown
) {
  await q("insert into audit_log (user_id, user_email, action, entity, entity_id, detail, ip) values ($1,$2,$3,$4,$5,$6,$7)", [
    user?.id ?? null,
    user?.email ?? null,
    action,
    entity ?? null,
    entityId != null ? String(entityId) : null,
    detail != null ? JSON.stringify(detail).slice(0, 2000) : null,
    ipOf(req),
  ]);
}

type Ctx = { req: NextRequest; user: User; params: Record<string, string> };

/**
 * Envoltorio de endpoints: exige sesión y rol, bloquea peticiones de otros orígenes (CSRF)
 * y convierte los errores en respuestas JSON.
 */
export function handler(roles: Role[] | "public", fn: (c: Ctx) => Promise<unknown>) {
  return async (req: NextRequest, c: { params: Promise<Record<string, string>> }) => {
    try {
      if (req.method !== "GET") {
        const origin = req.headers.get("origin");
        const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
        if (origin && host && new URL(origin).host !== host) throw new HttpError(403, "Origen no permitido");
      }
      let user = null as unknown as User;
      if (roles !== "public") {
        const u = await currentUser();
        if (!u) throw new HttpError(401, "Sesión no iniciada o vencida");
        if (!roles.includes(u.role)) throw new HttpError(403, "Tu rol no tiene permiso para esta acción");
        user = u;
      }
      const out = await fn({ req, user, params: await c.params });
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (e: any) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) {
        const i = e.issues[0];
        return NextResponse.json({ error: `Dato inválido en "${i.path.join(".")}": ${i.message}` }, { status: 400 });
      }
      if (e?.code === "23505") return NextResponse.json({ error: "Ya existe un registro con ese valor" }, { status: 409 });
      console.error(e);
      const msg = /DATABASE_URL/.test(e?.message || "") ? e.message : "Error interno del servidor";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  };
}

export const STAFF: Role[] = ["admin", "supervisor", "operador"];
export const MANAGERS: Role[] = ["admin", "supervisor"];
export const ALL: Role[] = ["admin", "supervisor", "operador", "unidad"];
