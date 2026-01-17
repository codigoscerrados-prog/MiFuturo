"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import styles from "./BusquedaDeCancha.module.css";
import dynamic from "next/dynamic";

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
};

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
    canchas: CanchaCard[];
};

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function normalizarTexto(v?: string | null) {
    return (v || "").toLowerCase().trim();
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

function construirMensajeWhatsApp(c: CanchaCard, fechaISO: string, hora: string) {
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
    const calendar = "\uD83D\uDCC5";
    const clock = "\u23F0";
    const chat = "\uD83D\uDCAC";

    const zona = c.zona && c.zona !== "—" ? c.zona : "Lima";
    const precio = `S/ ${Number(c.precioHora).toFixed(0)}/h`;
    const fechaHumana = formatoFechaHumana(fechaISO);

    return (
        `Hola ${wave}${sparkles}\n` +
        `Vengo de *CanchaPro* ${soccer} y vi su publicación para reservar ${fire}\n\n` +
        `${stadium} *Cancha:* ${c.nombre}\n` +
        `${pin} *Zona:* ${zona}\n` +
        `${target} *Tipo:* ${c.tipo} • ${c.pasto}\n` +
        `${money} *Precio:* ${precio}\n\n` +
        `${calendar} *Fecha:* ${fechaHumana}\n` +
        `${clock} *Hora:* ${hora}\n\n` +
        `${check} ¿Está disponible en ese horario?\n` +
        `${chat} Si me confirmas, lo reservo de inmediato.\n\n` +
        `${thanks} ¡Gracias! Quedo atento(a).`
    );
}

function abrirWhatsApp(phoneE164: string, mensaje: string) {
    const url = `https://api.whatsapp.com/send?phone=${phoneE164}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank", "noopener,noreferrer");
}

function moneyPE(n: number) {
    const v = Number.isFinite(n) ? n : 0;
    return `S/ ${v.toFixed(0)}/h`;
}

// ✅ evita romper si tu API_BASE incluye /api
function baseSinApi(apiBase: string) {
    return apiBase.replace(/\/api\/?$/, "");
}

function imgFrom(apiBase: string, url: string) {
    if (!url) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;

    const b = baseSinApi(apiBase).replace(/\/$/, "");
    const norm = url.startsWith("/") ? url : `/${url}`;
    return `${b}${norm}`;
}

function buildComplejos(canchas: CanchaCard[], fallbackImg: string): ComplejoCard[] {
    const map = new Map<number, ComplejoCard>();

    for (const c of canchas) {
        const id = c.complejoId;
        if (!id) continue;

        const prev = map.get(id);
        if (!prev) {
            const fotoRaw = c.complejoFotoUrl || c.imagen || "";
            const foto = fotoRaw || fallbackImg;

            map.set(id, {
                id,
                nombre: c.complejoNombre || `Complejo #${id}`,
                zona: c.zona || "—",

                latitud: c.latitud,
                longitud: c.longitud,

                techada: !!c.techada,
                iluminacion: !!c.iluminacion,
                vestuarios: !!c.vestuarios,
                estacionamiento: !!c.estacionamiento,
                cafeteria: !!c.cafeteria,

                foto,
                precioMin: c.precioHora,
                precioMax: c.precioHora,
                canchasCount: 1,

                propietarioPhone: c.propietarioPhone ?? null,
                canchas: [c],
            });
            continue;
        }

        prev.precioMin = Math.min(prev.precioMin, c.precioHora);
        prev.precioMax = Math.max(prev.precioMax, c.precioHora);
        prev.canchasCount += 1;
        prev.canchas.push(c);

        if (!prev.foto || prev.foto === fallbackImg) {
            const fotoRaw = c.complejoFotoUrl || c.imagen || "";
            if (fotoRaw) prev.foto = fotoRaw;
        }
    }

    // orden por precio mínimo
    return Array.from(map.values()).sort((a, b) => a.precioMin - b.precioMin);
}

