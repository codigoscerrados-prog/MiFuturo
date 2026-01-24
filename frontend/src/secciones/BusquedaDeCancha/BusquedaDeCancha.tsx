"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import styles from "./BusquedaDeCancha.module.css";
import dynamic from "next/dynamic";
import { mediaUrl } from "@/lib/api";

// ✅ Mapa (SSR off)
const MapaComplejos = dynamic(() => import("./MapaComplejos"), { ssr: false }) as any;

export type TipoCancha = "Fútbol 5" | "Fútbol 7" | "Fútbol 11";

export type FiltrosBusqueda = {
    departamento: string;
    provincia: string;
    distrito: string;
    tipo: TipoCancha | "Cualquiera";
    precioMax: number;
};

type CanchaApi = {
    id: number;
    nombre: string;
    distrito?: string | null;
    provincia?: string | null;
    departamento?: string | null;
    tipo: TipoCancha;
    pasto: "Sintético" | "Híbrido";
    precio_hora: number;
    rating: number;
    techada: boolean;
    iluminacion: boolean;
    vestuarios: boolean;
    estacionamiento: boolean;
    cafeteria: boolean;
    imagen_principal?: string | null;
    is_active: boolean;

    propietario_phone?: string | null;

    // ✅ vienen del COMPLEJO (backend)
    latitud?: number | null;
    longitud?: number | null;
    complejo_id?: number | null;
    complejo_nombre?: string | null;

    // ✅ recomendado desde backend (/canchas)
    complejo_foto_url?: string | null;
};

type ComplejoApi = {
    id: number;
    nombre: string;
    slug?: string | null;
    distrito?: string | null;
    provincia?: string | null;
    departamento?: string | null;
    latitud?: number | null;
    longitud?: number | null;
    techada: boolean;
    iluminacion: boolean;
    vestuarios: boolean;
    estacionamiento: boolean;
    cafeteria: boolean;
    foto_url?: string | null;
    is_active: boolean;
    owner_phone?: string | null;
    canchas: CanchaApi[];
};

type CanchaCard = {
    id: number;
    nombre: string;
    zona: string;
    distrito: string | null;
    provincia: string | null;
    departamento: string | null;
    tipo: TipoCancha;
    precioHora: number;

    techada: boolean;
    iluminacion: boolean;
    vestuarios: boolean;
    estacionamiento: boolean;
    cafeteria: boolean;

    pasto: "Sintético" | "Híbrido";
    rating: number;
    imagen: string;

    propietarioPhone: string | null;

    latitud: number | null;
    longitud: number | null;
    complejoId: number | null;
    complejoNombre: string | null;

    complejoFotoUrl: string | null;
    isActive: boolean;
};

type ComplejoCard = {
    id: number;
    nombre: string;
    slug: string;
    zona: string;
    distrito: string | null;
    provincia: string | null;
    departamento: string | null;

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
    verificado: boolean;

    propietarioPhone: string | null;
    canchas: CanchaCard[];
};

const FALLBACK_IMG = "/canchas/sintetico-marconi.avif";

function normalizarTexto(v?: string | null) {
    return (v || "").toLowerCase().trim();
}

function numOrNull(v: unknown) {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function ratingFake(id: number) {
    const base = 4.4;
    const add = (id % 6) * 0.1;
    return Math.min(5, +(base + add).toFixed(1));
}

function normalizarTelefonoWhatsApp(raw: string | null | undefined) {
    const t = (raw || "").trim();
    if (!t) return null;

    const digits = t.replace(/[^\d]/g, "");
    if (!digits) return null;

    // Perú (9 dígitos que empiezan con 9) -> +51
    if (digits.length === 9 && digits.startsWith("9")) return `51${digits}`;

    // Si ya viene con país o largo
    if (digits.length >= 10) return digits;

    return null;
}

function buildWhatsAppUrl(phone: string, message: string) {
    const encoded = encodeURIComponent(message);
    return `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`;
}

function formatoFechaHumana(fechaISO: string) {
    try {
        const d = new Date(`${fechaISO}T00:00:00`);
        const txt = d.toLocaleDateString("es-PE", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "2-digit",
        });
        return txt.charAt(0).toUpperCase() + txt.slice(1);
    } catch {
        return fechaISO;
    }
}

function formatDuracion(duracionHoras: number) {
    if (!duracionHoras || duracionHoras <= 0) return "";
    return duracionHoras === 1 ? "1 hora" : `${duracionHoras} horas`;
}

