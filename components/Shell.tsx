"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { ROLE_LABEL } from "@/lib/constants";
import { Me, MeCtx } from "./ui";

const NAV = [
  { href: "/", label: "Operaciones", roles: ["admin", "supervisor", "operador"] },
  { href: "/incidentes", label: "Historial", roles: ["admin", "supervisor", "operador"] },
  { href: "/unidades", label: "Unidades", roles: ["admin", "supervisor", "operador"] },
  { href: "/camaras", label: "Cámaras", roles: ["admin", "supervisor", "operador"] },
  { href: "/estadisticas", label: "Estadísticas", roles: ["admin", "supervisor", "operador"] },
  { href: "/auditoria", label: "Auditoría", roles: ["admin", "supervisor"] },
  { href: "/usuarios", label: "Usuarios", roles: ["admin"] },
];

export function Clock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const f = () => setT(new Date().toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour12: false }));
    f();
    const i = setInterval(f, 1000);
    return () => clearInterval(i);
  }, []);
  return <span className="clock">{t}</span>;
}

export async function logout() {
  await api("/api/auth/logout", "POST").catch(() => {});
  window.location.href = "/login";
}

/** En modo demostración solo Operaciones funciona; los demás módulos usan datos reales y piden sesión. */
function DemoLocked() {
  return (
    <div className="center" style={{ minHeight: 0, flex: 1 }}>
      <div className="card col" style={{ maxWidth: 440 }}>
        <h1>Este módulo requiere iniciar sesión</h1>
        <div className="muted">
          En la demostración solo está disponible Operaciones, con emergencias simuladas. El historial, las unidades,
          las cámaras, las estadísticas y la administración usan los datos reales del centro.
        </div>
        <div className="row">
          <Link className="btn primary" href="/login">Iniciar sesión</Link>
          <Link className="btn" href="/">Volver a Operaciones</Link>
        </div>
      </div>
    </div>
  );
}

export default function Shell({ me, children }: { me: Me; children: React.ReactNode }) {
  const path = usePathname();
  const demo = me.role === "demo";
  return (
    <MeCtx.Provider value={me}>
      <div className="shell">
        <aside className="side">
          <div className="brand">
            <b>AREQUIPA <span>C5</span></b>
            <small>Centro de operaciones</small>
          </div>
          <nav className="nav">
            {NAV.filter((n) => n.roles.includes(me.role) || (demo && n.href === "/")).map((n) => (
              <Link key={n.href} href={n.href} className={path === n.href ? "on" : ""}>{n.label}</Link>
            ))}
          </nav>
          <div className="who">
            <div>{me.name}</div>
            <div className="muted">{demo ? "Datos simulados" : ROLE_LABEL[me.role]}</div>
            {demo
              ? <Link className="btn sm" style={{ marginTop: 8 }} href="/login">Iniciar sesión</Link>
              : <button className="btn sm" style={{ marginTop: 8 }} onClick={logout}>Cerrar sesión</button>}
          </div>
        </aside>
        <div className="main">{demo && path !== "/" ? <DemoLocked /> : children}</div>
      </div>
    </MeCtx.Provider>
  );
}
