"use client";
import { useEffect, useRef, useState } from "react";
import { api, usePoll } from "@/lib/client";
import { AGENCY_LABEL, PRIORITIES, STATUS_LABEL, UNIT_STATUS_LABEL, fmtTime } from "@/lib/constants";
import { logout } from "@/components/Shell";

// Modo unidad: lo abre el efectivo en su celular. Comparte el GPS real y actualiza el estado del incidente asignado.
export default function ModoUnidad() {
  const { data, refresh, error } = usePoll<any>("/api/unit/me", 5000);
  const [gps, setGps] = useState(false);
  const [gpsMsg, setGpsMsg] = useState("");
  const [err, setErr] = useState("");
  const [closing, setClosing] = useState(false);
  const [resolution, setResolution] = useState("");
  const last = useRef(0);
  const unitId = data?.unit?.id;

  useEffect(() => {
    if (!gps || !unitId) return;
    if (!navigator.geolocation) { setGpsMsg("Este dispositivo no tiene GPS disponible."); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        if (Date.now() - last.current < 8000) return; // como máximo un envío cada 8 s
        last.current = Date.now();
        api(`/api/units/${unitId}/position`, "POST", { lat: p.coords.latitude, lng: p.coords.longitude })
          .then(() => setGpsMsg(`Posición enviada ${fmtTime(new Date())} (±${Math.round(p.coords.accuracy)} m)`))
          .catch((e) => setGpsMsg(e.message));
      },
      (e) => setGpsMsg(e.code === 1 ? "Permiso de ubicación denegado. Actívalo en el navegador." : "No se pudo obtener la ubicación."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [gps, unitId]);

  async function act(body: any) {
    setErr("");
    try { await api(`/api/incidents/${data.incident.id}`, "PATCH", body); await refresh(); return true; }
    catch (e: any) { setErr(e.message); return false; }
  }

  if (!data) return <div className="center muted">{error || "Cargando…"}</div>;
  const { unit, incident: inc, user } = data;

  return (
    <div className="unitpage">
      <div className="row">
        <div className="brand" style={{ border: 0, padding: 0 }}><b>AREQUIPA <span>C5</span></b><small>Modo unidad · {user.name}</small></div>
        <button className="btn sm right" style={{ width: "auto", padding: "4px 10px", fontSize: 12 }} onClick={logout}>Salir</button>
      </div>
      {user.role !== "unidad" && <a className="note" href="/">← Volver a la consola</a>}
      {!unit ? (
        <div className="err">Tu usuario no tiene una unidad asignada. Pide al administrador que la vincule.</div>
      ) : (
        <>
          <div className="card row">
            <div className="grow"><div className="mono" style={{ fontSize: 18 }}>{unit.code}</div><div className="muted small">{AGENCY_LABEL[unit.agency]} · {unit.kind}</div></div>
            <span className={`badge ${unit.status}`}>{UNIT_STATUS_LABEL[unit.status]}</span>
          </div>
          <button className={`btn ${gps ? "ok" : "primary"}`} onClick={() => { setGps(!gps); setGpsMsg(""); }}>
            {gps ? "Compartiendo ubicación — tocar para detener" : "Compartir mi ubicación"}
          </button>
          {gpsMsg && <div className="note">{gpsMsg}</div>}
          {gps && <div className="muted small">Mantén esta pantalla abierta: el navegador deja de enviar la ubicación si se apaga la pantalla.</div>}

          {!inc ? (
            <div className="card muted">Sin incidente asignado. Esta pantalla se actualiza sola.</div>
          ) : (
            <div className="card col">
              <div className="row"><span className="mono">{inc.code}</span><span className={`badge ${inc.status}`}>{STATUS_LABEL[inc.status]}</span></div>
              <h1>{inc.type}</h1>
              <div className={`pr p${inc.priority}`}>Prioridad {PRIORITIES[inc.priority]}</div>
              <div>{inc.address || "Sin dirección"}{inc.district ? ` · ${inc.district}` : ""}</div>
              {inc.description && <div className="muted">{inc.description}</div>}
              {(inc.reporter_name || inc.reporter_phone) && (
                <div className="small">Informante: {inc.reporter_name} {inc.reporter_phone && <a href={`tel:${inc.reporter_phone}`} style={{ color: "var(--accent)" }}>{inc.reporter_phone}</a>}</div>
              )}
              <a className="btn" style={{ textAlign: "center" }} target="_blank" rel="noreferrer"
                href={`https://www.google.com/maps/dir/?api=1&destination=${inc.lat},${inc.lng}`}>Abrir ruta en Google Maps</a>
              {inc.status === "despachado" && <button className="btn primary" onClick={() => act({ action: "status", status: "en_camino" })}>Voy en camino</button>}
              {(inc.status === "despachado" || inc.status === "en_camino") && <button className="btn primary" onClick={() => act({ action: "status", status: "en_sitio" })}>Llegué al lugar</button>}
              {inc.status === "en_sitio" && !closing && <button className="btn ok" onClick={() => setClosing(true)}>Cerrar incidente</button>}
              {closing && (
                <>
                  <label>¿Cómo se resolvió?</label>
                  <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} />
                  <button className="btn primary" onClick={async () => { if (await act({ action: "status", status: "cerrado", resolution })) { setClosing(false); setResolution(""); } }}>Confirmar cierre</button>
                  <button className="btn" onClick={() => setClosing(false)}>Volver</button>
                </>
              )}
              {err && <div className="err">{err}</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
