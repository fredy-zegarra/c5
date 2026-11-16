"use client";
import { useState } from "react";
import { api, usePoll } from "@/lib/client";
import { AGENCIES, AGENCY_LABEL, UNIT_KINDS, UNIT_STATUS_LABEL, ago } from "@/lib/constants";
import { DistrictSelect, Loc, LocationField, Modal, isManager, useMe } from "@/components/ui";

const EMPTY = { code: "", agency: "SERENAZGO", kind: "Patrullero", district: null as string | null };

export default function Unidades() {
  const me = useMe();
  const can = isManager(me);
  const { data: units, refresh } = usePoll<any[]>("/api/units", 6000);
  const [edit, setEdit] = useState<any | null>(null);
  const [pos, setPos] = useState<{ unit: any; loc: Loc } | null>(null);
  const [err, setErr] = useState("");

  async function run(fn: () => Promise<any>, done?: () => void) {
    setErr("");
    try { await fn(); await refresh(); done?.(); } catch (e: any) { setErr(e.message); }
  }
  const save = () => run(
    () => edit.id
      ? api(`/api/units/${edit.id}`, "PATCH", { code: edit.code, agency: edit.agency, kind: edit.kind, district: edit.district })
      : api("/api/units", "POST", edit),
    () => setEdit(null)
  );

  return (
    <>
      <div className="top">
        <h1>Unidades</h1>
        {can && <button className="btn primary right" onClick={() => { setErr(""); setEdit({ ...EMPTY }); }}>+ Nueva unidad</button>}
      </div>
      <div className="page col">
        <div className="note">
          La posición de cada unidad llega desde el celular del efectivo (usuario con rol «Unidad de campo» que abre el modo unidad y comparte su GPS).
          Un supervisor también puede fijarla a mano.
        </div>
        {err && !edit && !pos && <div className="err">{err}</div>}
        <div className="card tablewrap">
          <table>
            <thead><tr><th>Código</th><th>Institución</th><th>Tipo</th><th>Distrito</th><th>Estado</th><th>Última posición</th>{can && <th></th>}</tr></thead>
            <tbody>
              {(units ?? []).map((u) => (
                <tr key={u.id}>
                  <td className="mono">{u.code}</td><td>{AGENCY_LABEL[u.agency]}</td><td>{u.kind}</td><td>{u.district || "—"}</td>
                  <td><span className={`badge ${u.status}`}>{UNIT_STATUS_LABEL[u.status]}</span></td>
                  <td>{u.position_at ? `hace ${ago(u.position_at)}` : "Sin posición"}</td>
                  {can && (
                    <td className="row" style={{ justifyContent: "flex-end" }}>
                      <button className="btn sm" onClick={() => { setErr(""); setEdit(u); }}>Editar</button>
                      <button className="btn sm" onClick={() => { setErr(""); setPos({ unit: u, loc: { lat: u.lat, lng: u.lng, address: "", district: u.district } }); }}>Ubicar</button>
                      {u.status === "disponible" && <button className="btn sm" onClick={() => run(() => api(`/api/units/${u.id}`, "PATCH", { status: "fuera_servicio" }))}>Fuera de servicio</button>}
                      {u.status === "fuera_servicio" && <button className="btn sm ok" onClick={() => run(() => api(`/api/units/${u.id}`, "PATCH", { status: "disponible" }))}>Poner en servicio</button>}
                      <button className="btn sm danger" onClick={() => confirm(`¿Eliminar la unidad ${u.code}?`) && run(() => api(`/api/units/${u.id}`, "DELETE"))}>Eliminar</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {units && units.length === 0 && <div className="muted" style={{ padding: 12 }}>Aún no hay unidades registradas.</div>}
        </div>
      </div>
      {edit && (
        <Modal title={edit.id ? `Editar ${edit.code}` : "Nueva unidad"} onClose={() => setEdit(null)}>
          <form className="col" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <div><label>Código o placa</label><input required value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} placeholder="Ej. SER-JLBR-04" /></div>
            <div className="row">
              <div className="field"><label>Institución</label><select value={edit.agency} onChange={(e) => setEdit({ ...edit, agency: e.target.value })}>{AGENCIES.map((a) => <option key={a} value={a}>{AGENCY_LABEL[a]}</option>)}</select></div>
              <div className="field"><label>Tipo</label><select value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value })}>{UNIT_KINDS.map((a) => <option key={a}>{a}</option>)}</select></div>
            </div>
            <div><label>Distrito base</label><DistrictSelect value={edit.district} onChange={(district) => setEdit({ ...edit, district })} /></div>
            {err && <div className="err">{err}</div>}
            <button className="btn primary">Guardar</button>
          </form>
        </Modal>
      )}
      {pos && (
        <Modal title={`Ubicar ${pos.unit.code}`} onClose={() => setPos(null)}>
          <div className="col">
            <LocationField value={pos.loc} onChange={(loc) => setPos({ ...pos, loc })} />
            {err && <div className="err">{err}</div>}
            <button className="btn primary" disabled={pos.loc.lat == null}
              onClick={() => run(() => api(`/api/units/${pos.unit.id}/position`, "POST", { lat: pos.loc.lat, lng: pos.loc.lng }), () => setPos(null))}>
              Guardar posición
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
