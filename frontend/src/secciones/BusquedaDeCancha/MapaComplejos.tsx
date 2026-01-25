"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LatLng } from "@/utils/hooks/useGeolocation";

// ✅ Fix: marcador visible en Next (Leaflet no resuelve rutas de iconos solo)
const ICON = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
const PRECIO_MAX_VISIBLE = 300;

type ComplejoCard = {
    id: number;
    nombre: string;
    zona: string;
    latitud: number | null;
    longitud: number | null;

    techada: boolean;
    iluminacion: boolean;
    vestuarios: boolean;
    estacionamiento: boolean;
    cafeteria: boolean;

    foto: string;

    precioMin: number;
    precioMax: number;
    canchasCount: number;

    propietarioPhone: string | null;
};

function numOrNull(v: unknown) {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

export default function MapaComplejos({
    complejos,
    onDetalles,
    onReservar,
    userPosition,
}: {
    complejos: ComplejoCard[];
    onDetalles: (c: ComplejoCard) => void;
    onReservar: (c: ComplejoCard) => void;
    userPosition?: LatLng | null;
}) {
    // ✅ solo los complejos con coordenadas válidas
    const puntos = useMemo(() => {
        return (complejos || []).filter((c) => numOrNull(c.latitud) !== null && numOrNull(c.longitud) !== null);
    }, [complejos]);

    // ✅ centro: primer complejo con coords o Lima por defecto
    const center = useMemo<[number, number]>(() => {
        if (userPosition) return [userPosition.lat, userPosition.lng];
        const first = puntos[0];
        const lat = numOrNull(first?.latitud);
        const lng = numOrNull(first?.longitud);
        if (lat != null && lng != null) return [lat, lng];
        return [-12.0464, -77.0428]; // Lima centro
    }, [puntos, userPosition]);

    const [map, setMap] = useState<L.Map | null>(null);

    useEffect(() => {
        if (!map) return;
        map.setView(center, map.getZoom());
    }, [center, map]);

    if (!puntos.length) return null;

    return (
        <div
            className="rounded-4 overflow-hidden shadow-sm"
            style={{
                height: 420,
                width: "100%",
                marginBottom: 0,
                position: "relative",
                zIndex: 1,
            }}
        >
            <MapContainer
                center={center}
                zoom={12}
                style={{ height: "100%", width: "100%", zIndex: 0 }}
                scrollWheelZoom={true}
                zoomControl={true}
                whenCreated={setMap}
            >
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {userPosition ? (
                    <CircleMarker
                        center={[userPosition.lat, userPosition.lng]}
                        pathOptions={{ color: "#0EA5E9", fillColor: "#0EA5E9" }}
                        radius={8}
                    >
                        <Popup>Tú estás aquí</Popup>
                    </CircleMarker>
                ) : null}

                {puntos.map((cx) => {
                    const lat = numOrNull(cx.latitud);
                    const lng = numOrNull(cx.longitud);
                    if (lat == null || lng == null) return null;
                    return (
                        <Marker key={cx.id} position={[lat, lng]} icon={ICON}>
                        <Popup>
                            <div className="d-flex flex-column gap-2" style={{ width: 230 }}>
                                {/* Foto */}
                                <div className="rounded-3 overflow-hidden" style={{ width: "100%", height: 110, background: "#111" }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={cx.foto || "/canchas/sintetico-marconi.avif"}
                                        alt={cx.nombre}
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        onError={(e) => {
                                            // fallback si la URL viene rota
                                            (e.currentTarget as HTMLImageElement).src = "/canchas/sintetico-marconi.avif";
                                        }}
                                    />
                                </div>

                                <div className="d-flex flex-column gap-1">
                                    <strong className="small">{cx.nombre}</strong>
                                    <span className="small text-body-secondary">{cx.zona}</span>

                                    <span className="small">
                                        <strong>Precio:</strong> S/{" "}
                                        {Math.min(cx.precioMin, Math.min(cx.precioMax, PRECIO_MAX_VISIBLE)).toFixed(0)} –{" "}
                                        {Math.min(cx.precioMax, PRECIO_MAX_VISIBLE).toFixed(0)} /h
                                    </span>

                                    <span className="small">
                                        <strong>Canchas:</strong> {cx.canchasCount}
                                    </span>

                                    {/* Chips */}
                                    <div className="d-flex flex-wrap gap-1 mt-1">
                                        {cx.techada && <Chip>Techada</Chip>}
                                        {cx.iluminacion && <Chip>Iluminación</Chip>}
                                        {cx.vestuarios && <Chip>Vestuarios</Chip>}
                                        {cx.estacionamiento && <Chip>Estacionamiento</Chip>}
                                        {cx.cafeteria && <Chip>Cafetería</Chip>}
                                    </div>

                                    <div className="d-flex gap-2 mt-2 flex-wrap">
                                        <button type="button" onClick={() => onReservar(cx)} className="btn btn-success btn-sm rounded-pill px-3">
                                            <i className="bi bi-whatsapp me-2" aria-hidden="true"></i>
                                            Reservar
                                        </button>
                                        <button type="button" onClick={() => onDetalles(cx)} className="btn btn-outline-secondary btn-sm rounded-pill px-3">
                                            <i className="bi bi-info-circle me-2" aria-hidden="true"></i>
                                            Detalles
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}

function Chip({ children }: { children: React.ReactNode }) {
    return <span className="badge text-bg-light border rounded-pill fw-semibold">{children}</span>;
}