function construirMensajeWhatsApp(c: CanchaCard, fechaISO: string, hora: string, duracionHoras: number) {
    const wave = "\uD83D\uDC4B";
    const sparkles = "\u2728";
    const soccer = "\u26BD";
    const stadium = "\uD83C\uDFDF\uFE0F";
    const pin = "\uD83D\uDCCD";
    const target = "\uD83C\uDFAF";
    const money = "\uD83D\uDCB8";
    const check = "\u2705";
    const fire = "\uD83D\uDD25";
    const thanks = "\uD83D\uDE4F";

    const lugar = [c.distrito, c.provincia, c.departamento].filter(Boolean).join(", ");

    const fechaHumana = formatoFechaHumana(fechaISO);
    const duracionTxt = formatDuracion(duracionHoras);

    return (
        `${wave} Hola! Quisiera reservar una cancha.\n\n` +
        `${stadium} Complejo: *${c.zona}*\n` +
        `${soccer} Cancha: *${c.nombre}* (${c.tipo}, ${c.pasto})\n` +
        `${pin} Ubicación: *${lugar || "—"}*\n` +
        `${target} Fecha: *${fechaHumana}*\n` +
        `${target} Hora: *${hora}*\n` +
        (duracionTxt ? `${target} Duracion: *${duracionTxt}*\n` : "") +
        `${money} Precio: *S/ ${c.precioHora.toFixed(0)} /h*\n\n` +
        `${check} ¿Está disponible? ${sparkles}\n\n` +
        `${fire} Gracias! ${thanks}`
    );
}

function construirMensajeWhatsAppEstandar(complejo: ComplejoCard, fechaISO: string, hora: string, duracionHoras: number) {
    const wave = "\uD83D\uDC4B";
    const sparkles = "\u2728";
    const stadium = "\uD83C\uDFDF\uFE0F";
    const pin = "\uD83D\uDCCD";
    const target = "\uD83C\uDFAF";
    const money = "\uD83D\uDCB8";
    const check = "\u2705";
    const fire = "\uD83D\uDD25";
    const thanks = "\uD83D\uDE4F";

    const lugar = [complejo.distrito, complejo.provincia, complejo.departamento].filter(Boolean).join(", ");
    const fechaHumana = formatoFechaHumana(fechaISO);
    const duracionTxt = formatDuracion(duracionHoras);
    const tienePrecio = complejo.canchasCount > 0;
    const precio = tienePrecio
        ? `S/ ${complejo.precioMin.toFixed(0)} - ${complejo.precioMax.toFixed(0)} /h`
        : "";

    return (
        `${wave} Hola! Quisiera reservar.\n\n` +
        `${stadium} Complejo: *${complejo.nombre}*\n` +
        `${pin} Ubicación: *${lugar || "-"}*\n` +
        (precio ? `${money} Precio: *${precio}*\n\n` : "\n") +
        `${target} Fecha: *${fechaHumana}*\n` +
        `${target} Hora: *${hora}*\n` +
        (duracionTxt ? `${target} Duracion: *${duracionTxt}*\n\n` : "\n") +
        `${check} ¿Está disponible? ${sparkles}\n\n` +
        `${fire} Gracias! ${thanks}`
    );
}

function moneyPE(n: number) {
    try {
        return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n);
    } catch {
        return `S/ ${n.toFixed(0)}`;
    }
}

