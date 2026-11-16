"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { AGENCY_LABEL, CENTER, PRIORITIES, STATUS_LABEL, UNIT_STATUS_LABEL } from "@/lib/constants";

type P = {
  incidents?: any[];
  units?: any[];
  cameras?: any[];
  selectedId?: number | null;
  onSelectIncident?: (id: number) => void;
  onPick?: (lat: number, lng: number) => void; // si se define, el clic en el mapa elige un punto
  pick?: { lat: number; lng: number } | null;
  heat?: [number, number, number][];
  focus?: { lat: number; lng: number } | null;
  zoom?: number;
};

const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export default function MapView(p: P) {
  const el = useRef<HTMLDivElement>(null);
  const m = useRef<{ L: any; map: any; data: any; pick: any; heat: any } | null>(null);
  const cb = useRef(p);
  cb.current = p;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (dead || !el.current) return;
      const map = L.map(el.current, { center: [CENTER.lat, CENTER.lng], zoom: cb.current.zoom ?? 13, zoomControl: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      map.on("click", (e: any) => cb.current.onPick?.(e.latlng.lat, e.latlng.lng));
      m.current = { L, map, data: L.layerGroup().addTo(map), pick: L.layerGroup().addTo(map), heat: null };
      setReady(true);
      setTimeout(() => map.invalidateSize(), 50);
    })();
    return () => {
      dead = true;
      m.current?.map.remove();
      m.current = null;
    };
  }, []);

  // Marcadores
  useEffect(() => {
    const s = m.current;
    if (!ready || !s) return;
    const { L } = s;
    s.data.clearLayers();
    for (const c of p.cameras ?? []) {
      L.marker([c.lat, c.lng], { icon: L.divIcon({ className: "", html: '<div class="mk mk-cam">C</div>', iconSize: [18, 18] }), zIndexOffset: -200 })
        .bindTooltip(`Cámara: ${esc(c.name)}`)
        .addTo(s.data);
    }
    for (const u of p.units ?? []) {
      if (u.lat == null) continue;
      const stale = !u.position_at || Date.now() - new Date(u.position_at).getTime() > 5 * 60_000;
      L.marker([u.lat, u.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div class="mk mk-unit ${u.status === "fuera_servicio" ? "fuera_servicio" : u.agency} ${stale ? "stale" : ""}">${esc(u.agency[0])}</div>`,
          iconSize: [26, 20],
        }),
      })
        .bindTooltip(`${esc(u.code)} · ${AGENCY_LABEL[u.agency]} · ${UNIT_STATUS_LABEL[u.status]}${stale ? " · posición antigua" : ""}`)
        .addTo(s.data);
    }
    for (const i of p.incidents ?? []) {
      const mk = L.marker([i.lat, i.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div class="mk mk-inc p${i.priority} ${i.status} ${i.id === p.selectedId ? "sel" : ""}"><i>${i.priority}</i></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 24],
        }),
        zIndexOffset: i.id === p.selectedId ? 1000 : 500 - i.priority * 50,
      }).bindTooltip(`${esc(i.code)} · ${esc(i.type)} · ${PRIORITIES[i.priority]} · ${STATUS_LABEL[i.status]}`);
      mk.on("click", (e: any) => {
        L.DomEvent.stopPropagation(e);
        // En modo «elegir punto» el clic sobre un marcador también fija el punto.
        if (cb.current.onPick) cb.current.onPick(e.latlng.lat, e.latlng.lng);
        else cb.current.onSelectIncident?.(i.id);
      });
      mk.addTo(s.data);
    }
  }, [ready, p.incidents, p.units, p.cameras, p.selectedId]);

  // Punto elegido
  useEffect(() => {
    const s = m.current;
    if (!ready || !s) return;
    s.pick.clearLayers();
    if (p.pick) {
      s.L.marker([p.pick.lat, p.pick.lng], {
        icon: s.L.divIcon({ className: "", html: '<div class="mk mk-pick"></div>', iconSize: [18, 18] }),
        zIndexOffset: 2000,
      }).addTo(s.pick);
    }
  }, [ready, p.pick]);

  useEffect(() => {
    const s = m.current;
    if (ready && s && p.focus) s.map.setView([p.focus.lat, p.focus.lng], Math.max(s.map.getZoom(), 16), { animate: true });
  }, [ready, p.focus]);

  // Mapa de calor
  useEffect(() => {
    const s = m.current;
    if (!ready || !s || !p.heat) return;
    let dead = false;
    (async () => {
      (window as any).L = s.L;
      await import("leaflet.heat");
      if (dead || !m.current) return;
      if (s.heat) s.map.removeLayer(s.heat);
      s.heat = (s.L as any).heatLayer(p.heat, { radius: 28, blur: 22, minOpacity: 0.35 }).addTo(s.map);
    })();
    return () => {
      dead = true;
    };
  }, [ready, p.heat]);

  return <div ref={el} className={`map ${p.onPick ? "pick" : ""}`} />;
}
