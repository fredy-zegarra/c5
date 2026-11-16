"use client";
import { useEffect, useRef, useState } from "react";
import { api, usePoll } from "@/lib/client";
import { STREAM_TYPES } from "@/lib/constants";
import { Loc, LocationField, Modal, isManager, useMe } from "@/components/ui";

function Player({ cam }: { cam: any }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (cam.stream_type !== "hls" || !cam.stream_url || !ref.current) return;
    const v = ref.current;
    let hls: any;
    setErr("");
    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = cam.stream_url;
    } else {
      import("hls.js").then(({ default: Hls }) => {
        if (!Hls.isSupported()) return setErr("Este navegador no reproduce HLS.");
        hls = new Hls();
        hls.on(Hls.Events.ERROR, (_: any, d: any) => d.fatal && setErr("No se pudo abrir la transmisión. Revisa la URL y que el servidor permita el acceso (CORS)."));
        hls.loadSource(cam.stream_url);
        hls.attachMedia(v);
      });
    }
    return () => hls?.destroy();
  }, [cam]);

  if (!cam.stream_url) return <div className="note">Esta cámara está registrada en el mapa, pero no tiene transmisión configurada.</div>;
  return (
    <div className="col">
      {cam.stream_type === "hls" && <video ref={ref} className="video" controls autoPlay muted playsInline />}
      {cam.stream_type === "mjpeg" && <img className="video" src={cam.stream_url} alt={cam.name} style={{ objectFit: "contain" }} />}
      {cam.stream_type === "iframe" && <iframe className="video" src={cam.stream_url} allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin" />}
      {err && <div className="err">{err}</div>}
    </div>
  );
}

const EMPTY = { name: "", stream_url: "", stream_type: "hls", active: true };

export default function Camaras() {
  const can = isManager(useMe());
  const { data: cams, refresh } = usePoll<any[]>("/api/cameras", 15000);
  const [view, setView] = useState<any | null>(null);
  const [edit, setEdit] = useState<any | null>(null);
  const [loc, setLoc] = useState<Loc>({ lat: null, lng: null, address: "", district: null });
  const [err, setErr] = useState("");

  function openEdit(c: any) {
    setErr("");
    setEdit(c.id ? { ...c, stream_url: c.stream_url ?? "" } : { ...EMPTY });
    setLoc({ lat: c.lat ?? null, lng: c.lng ?? null, address: c.address ?? "", district: c.district ?? null });
  }
  async function save() {
    setErr("");
    if (loc.lat == null) return setErr("Fija la ubicación en el mapa.");
    const body = { name: edit.name, stream_url: edit.stream_url || null, stream_type: edit.stream_type, active: edit.active, ...loc };
    try {
      await (edit.id ? api(`/api/cameras/${edit.id}`, "PATCH", body) : api("/api/cameras", "POST", body));
      await refresh();
      setEdit(null);
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <>
      <div className="top">
        <h1>Videovigilancia</h1>
        {can && <button className="btn primary right" onClick={() => openEdit({})}>+ Registrar cámara</button>}
      </div>
      <div className="page col">
        <div className="note">
          El sistema muestra transmisiones que ya estén publicadas por HTTPS (HLS, MJPEG o un visor web). Las cámaras IP con RTSP necesitan
          un servidor de video intermedio (por ejemplo MediaMTX) que las convierta a HLS.
        </div>
        <div className="card tablewrap">
          <table>
            <thead><tr><th>Cámara</th><th>Distrito</th><th>Dirección</th><th>Transmisión</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {(cams ?? []).map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td><td>{c.district || "—"}</td><td>{c.address || "—"}</td>
                  <td>{c.stream_url ? c.stream_type.toUpperCase() : "Sin configurar"}</td>
                  <td><span className={`badge ${c.active ? "disponible" : "fuera_servicio"}`}>{c.active ? "Activa" : "Inactiva"}</span></td>
                  <td className="row" style={{ justifyContent: "flex-end" }}>
                    <button className="btn sm" onClick={() => setView(c)}>Ver</button>
                    {can && <button className="btn sm" onClick={() => openEdit(c)}>Editar</button>}
                    {can && <button className="btn sm danger" onClick={async () => { if (confirm(`¿Eliminar ${c.name}?`)) { await api(`/api/cameras/${c.id}`, "DELETE").catch((e) => alert(e.message)); refresh(); } }}>Eliminar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cams && cams.length === 0 && <div className="muted" style={{ padding: 12 }}>Aún no hay cámaras registradas.</div>}
        </div>
      </div>
      {view && <Modal title={view.name} onClose={() => setView(null)}><Player cam={view} /></Modal>}
      {edit && (
        <Modal title={edit.id ? "Editar cámara" : "Registrar cámara"} onClose={() => setEdit(null)}>
          <form className="col" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <div><label>Nombre</label><input required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Ej. Cámara Av. Dolores cdra. 1" /></div>
            <LocationField value={loc} onChange={setLoc} />
            <div className="row">
              <div className="field" style={{ flex: 2 }}><label>URL de transmisión (https)</label><input value={edit.stream_url} onChange={(e) => setEdit({ ...edit, stream_url: e.target.value })} placeholder="https://…/stream.m3u8" /></div>
              <div className="field"><label>Formato</label><select value={edit.stream_type} onChange={(e) => setEdit({ ...edit, stream_type: e.target.value })}>{STREAM_TYPES.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}</select></div>
            </div>
            <label className="row"><input type="checkbox" style={{ width: "auto" }} checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Activa (se muestra en el mapa)</label>
            {err && <div className="err">{err}</div>}
            <button className="btn primary">Guardar</button>
          </form>
        </Modal>
      )}
    </>
  );
}