function mapComplejosFromApi(complejos: ComplejoApi[], fallbackImg: string): ComplejoCard[] {
    return (complejos || [])
        .map((cx) => {
            const distrito = (cx.distrito || "").trim();
            const provincia = (cx.provincia || "").trim();
            const departamento = (cx.departamento || "").trim();
            const zona = [distrito, provincia].filter(Boolean).join(", ") || "—";

        const foto = mediaUrl(cx.foto_url, fallbackImg, { forceProxy: true }) ?? fallbackImg;

            let precioMin = 0;
            let precioMax = 0;
            let tienePrecio = false;

            const canchas: CanchaCard[] = (cx.canchas || []).map((c) => {
                const precio = typeof c.precio_hora === "number" ? c.precio_hora : 0;
                if (typeof c.precio_hora === "number") {
                    precioMin = tienePrecio ? Math.min(precioMin, precio) : precio;
                    precioMax = tienePrecio ? Math.max(precioMax, precio) : precio;
                    tienePrecio = true;
                }

                const imagen = mediaUrl(c.imagen_principal, fallbackImg, { forceProxy: true }) ?? fallbackImg;
                const complejoFoto = mediaUrl(c.complejo_foto_url, null, { forceProxy: true });

                const dist = (c.distrito || cx.distrito || "").trim();
                const prov = (c.provincia || cx.provincia || "").trim();
                const dep = (c.departamento || cx.departamento || "").trim();

                return {
                    id: c.id,
                    nombre: c.nombre,
                    zona: cx.nombre,
                    distrito: dist || null,
                    provincia: prov || null,
                    departamento: dep || null,
                    tipo: c.tipo,
                    precioHora: precio,
                    techada: !!c.techada,
                    iluminacion: !!c.iluminacion,
                    vestuarios: !!c.vestuarios,
                    estacionamiento: !!c.estacionamiento,
                    cafeteria: !!c.cafeteria,
                    pasto: c.pasto,
                    rating: typeof c.rating === "number" ? c.rating : ratingFake(c.id),
                    imagen,
                    propietarioPhone: c.propietario_phone ?? cx.owner_phone ?? null,
                    latitud: typeof cx.latitud === "number" ? cx.latitud : null,
                    longitud: typeof cx.longitud === "number" ? cx.longitud : null,
                    complejoId: cx.id,
                    complejoNombre: cx.nombre,
                    complejoFotoUrl: complejoFoto,
                    isActive: !!c.is_active,
                };
            });

            if (!tienePrecio) {
                precioMin = 0;
                precioMax = 0;
            }

            const verificado = canchas.some((c) => c.isActive);

            return {
                id: cx.id,
                nombre: cx.nombre,
                slug: cx.slug || "",
                zona,
                distrito: distrito || null,
                provincia: provincia || null,
                departamento: departamento || null,
                latitud: numOrNull(cx.latitud),
                longitud: numOrNull(cx.longitud),
                techada: !!cx.techada,
                iluminacion: !!cx.iluminacion,
                vestuarios: !!cx.vestuarios,
                estacionamiento: !!cx.estacionamiento,
                cafeteria: !!cx.cafeteria,
                foto,
                precioMin,
                precioMax,
                canchasCount: canchas.length,
                verificado,
                propietarioPhone: cx.owner_phone ?? null,
                canchas,
            };
        })
        .sort((a, b) => {
            const aVal = a.canchasCount ? a.precioMin : Number.MAX_SAFE_INTEGER;
            const bVal = b.canchasCount ? b.precioMin : Number.MAX_SAFE_INTEGER;
            return aVal - bVal;
        });
}

