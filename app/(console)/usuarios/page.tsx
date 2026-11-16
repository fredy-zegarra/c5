"use client";
import { useState } from "react";
import { api, usePoll } from "@/lib/client";
import { ROLES, ROLE_LABEL } from "@/lib/constants";
import { Modal, useMe } from "@/components/ui";

const EMPTY = { email: "", name: "", role: "operador", password: "", unit_id: null as number | null };

export default function Usuarios() {
  const me = useMe();
  const { data: users, refresh, error } = usePoll<any[]>("/api/users", 20000);
  const { data: units } = usePoll<any[]>("/api/units", 60000);
  const [edit, setEdit] = useState<any | null>(null);
  const [err, setErr] = useState("");

  async function save() {
    setErr("");
    try {
      if (edit.id) {
        const body: any = { name: edit.name, role: edit.role, unit_id: edit.role === "unidad" ? edit.unit_id : null };
        if (edit.password) body.password = edit.password;
        await api(`/api/users/${edit.id}`, "PATCH", body);
      } else await api("/api/users", "POST", edit);
      await refresh();
      setEdit(null);
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <>
      <div className="top"><h1>Usuarios</h1><button className="btn primary right" onClick={() => { setErr(""); setEdit({ ...EMPTY }); }}>+ Nuevo usuario</button></div>
      <div className="page col">
        {error && <div className="err">{error}</div>}
        <div className="card tablewrap">
          <table>
            <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Unidad</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td><td>{u.email}</td><td>{ROLE_LABEL[u.role]}</td><td>{u.unit_code || "—"}</td>
                  <td><span className={`badge ${u.active ? "disponible" : "fuera_servicio"}`}>{u.active ? "Activo" : "Desactivado"}</span></td>
                  <td className="row" style={{ justifyContent: "flex-end" }}>
                    <button className="btn sm" onClick={() => { setErr(""); setEdit({ ...u, password: "" }); }}>Editar</button>
                    {u.id !== me.id && (
                      <button className="btn sm" onClick={async () => { await api(`/api/users/${u.id}`, "PATCH", { active: !u.active }).catch((e) => alert(e.message)); refresh(); }}>
                        {u.active ? "Desactivar" : "Activar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {edit && (
        <Modal title={edit.id ? "Editar usuario" : "Nuevo usuario"} onClose={() => setEdit(null)}>
          <form className="col" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <div><label>Nombre completo</label><input required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div><label>Correo</label><input type="email" required disabled={!!edit.id} value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
            <div><label>Rol</label>
              <select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></div>
            {edit.role === "unidad" && (
              <div><label>Unidad que opera</label>
                <select value={edit.unit_id ?? ""} onChange={(e) => setEdit({ ...edit, unit_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">— Elegir —</option>{(units ?? []).map((u) => <option key={u.id} value={u.id}>{u.code}</option>)}
                </select></div>
            )}
            <div><label>{edit.id ? "Nueva contraseña (vacío = no cambiar)" : "Contraseña (mínimo 10 caracteres)"}</label>
              <input type="password" autoComplete="new-password" required={!edit.id} minLength={10} value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} /></div>
            {err && <div className="err">{err}</div>}
            <button className="btn primary">Guardar</button>
          </form>
        </Modal>
      )}
    </>
  );
}
