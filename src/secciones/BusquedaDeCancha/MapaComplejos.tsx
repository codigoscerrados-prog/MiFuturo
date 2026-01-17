"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ✅ Fix: marcador visible en Next (Leaflet no resuelve rutas de iconos solo)
const ICON = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

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

export default function MapaComplejos({
    complejos,
    onDetalles,
    onReservar,
}: {
    complejos: ComplejoCard[];
    onDetalles: (c: ComplejoCard) => void;
    onReservar: (c: ComplejoCard) => void;
}) {
    // ✅ solo los complejos con coordenadas válidas
    const puntos = useMemo(() => {
        return (complejos || []).filter((c) => typeof c.latitud === "number" && typeof c.longitud === "number");
    }, [complejos]);

    // ✅ centro: primer complejo con coords o Lima por defecto
    const center = useMemo<[number, number]>(() => {
        const first = puntos[0];
        if (first && typeof first.latitud === "number" && typeof first.longitud === "number") {
            return [first.latitud, first.longitud];
        }
        return [-12.0464, -77.0428]; // Lima centro
    }, [puntos]);

    if (!puntos.length) return null;

    return (
        <div style={{ height: 420, width: "100%", borderRadius: 18, overflow: "hidden", marginBottom: 18 }}>
            <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {puntos.map((cx) => (
                    <Marker
                        key={cx.id}
                        position={[cx.latitud as number, cx.longitud as number]}
                        icon={ICON}
                    >
                        <Popup>
                            <div style={{ width: 220 }}>
                                {/* Foto */}
                                <div
                                    style={{
                                        position: "relative",
                                        width: "100%",
                                        height: 110,
                                        borderRadius: 12,
                                        overflow: "hidden",
                                        marginBottom: 10,
                                        background: "#111",
                                    }}
                                >
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

                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <strong style={{ fontSize: 14 }}>{cx.nombre}</strong>
                                    <span style={{ fontSize: 12, opacity: 0.8 }}>{cx.zona}</span>

                                    <span style={{ fontSize: 12 }}>
                                        <strong>Precio:</strong> S/ {cx.precioMin.toFixed(0)} – {cx.precioMax.toFixed(0)} /h
                                    </span>

                                    <span style={{ fontSize: 12 }}>
                                        <strong>Canchas:</strong> {cx.canchasCount}
                                    </span>

                                    {/* Chips */}
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                                        {cx.techada && <Chip>Techada</Chip>}
                                        {cx.iluminacion && <Chip>Iluminación</Chip>}
                                        {cx.vestuarios && <Chip>Vestuarios</Chip>}
                                        {cx.estacionamiento && <Chip>Estacionamiento</Chip>}
                                        {cx.cafeteria && <Chip>Cafetería</Chip>}
                                    </div>

                                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                        <button type="button" onClick={() => onReservar(cx)} style={btnPrimary}>
                                            Reservar
                                        </button>
                                        <button type="button" onClick={() => onDetalles(cx)} style={btn}>
                                            Detalles
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}

function Chip({ children }: { children: React.ReactNode }) {
    return (
        <span
            style={{
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,.15)",
                background: "rgba(0,0,0,.04)",
            }}
        >
            {children}
        </span>
    );
}

const btn: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,.18)",
    background: "white",
    cursor: "pointer",
    fontSize: 12,
};

const btnPrimary: React.CSSProperties = {
    ...btn,
    border: "1px solid rgba(0,0,0,.18)",
    background: "#111",
    color: "white",
};