export default function BusquedaDeCancha({
    filtros,
    mostrando,
    modo = "home",
    accion,
    complejoId,
}: {
    filtros: FiltrosBusqueda;
    mostrando: boolean;
    modo?: "home" | "pagina";
    accion?: "detalles" | "reservar" | null;
    complejoId?: number | null;
}) {
    const POR_PAGINA = 9;
    const PRECIO_MAX_VISIBLE = 300;

    const esPagina = modo === "pagina";
    const esPagina = modo === "pagina";

    const [complejosDb, setComplejosDb] = useState<ComplejoCard[]>([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");

    // ✅ Modal reserva (por complejo, eligiendo cancha)
    const [reservaOpen, setReservaOpen] = useState(false);
    const [reservaComplejo, setReservaComplejo] = useState<ComplejoCard | null>(null);
    const [reservaCanchaId, setReservaCanchaId] = useState<number | null>(null);
    const [reservaFecha, setReservaFecha] = useState("");
    const [reservaHora, setReservaHora] = useState("");
    const [reservaDuracion, setReservaDuracion] = useState(1);
    const [reservaError, setReservaError] = useState<string | null>(null);

    // ✅ Modal detalle (COMPLEJO)
    const [detalleOpen, setDetalleOpen] = useState(false);
    const [detalleComplejo, setDetalleComplejo] = useState<ComplejoCard | null>(null);

    const modalAbierto = reservaOpen || detalleOpen;

    // ✅ bloquear scroll + cerrar con ESC
    useEffect(() => {
        if (!modalAbierto) return;

        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setReservaOpen(false);
                setDetalleOpen(false);

                setReservaComplejo(null);
                setReservaCanchaId(null);

                setDetalleComplejo(null);
                setReservaError(null);
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [modalAbierto]);

    // ✅ cargar canchas
    useEffect(() => {
        const ac = new AbortController();

        async function load() {
            setCargando(true);
            setError("");
            try {
            const res = await fetch("/api/complejos", {
                signal: ac.signal,
                cache: "no-store",
            });
            if (!res.ok) throw new Error(`Error ${res.status} al cargar complejos`);
            const data: ComplejoApi[] = await res.json();
            setComplejosDb(mapComplejosFromApi(data, FALLBACK_IMG));
        } catch (e: any) {
                if (e?.name === "AbortError") return;
                setError(e?.message || "Error al cargar complejos");
            } finally {
                setCargando(false);
            }
        }

        load();
        return () => ac.abort();
    }, []);

    // ✅ filtros (por complejo)
    const resultados = useMemo(() => {
        let arr = [...complejosDb];

        if (mostrando) {
            const dep = normalizarTexto(filtros.departamento);
            const prov = normalizarTexto(filtros.provincia);
            const dist = normalizarTexto(filtros.distrito);

            if (dep && dep !== "cualquiera") {
                arr = arr.filter((c) => normalizarTexto(c.departamento) === dep);
            }
            if (prov && prov !== "cualquiera") {
                arr = arr.filter((c) => normalizarTexto(c.provincia) === prov);
            }
            if (dist && dist !== "cualquiera") {
                arr = arr.filter((c) => normalizarTexto(c.distrito) === dist);
            }

            arr = arr.filter((c) => {
                if (c.canchasCount === 0) return true;

                const cumpleTipo =
                    !filtros.tipo || filtros.tipo === "Cualquiera" || c.canchas.some((x) => x.tipo === filtros.tipo);
                const cumplePrecio = c.canchas.some((x) => x.precioHora <= filtros.precioMax);
                return cumpleTipo && cumplePrecio;
            });
        }

        // orden por precio mínimo (sin canchas al final)
        arr.sort((a, b) => {
            const aVal = a.canchasCount ? a.precioMin : Number.MAX_SAFE_INTEGER;
            const bVal = b.canchasCount ? b.precioMin : Number.MAX_SAFE_INTEGER;
            return aVal - bVal;
        });

        // destacadas: 6
        return mostrando ? arr : arr.slice(0, 6);
    }, [complejosDb, filtros, mostrando]);

    const complejosFiltrados = resultados;
    const totalResultados = complejosFiltrados.length;

    // ✅ paginación por complejos (6 cards)
    const [paginaActual, setPagina] = useState(1);
    const [accionAplicada, setAccionAplicada] = useState<string | null>(null);

    // reset cuando cambian filtros
    useEffect(() => {
        setPagina(1);
    }, [mostrando, filtros.departamento, filtros.provincia, filtros.distrito, filtros.tipo, filtros.precioMax]);

    useEffect(() => {
        if (!accion || !complejoId || complejosFiltrados.length === 0) return;
        const token = `${accion}-${complejoId}`;
        if (accionAplicada === token) return;

        const complejo = complejosFiltrados.find((c) => c.id === complejoId);
        if (!complejo) return;

        if (accion === "detalles") {
            abrirModalDetalleComplejo(complejo);
        } else if (accion === "reservar") {
            abrirModalReservaComplejo(complejo);
        }

        setAccionAplicada(token);
    }, [accion, complejoId, complejosFiltrados, accionAplicada]);

    const totalPaginas = useMemo(() => {
        return Math.max(1, Math.ceil(complejosFiltrados.length / POR_PAGINA));
    }, [complejosFiltrados.length]);

    const complejosPagina = useMemo(() => {
        const start = (paginaActual - 1) * POR_PAGINA;
        return complejosFiltrados.slice(start, start + POR_PAGINA);
    }, [complejosFiltrados, paginaActual]);

    // ✅ mostrar mapa solo en desktop y si hay coords
    const mostrarMapa = useMemo(() => {
        const hasCoords = complejosFiltrados.some((c) => typeof c.latitud === "number" && typeof c.longitud === "number");
        if (!hasCoords) return false;
        if (typeof window === "undefined") return false;
        return window.innerWidth >= 1024;
    }, [complejosFiltrados]);

    const mapaNode = mostrarMapa ? (
        <div className={styles.mapOnlyDesktop}>
            <div className={`card border-0 shadow-sm rounded-4 overflow-hidden ${styles.mapWrap}`}>
                <div className="p-2 p-md-3">
                    <MapaComplejos
                        complejos={complejosFiltrados}
                        onDetalles={(c: ComplejoCard) => abrirModalDetalleComplejo(c)}
                        onReservar={(c: ComplejoCard) => abrirModalReservaComplejo(c)}
                    />
                </div>
            </div>
        </div>
    ) : null;

    const listadoNode = (
        <>
                        <div className={`row g-3 ${styles.grid}`}>
                {complejosPagina.map((cx) => {
                    const tienePrecio = cx.canchasCount > 0;
                    const precioMaxVal = tienePrecio ? Math.min(cx.precioMax, PRECIO_MAX_VISIBLE) : 0;
                    const precioMinVal = tienePrecio ? Math.min(cx.precioMin, precioMaxVal) : 0;
                    const precioMax = tienePrecio ? `S/ ${precioMaxVal.toFixed(0)}` : "S/ --";
                    const precioRango = tienePrecio ? `S/ ${precioMinVal.toFixed(0)} - ${precioMaxVal.toFixed(0)}` : "S/ --";

                    return (
                        <div key={cx.id} className="col-12 col-md-6 col-xl-4">
                            <article className={`card h-100 border-0 rounded-4 overflow-hidden ${styles.card}`}>
                                <div className={styles.media}>
                                    <Image
                                        src={cx.foto || FALLBACK_IMG}
                                        alt={`Foto ${cx.nombre}`}
                                        fill
                                        className={styles.mediaImg}
                                        sizes="(max-width: 900px) 100vw, 340px"
                                        unoptimized
                                    />
                                    <div className={styles.mediaOverlay} />
                                    <div className={styles.mediaChips}>
                                        <span className={`badge rounded-pill ${styles.disponible} ${cx.verificado ? styles.estadoOk : styles.estadoBase}`}>
                                            <i className={`bi ${cx.verificado ? "bi-shield-check" : "bi-shield"} me-1`} aria-hidden="true"></i>
                                            {cx.verificado ? "Verificado" : "Estandar"}
                                        </span>
                                        {cx.verificado && (
                                            <span className={`badge rounded-pill ${styles.rating}`}>
                                                <i className="bi bi-cash-coin me-1" aria-hidden="true"></i>
                                                {precioMax}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className={`card-body p-3 d-flex flex-column ${styles.body}`}>
                                    <h3 className={`h5 mb-1 ${styles.nombre}`}>{cx.nombre}</h3>
                                    <p className={`mb-2 ${styles.meta}`}>
                                        <i className="bi bi-geo me-1" aria-hidden="true"></i>
                                        {cx.zona} ? {cx.canchasCount} cancha(s)
                                    </p>

                                    <div className={styles.caracts}>
                                        {cx.techada && <span className={`badge rounded-pill ${styles.chip}`}>Techada</span>}
                                        {cx.iluminacion && <span className={`badge rounded-pill ${styles.chip}`}>Iluminacion</span>}
                                        {cx.vestuarios && <span className={`badge rounded-pill ${styles.chip}`}>Vestuarios</span>}
                                        {cx.estacionamiento && <span className={`badge rounded-pill ${styles.chip}`}>Estacionamiento</span>}
                                        {cx.cafeteria && <span className={`badge rounded-pill ${styles.chip}`}>Cafeteria</span>}
                                    </div>

                                    <div className={`mt-auto d-flex align-items-center justify-content-between flex-wrap gap-2 ${styles.footerCard}`}>
                                        {cx.verificado && <div className={styles.precio}>{precioRango} /h</div>}
                                        <div className={`d-flex gap-2 flex-wrap ${styles.botones}`}>
                                            <button
                                                className="btn btn-success btn-sm rounded-pill px-3"
                                                type="button"
                                                onClick={() => abrirModalReservaComplejo(cx)}
                                                disabled={cx.verificado && cx.canchasCount == 0}
                                            >
                                                <i className="bi bi-whatsapp me-2" aria-hidden="true"></i>
                                                Reservar por WhatsApp
                                            </button>
                                            <button
                                                className="btn btn-outline-secondary btn-sm rounded-pill px-3"
                                                type="button"
                                                onClick={() => abrirModalDetalleComplejo(cx)}
                                            >
                                                <i className="bi bi-info-circle me-2" aria-hidden="true"></i>
                                                Ver perfil
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        </div>
                    );
                })}
            </div>
{totalPaginas > 1 && (
                <div className={`d-flex flex-column gap-2 mt-3 ${styles.paginacion}`}>
                    <div className={`d-flex align-items-center justify-content-between flex-wrap gap-2 ${styles.paginacionBotones}`}>
                        <div className={styles.paginacionInfo}>
                            PÇ­gina <strong>{paginaActual}</strong> de <strong>{totalPaginas}</strong>
                        </div>

                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                className={`btn btn-outline-secondary btn-sm rounded-pill ${styles.pagBtn}`}
                                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                                disabled={paginaActual === 1}
                            >
                                ƒÅ? Anterior
                            </button>

                            <button
                                type="button"
                                className={`btn btn-outline-secondary btn-sm rounded-pill ${styles.pagBtn}`}
                                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                                disabled={paginaActual === totalPaginas}
                            >
                                Siguiente ƒÅ'
                            </button>
                        </div>
                    </div>

                    <div className={`d-flex flex-wrap gap-2 ${styles.pagNumeros}`} aria-label="PÇ­ginas">
                        {Array.from({ length: totalPaginas }).map((_, i) => {
                            const n = i + 1;
                            const activo = n === paginaActual;
                            return (
                                <button
                                    key={n}
                                    type="button"
                                    className={`btn btn-sm rounded-pill ${activo ? "btn-primary" : "btn-light"} ${styles.pagNum} ${
                                        activo ? styles.pagNumActivo : ""
                                    }`}
                                    onClick={() => setPagina(n)}
                                    aria-current={activo ? "page" : undefined}
                                >
                                    {n}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );

    // ✅ MODAL DETALLE
    function abrirModalDetalleComplejo(cx: ComplejoCard) {
        if (cx.slug) {
            window.location.href = `/${cx.slug}`;
            return;
        }
        setDetalleComplejo(cx);
        setDetalleOpen(true);
    }
    function cerrarModalDetalle() {
        setDetalleOpen(false);
        setDetalleComplejo(null);
    }

    // ✅ MODAL RESERVA
    function abrirModalReservaComplejo(cx: ComplejoCard) {
        setReservaComplejo(cx);
        setReservaOpen(true);
        setReservaError(null);

        // defaults
        const first = cx.canchas[0];
        setReservaCanchaId(cx.verificado ? (first?.id ?? null) : null);

        const today = new Date();
        const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        setReservaFecha(iso);
        setReservaHora("19:00");
        setReservaDuracion(1);
    }
    function cerrarModalReserva() {
        setReservaOpen(false);
        setReservaComplejo(null);
        setReservaCanchaId(null);
        setReservaError(null);
    }

    function confirmarReservaWhatsApp() {
        if (!reservaComplejo) return;

        const esEstandar = !reservaComplejo.verificado;
        let cancha: CanchaCard | null = null;

        if (!esEstandar) {
            cancha = reservaComplejo.canchas.find((c) => c.id === reservaCanchaId) || reservaComplejo.canchas[0] || null;
            if (!cancha) {
                setReservaError("No se encontró la cancha seleccionada.");
                return;
            }
        }
        if (!reservaFecha) {
            setReservaError("Selecciona una fecha.");
            return;
        }
        if (!reservaHora) {
            setReservaError("Selecciona una hora.");
            return;
        }

        const phone = normalizarTelefonoWhatsApp(reservaComplejo.propietarioPhone);
        if (!phone) {
            setReservaError("Este complejo no tiene WhatsApp configurado.");
            return;
        }

        const msg = esEstandar
            ? construirMensajeWhatsAppEstandar(reservaComplejo, reservaFecha, reservaHora, reservaDuracion)
            : construirMensajeWhatsApp(cancha as CanchaCard, reservaFecha, reservaHora, reservaDuracion);
        const url = buildWhatsAppUrl(phone, msg);
        window.open(url, "_blank", "noopener,noreferrer");
        cerrarModalReserva();
    }

    return (
        <section id="busqueda-de-cancha" className={styles.seccion}>
            <div className="container-xl">
                <div className={`d-flex align-items-start justify-content-between flex-wrap gap-2 ${styles.cabecera}`}>
                    <div className="pe-1">
                        <h2 className={styles.titulo}>
                            <i className={`bi ${mostrando ? "bi-funnel-fill" : "bi-compass"} me-2`} aria-hidden="true"></i>
                            {mostrando ? "Resultados para tu búsqueda" : "Complejos destacados"}
                        </h2>
                        <p className={styles.subtitulo}>
                            {mostrando ? "Filtramos las mejores opciones para ti." : "Descubre complejos recomendados y empieza a reservar."}
                        </p>
                    </div>

                    {mostrando && (
                        <div className={`d-flex flex-wrap gap-2 justify-content-end ${styles.resumen}`}>
                            <span className={styles.tag}>
                                <i className="bi bi-geo-alt me-1" aria-hidden="true"></i>
                                Departamento: {filtros.departamento}
                            </span>
                            <span className={styles.tag}>
                                <i className="bi bi-pin-map me-1" aria-hidden="true"></i>
                                Provincia: {filtros.provincia}
                            </span>
                            <span className={styles.tag}>
                                <i className="bi bi-signpost me-1" aria-hidden="true"></i>
                                Distrito: {filtros.distrito}
                            </span>
                            <span className={styles.tag}>
                                <i className="bi bi-grid-3x3-gap me-1" aria-hidden="true"></i>
                                Tipo: {filtros.tipo}
                            </span>
                            <span className={styles.tag}>
                                <i className="bi bi-cash-coin me-1" aria-hidden="true"></i>
                                Máx: S/ {filtros.precioMax}
                            </span>
                        </div>
                    )}
                </div>

                {mostrando && esPagina && (
                    <div className={styles.contador} aria-live="polite">
                        <span className={styles.contadorNumero}>{totalResultados}</span>
                        <span className={styles.contadorTexto}>complejos encontrados</span>
                    </div>
                )}

                {error && (
                    <div className={`alert alert-danger d-flex align-items-start gap-2 rounded-4 ${styles.placeholder}`} role="status">
                        <i className="bi bi-exclamation-triangle-fill mt-1" aria-hidden="true"></i>
                        <span>{error}</span>
                    </div>
                )}

                {cargando ? (
                    <div className="card border-0 shadow-sm rounded-4 p-4">
                        <div className="d-flex align-items-center gap-2">
                            <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                            <span>Cargando...</span>
                        </div>
                    </div>
                ) : resultados.length === 0 ? (
                    <div className={`alert alert-light border rounded-4 ${styles.placeholder}`}>No se encontraron complejos con esos filtros.</div>
                ) : esPagina && mapaNode ? (
                    <div className={styles.layout}>
                        <div className={styles.colLista}>{listadoNode}</div>
                        <aside className={styles.colMapa}>{mapaNode}</aside>
                    </div>
                ) : (
                    <>
                        {mapaNode}
                        {listadoNode}
                    </>
                )}
            </div>

            {/* ✅ MODAL DETALLE COMPLEJO */}
            {detalleOpen && detalleComplejo && (
                <div
                    className={styles.modalOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Detalle de complejo"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) cerrarModalDetalle();
                    }}
                >
                    <div className={`card border-0 shadow-lg ${styles.modalCard}`}>
                        <div className={`d-flex gap-3 justify-content-between align-items-start ${styles.modalHeader}`}>
                            <div>
                                <p className={styles.modalKicker}>Detalles del complejo</p>
                                <h3 className={styles.modalTitle}>{detalleComplejo.nombre}</h3>
                                <p className={styles.modalSub}>
                                    {detalleComplejo.zona} • {detalleComplejo.canchasCount} cancha(s) • S/{" "}
                                    {Math.min(detalleComplejo.precioMin, Math.min(detalleComplejo.precioMax, PRECIO_MAX_VISIBLE)).toFixed(0)} –{" "}
                                    {Math.min(detalleComplejo.precioMax, PRECIO_MAX_VISIBLE).toFixed(0)} /h
                                </p>
                            </div>

                            <button className={`btn btn-sm btn-light border ${styles.modalClose}`} type="button" onClick={cerrarModalDetalle} aria-label="Cerrar">
                                ✕
                            </button>
                        </div>

                        <div className={styles.detalleWrap}>
                            <div className={styles.detalleMedia}>
                                <Image
                                    src={detalleComplejo.foto}
                                    alt={`Foto ${detalleComplejo.nombre}`}
                                    fill
                                    className={styles.detalleImg}
                                    sizes="(max-width: 900px) 100vw, 560px"
                                    unoptimized
                                />
                                <div className={styles.detalleBadgeRow}>
                                    <span className={styles.detalleBadgeStrong}>
                                        S/ {Math.min(detalleComplejo.precioMin, Math.min(detalleComplejo.precioMax, PRECIO_MAX_VISIBLE)).toFixed(0)} –{" "}
                                        {Math.min(detalleComplejo.precioMax, PRECIO_MAX_VISIBLE).toFixed(0)} /h
                                    </span>
                                </div>
                            </div>

                            <div className={styles.detalleGrid}>
                                <div className={styles.detalleBox}>
                                    <p className={styles.detalleLabel}>Características</p>
                                    <div className={styles.detalleChips}>
                                        {detalleComplejo.techada && <span className={`badge rounded-pill ${styles.chip}`}>Techada</span>}
                                        {detalleComplejo.iluminacion && <span className={`badge rounded-pill ${styles.chip}`}>Iluminación</span>}
                                        {detalleComplejo.vestuarios && <span className={`badge rounded-pill ${styles.chip}`}>Vestuarios</span>}
                                        {detalleComplejo.estacionamiento && <span className={`badge rounded-pill ${styles.chip}`}>Estacionamiento</span>}
                                        {detalleComplejo.cafeteria && <span className={`badge rounded-pill ${styles.chip}`}>Cafetería</span>}
                                        {!detalleComplejo.techada &&
                                            !detalleComplejo.iluminacion &&
                                            !detalleComplejo.vestuarios &&
                                            !detalleComplejo.estacionamiento &&
                                            !detalleComplejo.cafeteria && <span className={styles.detalleMuted}>No hay características marcadas.</span>}
                                    </div>
                                </div>

                                <div className={styles.detalleBox}>
                                    <p className={styles.detalleLabel}>Canchas del complejo</p>
                                    <ul className={styles.detalleList}>
                                        {detalleComplejo.canchas.map((c) => (
                                            <li key={c.id}>
                                                <span>
                                                    {c.nombre} • {c.tipo} • {c.pasto}
                                                </span>
                                                <strong>{moneyPE(c.precioHora)}</strong>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className={`d-flex justify-content-end gap-2 flex-wrap ${styles.modalBtns}`}>
                            <button className="btn btn-outline-secondary rounded-pill px-3" type="button" onClick={cerrarModalDetalle}>
                                Cerrar
                            </button>
                            <button
                                className="btn btn-success rounded-pill px-3"
                                type="button"
                                onClick={() => abrirModalReservaComplejo(detalleComplejo)}
                            >
                                <i className="bi bi-whatsapp me-2" aria-hidden="true"></i>
                                Reservar por WhatsApp
                            </button>
                        </div>

                        <p className={styles.modalTiny}>Tip: presiona ESC o haz click fuera para cerrar.</p>
                    </div>
                </div>
            )}

            {/* ✅ MODAL RESERVA (elige CANCHA dentro del COMPLEJO) */}
            {reservaOpen && reservaComplejo && (
                <div
                    className={styles.modalOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Reservar por WhatsApp"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) cerrarModalReserva();
                    }}
                >
                    <div className={`card border-0 shadow-lg ${styles.modalCard}`}>
                        <div className={`d-flex gap-3 justify-content-between align-items-start ${styles.modalHeader}`}>
                            <div>
                                <p className={styles.modalKicker}>Reservar por WhatsApp</p>
                                <h3 className={styles.modalTitle}>{reservaComplejo.nombre}</h3>
                                <p className={styles.modalSub}>
                                    {reservaComplejo.verificado
                                        ? "Elige la cancha, fecha y hora. Se enviará en el mensaje al propietario."
                                        : "Elige fecha y hora. Se enviará en el mensaje al propietario."}
                                </p>
                            </div>

                            <button className={`btn btn-sm btn-light border ${styles.modalClose}`} type="button" onClick={cerrarModalReserva} aria-label="Cerrar">
                                ✕
                            </button>
                        </div>

                        {reservaError ? (
                            <div className={`alert alert-danger d-flex align-items-start gap-2 rounded-4 ${styles.modalError}`}>
                                <i className="bi bi-exclamation-triangle-fill mt-1" aria-hidden="true"></i>
                                <span>{reservaError}</span>
                            </div>
                        ) : null}

                        <div className={styles.modalGrid}>
                            {reservaComplejo.verificado && (
                                <label className={styles.modalField}>
                                    <span className={styles.modalLabel}>
                                        <i className="bi bi-grid-3x3-gap me-2" aria-hidden="true"></i>
                                        Cancha
                                    </span>
                                    <select
                                        className="form-select form-select-sm rounded-3"
                                        value={String(reservaCanchaId ?? "")}
                                        onChange={(e) => setReservaCanchaId(Number(e.target.value))}
                                    >
                                        {reservaComplejo.canchas.map((c) => (
                                            <option key={c.id} value={String(c.id)}>
                                                {c.nombre} • {c.tipo} • {moneyPE(c.precioHora)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}

                            <label className={styles.modalField}>
                                <span className={styles.modalLabel}>
                                    <i className="bi bi-calendar-event me-2" aria-hidden="true"></i>
                                    Fecha
                                </span>
                                <input
                                    className="form-control form-control-sm rounded-3"
                                    type="date"
                                    value={reservaFecha}
                                    onChange={(e) => setReservaFecha(e.target.value)}
                                />
                            </label>

                            <label className={styles.modalField}>
                                <span className={styles.modalLabel}>
                                    <i className="bi bi-clock me-2" aria-hidden="true"></i>
                                    Hora
                                </span>
                                <input
                                    className="form-control form-control-sm rounded-3"
                                    type="time"
                                    value={reservaHora}
                                    onChange={(e) => setReservaHora(e.target.value)}
                                />
                            </label>

                            <label className={styles.modalField}>
                                <span className={styles.modalLabel}>
                                    <i className="bi bi-hourglass-split me-2" aria-hidden="true"></i>
                                    Duracion
                                </span>
                                <select
                                    className="form-select form-select-sm rounded-3"
                                    value={reservaDuracion}
                                    onChange={(e) => setReservaDuracion(Number(e.target.value))}
                                >
                                    <option value="1">1 hora</option>
                                    <option value="2">2 horas</option>
                                    <option value="3">3 horas</option>
                                    <option value="4">4 horas</option>
                                </select>
                            </label>
                        </div>

                        <div className={`d-flex justify-content-end gap-2 flex-wrap ${styles.modalBtns}`}>
                            <button className="btn btn-outline-secondary rounded-pill px-3" type="button" onClick={cerrarModalReserva}>
                                Cancelar
                            </button>
                            <button className="btn btn-success rounded-pill px-3" type="button" onClick={confirmarReservaWhatsApp}>
                                <i className="bi bi-whatsapp me-2" aria-hidden="true"></i>
                                Enviar WhatsApp
                            </button>
                        </div>

                        <p className={styles.modalTiny}>Tip: puedes editar el texto antes de enviarlo en WhatsApp.</p>
                    </div>
                </div>
            )}
        </section>
    );
}
