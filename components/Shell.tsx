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

export default function Shell({ me, children }: { me: Me; children: React.ReactNode }) {
  const path = usePathname();
  return (
    <MeCtx.Provider value={me}>
      <div className="shell">
        <aside className="side">
          <div className="brand">
            <b>AREQUIPA <span>C5</span></b>
            <small>Centro de operaciones</small>
          </div>
          <nav className="nav">
            {NAV.filter((n) => n.roles.includes(me.role)).map((n) => (
              <Link key={n.href} href={n.href} className={path === n.href ? "on" : ""}>{n.label}</Link>
            ))}
          </nav>
          <div className="who">
            <div>{me.name}</div>
            <div className="muted">{ROLE_LABEL[me.role]}</div>
            <button className="btn sm" style={{ marginTop: 8 }} onClick={logout}>Cerrar sesión</button>
          </div>
        </aside>
        <div className="main">{children}</div>
      </div>
    </MeCtx.Provider>
  );
}
