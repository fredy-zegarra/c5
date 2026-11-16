import bcrypt from "bcryptjs";

// Capa de datos. En producción usa PostgreSQL (DATABASE_URL).
// En tu PC, si no hay DATABASE_URL, usa una base PostgreSQL embebida (PGlite) en la carpeta .data

type Row = Record<string, any>;
interface Driver {
  query(text: string, params?: any[]): Promise<{ rows: Row[] }>;
  exec(text: string): Promise<unknown>;
}

const SCHEMA = `
create table if not exists units (
  id serial primary key,
  code text not null unique,
  agency text not null,
  kind text not null default 'Patrullero',
  district text,
  status text not null default 'disponible',
  lat double precision,
  lng double precision,
  position_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists users (
  id serial primary key,
  email text not null unique,
  name text not null,
  role text not null,
  password_hash text not null,
  active boolean not null default true,
  unit_id integer references units(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists incidents (
  id serial primary key,
  code text,
  type text not null,
  priority integer not null,
  status text not null default 'nuevo',
  description text not null default '',
  address text not null default '',
  district text,
  lat double precision not null,
  lng double precision not null,
  reporter_name text,
  reporter_phone text,
  source text,
  unit_id integer references units(id) on delete set null,
  created_by integer references users(id) on delete set null,
  created_at timestamptz not null default now(),
  dispatched_at timestamptz,
  arrived_at timestamptz,
  closed_at timestamptz,
  resolution text
);
create index if not exists incidents_status_idx on incidents(status);
create index if not exists incidents_created_idx on incidents(created_at desc);
create table if not exists incident_events (
  id serial primary key,
  incident_id integer not null references incidents(id) on delete cascade,
  user_id integer references users(id) on delete set null,
  user_name text,
  kind text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists incident_events_inc_idx on incident_events(incident_id);
create table if not exists cameras (
  id serial primary key,
  name text not null,
  district text,
  address text,
  lat double precision not null,
  lng double precision not null,
  stream_url text,
  stream_type text not null default 'hls',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists audit_log (
  id serial primary key,
  user_id integer,
  user_email text,
  action text not null,
  entity text,
  entity_id text,
  detail text,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists audit_created_idx on audit_log(created_at desc);
create table if not exists login_attempts (
  id serial primary key,
  email text,
  ip text,
  created_at timestamptz not null default now()
);
`;

async function connect(): Promise<Driver> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  let d: Driver;
  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 10_000 });
    d = { query: (t, p) => pool.query(t, p), exec: (t) => pool.query(t) };
  } else {
    if (process.env.VERCEL) {
      throw new Error("Falta DATABASE_URL: conecta una base PostgreSQL (Neon) al proyecto en Vercel.");
    }
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = process.env.PGLITE_DIR || "./.data/pg";
    (await import("node:fs")).mkdirSync(dir, { recursive: true });
    const pg = new PGlite(dir);
    d = { query: (t, p) => pg.query(t, p) as any, exec: (t) => pg.exec(t) };
  }
  await d.exec(SCHEMA);
  // Primer administrador: solo si la tabla de usuarios está vacía.
  const { rows } = await d.query("select count(*)::int as n from users");
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const pass = process.env.ADMIN_PASSWORD;
  if (rows[0].n === 0 && email && pass) {
    await d.query(
      "insert into users (email, name, role, password_hash) values ($1, $2, 'admin', $3) on conflict do nothing",
      [email, "Administrador", await bcrypt.hash(pass, 11)]
    );
  }
  return d;
}

const g = globalThis as unknown as { __c5db?: Promise<Driver> };

function driver() {
  if (!g.__c5db) {
    g.__c5db = connect().catch((e) => {
      g.__c5db = undefined;
      throw e;
    });
  }
  return g.__c5db;
}

/** Ejecuta una consulta parametrizada y devuelve las filas. */
export async function q<T = Row>(text: string, params: any[] = []): Promise<T[]> {
  const d = await driver();
  return (await d.query(text, params)).rows as T[];
}

/** Construye "col1=$1, col2=$2" para updates parciales. */
export function setClause(obj: Record<string, any>, start = 1) {
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined);
  return {
    sql: keys.map((k, i) => `${k} = $${i + start}`).join(", "),
    vals: keys.map((k) => obj[k]),
    next: start + keys.length,
    empty: keys.length === 0,
  };
}