export default function BusquedaDeCancha({ filtros, mostrando }: { filtros: FiltrosBusqueda; mostrando: boolean }) {
    const POR_PAGINA = 6;

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const FALLBACK_IMG = "/canchas/sintetico-marconi.avif";

    const [canchasDb, setCanchasDb] = useState<CanchaCard[]>([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");

    // ✅ Modal reserva (por complejo, eligiendo cancha)
    const [reservaOpen, setReservaOpen] = useState(false);
    const [reservaComplejo, setReservaComplejo] = useState<ComplejoCard | null>(null);
    const [reservaCanchaId, setReservaCanchaId] = useState<number | null>(null);
    const [reservaFecha, setReservaFecha] = useState("");
    const [reservaHora, setReservaHora] = useState("");
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
                const res = await fetch(`${baseSinApi(API_BASE)}/canchas`, {
                    signal: ac.signal,
                    cache: "no-store",
                });
                if (!res.ok) throw new Error(`Error ${res.status} al cargar canchas`);
                const data: CanchaApi[] = await res.json();

                const mapped: CanchaCard[] = data.map((c) => {
                    const imgRaw = (c.imagen_principal || "").trim();
                    const img = imgRaw ? imgFrom(API_BASE, imgRaw) : FALLBACK_IMG;

                    const complejoFotoRaw = (c.complejo_foto_url || "").trim();
                    const complejoFoto = complejoFotoRaw ? imgFrom(API_BASE, complejoFotoRaw) : null;

                    return {
                        id: c.id,
                        nombre: c.nombre,
                        zona: c.distrito || "—",
                        distrito: c.distrito ?? null,
                        provincia: c.provincia ?? null,
                        departamento: c.departamento ?? null,
                        tipo: c.tipo,
                        pasto: c.pasto,
                        precioHora: Number(c.precio_hora || 0),

                        techada: !!c.techada,
                        iluminacion: !!c.iluminacion,
                        vestuarios: !!c.vestuarios,
                        estacionamiento: !!c.estacionamiento,
                        cafeteria: !!c.cafeteria,

                        rating: ratingFake(c.id),
                        imagen: img,

                        propietarioPhone: c.propietario_phone ?? null,

                        latitud: typeof c.latitud === "number" ? c.latitud : null,
                        longitud: typeof c.longitud === "number" ? c.longitud : null,
                        complejoId: typeof c.complejo_id === "number" ? c.complejo_id : null,
                        complejoNombre: c.complejo_nombre ?? null,

                        complejoFotoUrl: complejoFoto,
                    };
                });

                setCanchasDb(mapped);
            } catch (e: any) {
                if (e?.name !== "AbortError") setError(e?.message || "No se pudieron cargar canchas");
            } finally {
                setCargando(false);
            }
        }

        load();
        return () => ac.abort();
    }, [API_BASE]);

    // ✅ 1) Filtrar canchas (tus filtros siguen siendo por cancha)
    const listaBaseCanchas = useMemo(() => {
        const base = [...canchasDb];

        if (!mostrando) return base.sort((a, b) => b.rating - a.rating);

        const max = clamp(filtros.precioMax, 30, 250);
        const depFiltro = normalizarTexto(filtros.departamento);
        const provFiltro = normalizarTexto(filtros.provincia);
        const distFiltro = normalizarTexto(filtros.distrito);

        return base
            .filter((c) => {
                const cumpleDepartamento = !depFiltro || normalizarTexto(c.departamento) === depFiltro;
                const cumpleProvincia = !provFiltro || normalizarTexto(c.provincia) === provFiltro;
                const cumpleDistrito = !distFiltro || normalizarTexto(c.distrito) === distFiltro;
                const cumpleTipo = filtros.tipo === "Cualquiera" ? true : c.tipo === filtros.tipo;
                const cumplePrecio = c.precioHora <= max;

                return cumpleDepartamento && cumpleProvincia && cumpleDistrito && cumpleTipo && cumplePrecio;
            })
            .sort((a, b) => b.rating - a.rating);
    }, [canchasDb, filtros, mostrando]);

    // ✅ 2) Agrupar por COMPLEJO (lo que se muestra en cards y mapa)
    const listaBaseComplejos = useMemo(() => {
        return buildComplejos(listaBaseCanchas, FALLBACK_IMG);
    }, [listaBaseCanchas]);

    // ✅ paginación (sobre complejos)
    const [pagina, setPagina] = useState(1);
    useEffect(() => setPagina(1), [filtros, mostrando]);

    const total = listaBaseComplejos.length;
    const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    const paginaActual = clamp(pagina, 1, totalPaginas);

    const resultados = useMemo(() => {
        const inicio = (paginaActual - 1) * POR_PAGINA;
        return listaBaseComplejos.slice(inicio, inicio + POR_PAGINA);
    }, [listaBaseComplejos, paginaActual]);

    const maxPrecio = clamp(filtros.precioMax, 30, 250);
    const desde = total === 0 ? 0 : (paginaActual - 1) * POR_PAGINA + 1;
    const hasta = Math.min(paginaActual * POR_PAGINA, total);

    function abrirModalReservaComplejo(complejo: ComplejoCard, canchaPreferidaId?: number) {
        const phone = normalizarTelefonoWhatsApp(complejo.propietarioPhone);
        if (!phone) {
            alert("Aún no hay WhatsApp registrado.\nPide al propietario que complete su teléfono en el panel.");
            return;
        }

        setReservaComplejo(complejo);
        const firstId = complejo.canchas[0]?.id ?? null;
        setReservaCanchaId(canchaPreferidaId ?? firstId);

        setReservaFecha("");
        setReservaHora("");
        setReservaError(null);
        setReservaOpen(true);
        setDetalleOpen(false);
    }

    function cerrarModalReserva() {
        setReservaOpen(false);
        setReservaComplejo(null);
        setReservaCanchaId(null);
        setReservaError(null);
    }

    function confirmarReservaWhatsApp() {
        if (!reservaComplejo) return;

        const cancha = reservaComplejo.canchas.find((x) => x.id === reservaCanchaId) || reservaComplejo.canchas[0];
        if (!cancha) return setReservaError("Este complejo no tiene canchas registradas.");

        const phone = normalizarTelefonoWhatsApp(reservaComplejo.propietarioPhone);
        if (!phone) return setReservaError("Este complejo no tiene WhatsApp registrado.");
        if (!reservaFecha) return setReservaError("Elige una fecha.");
        if (!reservaHora) return setReservaError("Elige una hora.");

        setReservaError(null);
        const msg = construirMensajeWhatsApp(cancha, reservaFecha, reservaHora);
        abrirWhatsApp(phone, msg);
        cerrarModalReserva();
    }

    function abrirModalDetalleComplejo(complejo: ComplejoCard) {
        setDetalleComplejo(complejo);
        setDetalleOpen(true);
    }

    function cerrarModalDetalle() {
        setDetalleOpen(false);
        setDetalleComplejo(null);
    }

    const mostrarMapa = !cargando && listaBaseComplejos.length > 0;

    return (
        <section id="busqueda-de-cancha" className={styles.seccion}>
            <div className="contenedor">
                <div className={styles.cabecera}>
                    <div>
                        <h2 className={styles.titulo}>{mostrando ? "Resultados de tu búsqueda" : "Complejos disponibles"}</h2>

                        <p className={styles.subtitulo}>
                            {cargando
                                ? "Cargando complejos…"
                                : total === 0
                                ? "No hay complejos para mostrar."
                                : mostrando
                                ? `Encontramos ${total} complejo(s). Mostrando ${desde}–${hasta}.`
                                : `Explora todos los complejos. Mostrando ${desde}–${hasta} de ${total}.`}
                        </p>
                    </div>

                    {mostrando && (
                        <div className={styles.resumen}>
                            <span className={styles.tag}>Departamento: {filtros.departamento || "—"}</span>
                            <span className={styles.tag}>Provincia: {filtros.provincia || "—"}</span>
                            <span className={styles.tag}>Distrito: {filtros.distrito || "Todos"}</span>
                            <span className={styles.tag}>Tipo: {filtros.tipo}</span>
                            <span className={styles.tag}>Max: S/ {maxPrecio}</span>
                        </div>
                    )}
                </div>

                {error && <div className={styles.placeholder}>{error}</div>}

                {!cargando && total === 0 ? (
                    <div className={styles.placeholder}>No hay resultados con esos filtros. Prueba subir el precio o ajustar los filtros.</div>
                ) : (
                    <>
                        {/* ✅ MAPA: ahora SOLO COMPLEJOS */}
                        {mostrarMapa && (
                            <div className={styles.mapOnlyDesktop}>
                                <MapaComplejos
                                    complejos={listaBaseComplejos}
                                    onDetalles={(cx: ComplejoCard) => abrirModalDetalleComplejo(cx)}
                                    onReservar={(cx: ComplejoCard) => abrirModalReservaComplejo(cx)}
                                />
                            </div>
                        )}

                        {/* ✅ GRID: COMPLEJOS */}
                        <div className={styles.grid}>
                            {resultados.map((cx) => (
                                <article key={cx.id} className={`tarjeta ${styles.card}`}>
                                    <div className={styles.media}>
                                        <Image
                                            src={cx.foto}
                                            alt={`Complejo ${cx.nombre}`}
                                            fill
                                            className={styles.mediaImg}
                                            sizes="(max-width: 900px) 100vw, 360px"
                                            unoptimized
                                        />
                                        <div className={styles.mediaOverlay} />
                                        <div className={styles.mediaChips}>
                                            <span className={styles.disponible}>Complejo</span>
                                            <span className={styles.rating}>
                                                {moneyPE(cx.precioMin)} – {moneyPE(cx.precioMax)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={styles.body}>
                                        <h3 className={styles.nombre}>{cx.nombre}</h3>
                                        <p className={styles.meta}>
                                            {cx.zona} • {cx.canchasCount} cancha(s)
                                        </p>

                                        <div className={styles.caracts}>
                                            {cx.techada && <span className={styles.chip}>Techada</span>}
                                            {cx.iluminacion && <span className={styles.chip}>Iluminación</span>}
                                            {cx.vestuarios && <span className={styles.chip}>Vestuarios</span>}
                                            {cx.estacionamiento && <span className={styles.chip}>Estacionamiento</span>}
                                            {cx.cafeteria && <span className={styles.chip}>Cafetería</span>}
                                        </div>

                                        <div className={styles.footerCard}>
                                            <div className={styles.precio}>
                                                S/ {cx.precioMin.toFixed(0)} – {cx.precioMax.toFixed(0)} /h
                                            </div>
                                            <div className={styles.botones}>
                                                <button className="boton botonPrimario" type="button" onClick={() => abrirModalReservaComplejo(cx)}>
                                                    Reservar por WhatsApp
                                                </button>
                                                <button className="boton" type="button" onClick={() => abrirModalDetalleComplejo(cx)}>
                                                    Detalles
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        {totalPaginas > 1 && (
                            <div className={styles.paginacion}>
                                <div className={styles.paginacionInfo}>
                                    Página <strong>{paginaActual}</strong> de <strong>{totalPaginas}</strong>
                                </div>

                                <div className={styles.paginacionBotones}>
                                    <button
                                        type="button"
                                        className={`boton ${styles.pagBtn}`}
                                        onClick={() => setPagina((p) => Math.max(1, p - 1))}
                                        disabled={paginaActual === 1}
                                    >
                                        ← Anterior
                                    </button>

                                    <div className={styles.pagNumeros} aria-label="Páginas">
                                        {Array.from({ length: totalPaginas }).map((_, i) => {
                                            const n = i + 1;
                                            const activo = n === paginaActual;
                                            return (
                                                <button
                                                    key={n}
                                                    type="button"
                                                    className={`boton ${styles.pagNum} ${activo ? styles.pagNumActivo : ""}`}
                                                    onClick={() => setPagina(n)}
                                                    aria-current={activo ? "page" : undefined}
                                                >
                                                    {n}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        type="button"
                                        className={`boton ${styles.pagBtn}`}
                                        onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                                        disabled={paginaActual === totalPaginas}
                                    >
                                        Siguiente →
                                    </button>
                                </div>
                            </div>
                        )}
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
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <div>
                                <p className={styles.modalKicker}>Detalles del complejo</p>
                                <h3 className={styles.modalTitle}>{detalleComplejo.nombre}</h3>
                                <p className={styles.modalSub}>
                                    {detalleComplejo.zona} • {detalleComplejo.canchasCount} cancha(s) • S/{" "}
                                    {detalleComplejo.precioMin.toFixed(0)} – {detalleComplejo.precioMax.toFixed(0)} /h
                                </p>
                            </div>

                            <button className={styles.modalClose} type="button" onClick={cerrarModalDetalle} aria-label="Cerrar">
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
                                        S/ {detalleComplejo.precioMin.toFixed(0)} – {detalleComplejo.precioMax.toFixed(0)} /h
                                    </span>
                                </div>
                            </div>

                            <div className={styles.detalleGrid}>
                                <div className={styles.detalleBox}>
                                    <p className={styles.detalleLabel}>Características</p>
                                    <div className={styles.detalleChips}>
                                        {detalleComplejo.techada && <span className={styles.chip}>Techada</span>}
                                        {detalleComplejo.iluminacion && <span className={styles.chip}>Iluminación</span>}
                                        {detalleComplejo.vestuarios && <span className={styles.chip}>Vestuarios</span>}
                                        {detalleComplejo.estacionamiento && <span className={styles.chip}>Estacionamiento</span>}
                                        {detalleComplejo.cafeteria && <span className={styles.chip}>Cafetería</span>}
                                        {!detalleComplejo.techada &&
                                            !detalleComplejo.iluminacion &&
                                            !detalleComplejo.vestuarios &&
                                            !detalleComplejo.estacionamiento &&
                                            !detalleComplejo.cafeteria && (
                                                <span className={styles.detalleMuted}>No hay características marcadas.</span>
                                            )}
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

                        <div className={styles.modalBtns}>
                            <button className="boton" type="button" onClick={cerrarModalDetalle}>
                                Cerrar
                            </button>
                            <button className="boton botonPrimario" type="button" onClick={() => abrirModalReservaComplejo(detalleComplejo)}>
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
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <div>
                                <p className={styles.modalKicker}>Reservar por WhatsApp</p>
                                <h3 className={styles.modalTitle}>{reservaComplejo.nombre}</h3>
                                <p className={styles.modalSub}>Elige la cancha, fecha y hora. Se enviará en el mensaje al propietario.</p>
                            </div>

                            <button className={styles.modalClose} type="button" onClick={cerrarModalReserva} aria-label="Cerrar">
                                ✕
                            </button>
                        </div>

                        {reservaError ? <div className={styles.modalError}>{reservaError}</div> : null}

                        <div className={styles.modalGrid}>
                            <label className={styles.modalField}>
                                <span className={styles.modalLabel}>Cancha</span>
                                <select
                                    className="input"
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

                            <label className={styles.modalField}>
                                <span className={styles.modalLabel}>Fecha</span>
                                <input className="input" type="date" value={reservaFecha} onChange={(e) => setReservaFecha(e.target.value)} />
                            </label>

                            <label className={styles.modalField}>
                                <span className={styles.modalLabel}>Hora</span>
                                <input className="input" type="time" value={reservaHora} onChange={(e) => setReservaHora(e.target.value)} />
                            </label>
                        </div>

                        <div className={styles.modalBtns}>
                            <button className="boton" type="button" onClick={cerrarModalReserva}>
                                Cancelar
                            </button>
                            <button className="boton botonPrimario" type="button" onClick={confirmarReservaWhatsApp}>
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
