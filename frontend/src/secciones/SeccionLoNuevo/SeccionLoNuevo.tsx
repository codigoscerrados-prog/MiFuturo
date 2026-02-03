"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Hourglass,
    Info,
    LayoutGrid,
    MessageCircle,
    Smile,
    TriangleAlert,
    X,
} from "lucide-react";
import styles from "./SeccionLoNuevo.module.css";
import { apiFetch, mediaUrl } from "@/lib/api";
import { haversineDistanceKm } from "@/utils/distance";
import { LatLng, useGeolocation } from "@/utils/hooks/useGeolocation";

type ComplejoFeatures = {
    techada?: boolean;
    iluminacion?: boolean;
    vestuarios?: boolean;
    estacionamiento?: boolean;
    cafeteria?: boolean;
};

type Complejo = {
    id: number;
    nombre: string;
    slug: string;
    zona?: string;
    departamento?: string;
    provincia?: string;
    distrito?: string;
    fotoUrl?: string;
    precioMin?: number | null;
    precioMax?: number | null;
    features: ComplejoFeatures;
    propietarioPhone?: string | null;
    canchas: CanchaMini[];
    verificado: boolean;
    owner_id?: number | null;
    latitud?: number | null;
    longitud?: number | null;
    lat?: number | null;
    lng?: number | null;
};

type CanchaOut = {
    id: number;
    nombre: string;
    distrito?: string | null;
    provincia?: string | null;
    departamento?: string | null;
    tipo?: string | null;
    pasto?: string | null;
    precio_hora?: number | null;
    is_active?: boolean;
    techada?: boolean;
    iluminacion?: boolean;
    vestuarios?: boolean;
    estacionamiento?: boolean;
    cafeteria?: boolean;
    complejo_id?: number | null;
    complejo_nombre?: string | null;
    complejo_foto_url?: string | null;
    imagen_principal?: string | null;
    imagenes?: Array<{ url?: string | null }>;
    propietario_phone?: string | null;
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
    techada?: boolean | null;
    iluminacion?: boolean | null;
    vestuarios?: boolean | null;
    estacionamiento?: boolean | null;
    cafeteria?: boolean | null;
    foto_url?: string | null;
    owner_phone?: string | null;
    owner_id?: number | null;
    canchas?: CanchaOut[];
};

type ComplejoCard = Complejo | { id: string; placeholder: true };

type CanchaMini = {
    id: number;
    nombre: string;
    tipo?: string | null;
    pasto?: string | null;
    precioHora?: number | null;
    isActive?: boolean;
};

type HorarioSlot = {
    hora: string;
    ocupado: boolean;
};

const DEFAULT_FOTO = "/canchas/sintetico-marconi.avif";
const DEFAULT_HORARIOS = [
    "06:00",
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
];
const PRECIO_MAX_VISIBLE = 300;

const FEATURES: Array<{ key: keyof ComplejoFeatures; label: string }> = [
    { key: "techada", label: "Techada" },
    { key: "iluminacion", label: "Iluminacion" },
    { key: "vestuarios", label: "Vestuarios" },
    { key: "estacionamiento", label: "Estacionamiento" },
    { key: "cafeteria", label: "Cafeteria" },
];

const ADMINISTRAR_WHATSAPP_PHONE = "999999999";
const ADMINISTRAR_WHATSAPP_MESSAGE = "quiero reclamar mi cancha y administrarla";

function formatPrecio(c: Complejo) {
    const minRaw = c.precioMin;
    const maxRaw = c.precioMax;
    const max = typeof maxRaw === "number" ? Math.min(maxRaw, PRECIO_MAX_VISIBLE) : maxRaw;
    const min =
        typeof minRaw === "number"
            ? Math.min(minRaw, typeof max === "number" ? max : PRECIO_MAX_VISIBLE)
            : minRaw;
    if (typeof min === "number" && typeof max === "number") {
        return `S/ ${Math.round(min)} - ${Math.round(max)}`;
    }
    if (typeof min === "number") return `S/ ${Math.round(min)} / h`;
    if (typeof max === "number") return `S/ ${Math.round(max)} / h`;
    return null;
}

function moneyPE(n?: number | null) {
    if (typeof n !== "number") return "S/ --";
    try {
        return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n);
    } catch {
        return `S/ ${n.toFixed(0)}`;
    }
}

function normalizarTelefonoWhatsApp(raw: string | null | undefined) {
    const t = (raw || "").trim();
    if (!t) return null;

    const digits = t.replace(/[^\d]/g, "");
    if (!digits) return null;

    if (digits.length === 9 && digits.startsWith("9")) return `51${digits}`;
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

function formatDuracion(duracionHoras: number) {
    if (!duracionHoras || duracionHoras <= 0) return "";
    return duracionHoras === 1 ? "1 hora" : `${duracionHoras} horas`;
}

function construirMensajeWhatsApp(
    c: CanchaMini,
    complejo: Complejo,
    fechaISO: string,
    hora: string,
    duracionHoras: number
) {
    const lugar = [complejo.distrito, complejo.provincia, complejo.departamento].filter(Boolean).join(", ");
    const fechaHumana = formatoFechaHumana(fechaISO);
    const duracionTxt = formatDuracion(duracionHoras);
    const zona = lugar || "Lima";
    const precio = `S/ ${Number(c.precioHora || 0).toFixed(0)}/h`;
    const total = typeof c.precioHora === "number" ? `S/ ${(c.precioHora * duracionHoras).toFixed(0)}` : "";
    const tipo = c.tipo ? `${c.tipo} \u2022 ${c.pasto || ""}`.trim() : "Por confirmar";
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
    return (
        `Hola ${wave}${sparkles}\n` +
        `Vengo de *CanchaPro* ${soccer} y vi su publicaci\u00f3n para reservar ${fire}\n\n` +
        `${stadium} *Cancha:* ${c.nombre}\n` +
        `${pin} *Zona:* ${zona}\n` +
        `${target} *Tipo:* ${tipo}\n` +
        `${money} *Precio:* ${precio}\n` +
        (total ? `${money} *Total:* ${total}\n\n` : "\n") +
        `${calendar} *Fecha:* ${fechaHumana}\n` +
        `${clock} *Hora:* ${hora}\n` +
        (duracionTxt ? `${target} *Duracion:* ${duracionTxt}\n\n` : "\n") +
        `${check} \u00bfEst\u00e1 disponible en ese horario?\n` +
        `${chat} Si me confirmas, lo reservo de inmediato.\n\n` +
        `${thanks} \u00a1Gracias! Quedo atento(a).`
    );
}

function construirMensajeWhatsAppEstandar(complejo: Complejo, fechaISO: string, hora: string, duracionHoras: number) {
    const lugar = [complejo.distrito, complejo.provincia, complejo.departamento].filter(Boolean).join(", ");
    const fechaHumana = formatoFechaHumana(fechaISO);
    const duracionTxt = formatDuracion(duracionHoras);
    const zona = lugar || "Lima";
    const precio =
        typeof complejo.precioMin === "number" && typeof complejo.precioMax === "number"
            ? `S/ ${Math.round(complejo.precioMin)} - ${Math.round(complejo.precioMax)}/h`
            : typeof complejo.precioMin === "number"
            ? `S/ ${Math.round(complejo.precioMin)}/h`
            : "";
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
    return (
        `Hola ${wave}${sparkles}\n` +
        `Vengo de *CanchaPro* ${soccer} y vi su publicaci\u00f3n para reservar ${fire}\n\n` +
        `${stadium} *Complejo:* ${complejo.nombre}\n` +
        `${pin} *Zona:* ${zona}\n` +
        (precio ? `${money} *Precio:* ${precio}\n\n` : "\n") +
        `${calendar} *Fecha:* ${fechaHumana}\n` +
        `${clock} *Hora:* ${hora}\n` +
        (duracionTxt ? `${target} *Duracion:* ${duracionTxt}\n\n` : "\n") +
        `${check} \u00bfEst\u00e1 disponible en ese horario?\n` +
        `${chat} Si me confirmas, lo reservo de inmediato.\n\n` +
        `${thanks} \u00a1Gracias! Quedo atento(a).`
    );
}

function buildWhatsAppUrl(phone: string, message: string) {
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${phone}?text=${encoded}`;
}

function cleanUrl(value?: string | null) {
    if (!value || typeof value !== "string") return "";
    const trimmed = value.trim();
    if (!trimmed || trimmed === "null" || trimmed === "None") return "";
    return trimmed;
}

function resolveUrl(path?: string | null) {
    const cleaned = cleanUrl(path);
    if (!cleaned) return "";
    if (/^https?:\/\//i.test(cleaned) || cleaned.startsWith("data:")) return cleaned;
    if (cleaned.startsWith("//")) return `https:${cleaned}`;

    const isBackendPath =
        cleaned.startsWith("/uploads/") ||
        cleaned.startsWith("uploads/") ||
        cleaned.startsWith("/static/") ||
        cleaned.startsWith("static/");
    if (isBackendPath) {
        return mediaUrl(cleaned, cleaned, { forceProxy: true }) || cleaned;
    }

    return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
}

function pickUrl(...values: Array<string | null | undefined>) {
    for (const value of values) {
        const resolved = resolveUrl(value);
        if (resolved) return resolved;
    }
    return "";
}

function mapComplejosFromApi(complejos: ComplejoApi[]) {
    const items = (complejos || []).map((cx) => {
        const distrito = cx.distrito ?? undefined;
        const provincia = cx.provincia ?? undefined;
        const departamento = cx.departamento ?? undefined;
        const zona = [distrito, provincia].filter(Boolean).join(", ") || undefined;

        const canchasRaw = Array.isArray(cx.canchas) ? cx.canchas : [];
        let precioMin: number | null = null;
        let precioMax: number | null = null;

        const canchas: CanchaMini[] = canchasRaw.map((c) => {
            if (typeof c.precio_hora === "number") {
                precioMin = precioMin == null ? c.precio_hora : Math.min(precioMin, c.precio_hora);
                precioMax = precioMax == null ? c.precio_hora : Math.max(precioMax, c.precio_hora);
            }
            return {
                id: c.id,
                nombre: c.nombre,
                tipo: c.tipo ?? null,
                pasto: c.pasto ?? null,
                precioHora: typeof c.precio_hora === "number" ? c.precio_hora : null,
                isActive: Boolean(c.is_active),
            };
        });

        const foto = pickUrl(
            cx.foto_url,
            canchasRaw[0]?.imagen_principal,
            canchasRaw[0]?.imagenes?.[0]?.url
        );

        const verificado = canchas.some((c) => c.isActive);

        return {
            id: cx.id,
            nombre: cx.nombre,
            slug: cx.slug || "",
            zona,
            departamento,
            provincia,
            distrito,
            fotoUrl: foto || DEFAULT_FOTO,
            owner_id: cx.owner_id ?? null,
            latitud: typeof cx.latitud === "number" ? cx.latitud : null,
            longitud: typeof cx.longitud === "number" ? cx.longitud : null,
            precioMin,
            precioMax,
            features: {
                techada: Boolean(cx.techada) || canchasRaw.some((c) => Boolean(c.techada)),
                iluminacion: Boolean(cx.iluminacion) || canchasRaw.some((c) => Boolean(c.iluminacion)),
                vestuarios: Boolean(cx.vestuarios) || canchasRaw.some((c) => Boolean(c.vestuarios)),
                estacionamiento: Boolean(cx.estacionamiento) || canchasRaw.some((c) => Boolean(c.estacionamiento)),
                cafeteria: Boolean(cx.cafeteria) || canchasRaw.some((c) => Boolean(c.cafeteria)),
            },
            propietarioPhone: cx.owner_phone ?? canchasRaw[0]?.propietario_phone ?? null,
            canchas,
            verificado,
        };
    });

    return items;
}

type ComplejoConCoordenadas = Complejo & {
    lat?: number | null;
    lng?: number | null;
    complejo?: {
        lat?: number | null;
        lng?: number | null;
    };
};

function obtenerCoordenadasDelItem(item: Complejo): LatLng | null {
    const candidato = item as ComplejoConCoordenadas;
    const lat =
        typeof candidato.latitud === "number"
            ? candidato.latitud
            : typeof candidato.lat === "number"
            ? candidato.lat
            : typeof candidato.complejo?.lat === "number"
            ? candidato.complejo.lat
            : undefined;
    const lng =
        typeof candidato.longitud === "number"
            ? candidato.longitud
            : typeof candidato.lng === "number"
            ? candidato.lng
            : typeof candidato.complejo?.lng === "number"
            ? candidato.complejo.lng
            : undefined;
    if (typeof lat === "number" && typeof lng === "number") {
        return { lat, lng };
    }
    return null;
}

function ordenarPorDistancia(items: Complejo[], posicion: LatLng | null) {
    if (!posicion) return items;

    const enriquecidos = items.map<{
        item: Complejo;
        coords: LatLng | null;
        index: number;
    }>((item, index) => ({
        item,
        coords: obtenerCoordenadasDelItem(item),
        index,
    }));

    const conCoords = enriquecidos
        .filter((entry) => entry.coords)
        .map((entry) => ({
            ...entry,
            distance: haversineDistanceKm(
                posicion.lat,
                posicion.lng,
                entry.coords!.lat,
                entry.coords!.lng
            ),
        }))
        .sort((a, b) => {
            if (a.distance === b.distance) {
                return a.index - b.index;
            }
            return a.distance - b.distance;
        });

    const sinCoords = enriquecidos.filter((entry) => !entry.coords);

    return [
        ...conCoords.map((entry) => entry.item),
        ...sinCoords.map((entry) => entry.item),
    ];
}

export default function SeccionLoNuevo() {
    const carruselRef = useRef<HTMLDivElement | null>(null);
    const autoplayRef = useRef<number | null>(null);
    const [items, setItems] = useState<Complejo[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const {
        position,
        loading: ubicacionCargando,
        error: geoError,
        permissionDenied,
        requestLocation,
    } = useGeolocation();
    const vacio = !cargando && items.length === 0;
    const [detalleOpen, setDetalleOpen] = useState(false);
    const [reservaOpen, setReservaOpen] = useState(false);
    const [activo, setActivo] = useState<Complejo | null>(null);
    const [reservaCanchaId, setReservaCanchaId] = useState<number | null>(null);
    const [reservaFecha, setReservaFecha] = useState("");
    const [reservaDuracion, setReservaDuracion] = useState(1);
    const [reservaError, setReservaError] = useState<string | null>(null);
    const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
    const [horariosSlots, setHorariosSlots] = useState<HorarioSlot[]>(() =>
        DEFAULT_HORARIOS.map((hora) => ({ hora, ocupado: false }))
    );
    const [horariosLoading, setHorariosLoading] = useState(false);
    const [horariosError, setHorariosError] = useState("");

    const canchaSeleccionada = useMemo(() => {
        if (!activo || !activo.verificado) return null;
        if (reservaCanchaId) {
            const match = activo.canchas.find((c) => c.id === reservaCanchaId);
            if (match) return match;
        }
        return activo.canchas[0] || null;
    }, [activo, reservaCanchaId]);
    const totalReserva = useMemo(() => {
        if (!canchaSeleccionada || typeof canchaSeleccionada.precioHora !== "number") return null;
        return canchaSeleccionada.precioHora * reservaDuracion;
    }, [canchaSeleccionada, reservaDuracion]);

    useEffect(() => {
        if (!reservaOpen) return;
        if (!canchaSeleccionada) {
            setHorariosSlots(DEFAULT_HORARIOS.map((hora) => ({ hora, ocupado: false })));
            setSelectedSlots(DEFAULT_HORARIOS.slice(0, 1));
            setHorariosError("");
            setHorariosLoading(false);
            return;
        }
        const fechaParam = reservaFecha || new Date().toISOString().slice(0, 10);
        const ac = new AbortController();
        setHorariosLoading(true);
        setHorariosError("");

        apiFetch<{ slots: HorarioSlot[] }>(`/public/canchas/${canchaSeleccionada.id}/horarios?fecha=${fechaParam}`, {
            signal: ac.signal,
            cache: "no-store",
        })
            .then((data) => {
                if (data?.slots?.length) {
                    const normalized = data.slots.map((slot) => ({
                        hora: slot.hora,
                        ocupado: Boolean(slot.ocupado),
                    }));
                    setHorariosSlots(normalized);
                    const free = normalized.find((slot) => !slot.ocupado);
                    setSelectedSlots(free ? [free.hora] : normalized.map((slot) => slot.hora).slice(0, 1));
                } else {
                    setHorariosSlots(DEFAULT_HORARIOS.map((hora) => ({ hora, ocupado: false })));
                    setSelectedSlots(DEFAULT_HORARIOS.slice(0, 1));
                }
            })
            .catch((err) => {
                if (err?.name === "AbortError") return;
                setHorariosSlots(DEFAULT_HORARIOS.map((hora) => ({ hora, ocupado: false })));
                setSelectedSlots(DEFAULT_HORARIOS.slice(0, 1));
                setHorariosError("No se pudieron cargar los horarios, usa los valores sugeridos.");
            })
            .finally(() => setHorariosLoading(false));

        return () => ac.abort();
    }, [canchaSeleccionada, reservaFecha, reservaOpen]);

    useEffect(() => {
        let activo = true;
        (async () => {
            try {
                setCargando(true);
                setError("");
                const data = await apiFetch<any>("/complejos");
                const lista = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
                const normalizados = mapComplejosFromApi(lista as ComplejoApi[]);
                if (activo) setItems(normalizados);
            } catch (err: any) {
                if (activo) setError(err?.message || "No se pudo cargar lo nuevo.");
            } finally {
                if (activo) setCargando(false);
            }
        })();

        return () => {
            activo = false;
        };
    }, []);

    const itemsOrdenados = useMemo(() => ordenarPorDistancia(items, position), [items, position]);
    const itemsPriorizados = useMemo(() => {
        if (!position) {
            return [...itemsOrdenados].sort((a, b) => Number(b.verificado) - Number(a.verificado));
        }
        const enriched = itemsOrdenados.map((item, index) => {
            const coords = obtenerCoordenadasDelItem(item);
            const distancia =
                coords ? haversineDistanceKm(position.lat, position.lng, coords.lat, coords.lng) : null;
            const enRango = distancia != null && distancia <= 10;
            return { item, distancia, enRango, index };
        });

        enriched.sort((a, b) => {
            if (a.item.verificado !== b.item.verificado) {
                return Number(b.item.verificado) - Number(a.item.verificado);
            }
            if (a.enRango !== b.enRango) {
                return Number(b.enRango) - Number(a.enRango);
            }
            if (a.distancia != null && b.distancia != null && a.distancia !== b.distancia) {
                return a.distancia - b.distancia;
            }
            return a.index - b.index;
        });

        return enriched.map((entry) => entry.item);
    }, [itemsOrdenados, position]);

    const cards = useMemo<ComplejoCard[]>(() => {
        if (cargando || vacio) {
            return Array.from({ length: 9 }, (_, i) => ({ id: `s-${i}`, placeholder: true }));
        }
        const base: ComplejoCard[] = [...itemsPriorizados];
        while (base.length < 15) {
            base.push({ id: `p-${base.length}`, placeholder: true });
        }
        return base.slice(0, 15);
    }, [cargando, itemsPriorizados, vacio]);

    const showGeoStatus = ubicacionCargando || Boolean(geoError);
    const showGeoRetryButton = !ubicacionCargando && (Boolean(geoError) || permissionDenied);
    const geoStatusTexto = ubicacionCargando ? "Buscando canchas cerca…" : geoError;

    useEffect(() => {
        const prefersReduced =
            typeof window !== "undefined" &&
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReduced) return;

        function step() {
            const el = carruselRef.current;
            if (!el) return;
            const first = el.firstElementChild as HTMLElement | null;
            if (!first) return;
            const styles = getComputedStyle(el);
            const gapRaw = styles.columnGap || styles.gap || "0px";
            const gap = Number.parseFloat(gapRaw) || 0;
            const stepSize = first.offsetWidth + gap;
            const max = el.scrollWidth - el.clientWidth - 2;
            if (el.scrollLeft >= max) {
                el.scrollTo({ left: 0, behavior: "smooth" });
                return;
            }
            el.scrollBy({ left: stepSize, behavior: "smooth" });
        }

        autoplayRef.current = window.setInterval(step, 5200);
        return () => {
            if (autoplayRef.current) window.clearInterval(autoplayRef.current);
        };
    }, [cards.length]);

    function scrollByDir(dir: "prev" | "next") {
        const el = carruselRef.current;
        if (!el) return;
        const amount = Math.max(260, el.clientWidth * 0.8);
        el.scrollBy({ left: dir === "next" ? amount : -amount, behavior: "smooth" });
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        if (e.key === "ArrowRight") {
            e.preventDefault();
            scrollByDir("next");
        }
        if (e.key === "ArrowLeft") {
            e.preventDefault();
            scrollByDir("prev");
        }
    }

    function abrirDetalle(card: Complejo) {
        setActivo(card);
        setReservaOpen(false);
        setDetalleOpen(true);
    }

    function abrirReserva(card: Complejo) {
        setActivo(card);
        setDetalleOpen(false);
        setReservaOpen(true);
        setReservaError(null);
        const first = card.canchas[0];
        setReservaCanchaId(card.verificado ? (first?.id ?? null) : null);
        const today = new Date();
        const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        setReservaFecha(iso);
        setReservaDuracion(1);
        setHorariosSlots(DEFAULT_HORARIOS.map((hora) => ({ hora, ocupado: false })));
        setSelectedSlots(DEFAULT_HORARIOS.slice(0, 1));
    }

    function cerrarModales() {
        setDetalleOpen(false);
        setReservaOpen(false);
        setActivo(null);
        setReservaError(null);
    }

    useEffect(() => {
        if (!detalleOpen && !reservaOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") cerrarModales();
        }
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [detalleOpen, reservaOpen]);

    function buildSelection(startHora: string, duracionHoras: number, slots: HorarioSlot[]) {
        const startIndex = slots.findIndex((slot) => slot.hora === startHora);
        if (startIndex < 0) return null;
        const chunk = slots.slice(startIndex, startIndex + duracionHoras);
        if (chunk.length < duracionHoras) return null;
        if (chunk.some((slot) => slot.ocupado)) return null;
        return chunk.map((slot) => slot.hora);
    }

    function buildHoraRango(start: string, duracionHoras: number, slots: HorarioSlot[]) {
        const startIndex = slots.findIndex((slot) => slot.hora === start);
        if (startIndex < 0) return start;
        const endIndex = startIndex + duracionHoras;
        const end = slots[endIndex]?.hora;
        return end ? `${start} - ${end}` : `${start} + ${duracionHoras}h`;
    }

    function formatSelectedRange() {
        const start = selectedSlots[0];
        if (!start) return "Selecciona en la agenda";
        return buildHoraRango(start, reservaDuracion, horariosSlots);
    }

    const maxDuracionDisponible = useMemo(() => {
        const start = selectedSlots[0];
        if (!start) return 1;
        const startIndex = horariosSlots.findIndex((slot) => slot.hora === start);
        if (startIndex < 0) return 1;
        let max = 0;
        for (let i = startIndex; i < horariosSlots.length; i += 1) {
            if (horariosSlots[i].ocupado) break;
            max += 1;
            if (max >= 4) break;
        }
        return Math.max(1, max);
    }, [selectedSlots, horariosSlots]);

    useEffect(() => {
        const start = selectedSlots[0];
        if (!start) return;
        const nextDur = Math.min(reservaDuracion, maxDuracionDisponible);
        if (nextDur !== reservaDuracion) {
            setReservaDuracion(nextDur);
        }
        const nextSelection = buildSelection(start, nextDur, horariosSlots);
        if (nextSelection && nextSelection.join("|") !== selectedSlots.join("|")) {
            setSelectedSlots(nextSelection);
        }
    }, [maxDuracionDisponible, reservaDuracion, horariosSlots, selectedSlots]);

    function confirmarReservaWhatsApp() {
        if (!activo) return;
        const esEstandar = !activo.verificado;
        let cancha: CanchaMini | null = null;

        if (!esEstandar) {
            cancha = activo.canchas.find((c) => c.id === reservaCanchaId) || activo.canchas[0] || null;
            if (!cancha) {
                setReservaError("No se encontro la cancha seleccionada.");
                return;
            }
        }
        if (!reservaFecha) {
            setReservaError("Selecciona una fecha.");
            return;
        }
        const horaSeleccionada = selectedSlots[0];
        if (!horaSeleccionada) {
            setReservaError("Selecciona una hora en la agenda.");
            return;
        }

        const phone = normalizarTelefonoWhatsApp(activo.propietarioPhone);
        if (!phone) {
            setReservaError("Este complejo no tiene WhatsApp configurado.");
            return;
        }

        const horaRango = buildHoraRango(horaSeleccionada, reservaDuracion, horariosSlots);
        const msg = esEstandar
            ? construirMensajeWhatsAppEstandar(activo, reservaFecha, horaRango, reservaDuracion)
            : construirMensajeWhatsApp(cancha as CanchaMini, activo, reservaFecha, horaRango, reservaDuracion);
        const url = buildWhatsAppUrl(phone, msg);
        if (process.env.NODE_ENV !== "production") {
            console.log("[whatsapp] mensaje:", msg);
            console.log("[whatsapp] url:", url);
        }
        window.open(url, "_blank", "noopener,noreferrer");
        cerrarModales();
    }

    return (
        <section className={styles.seccion}>
            <div className="container-xl">
                <div className={styles.head}>
                    <div>
                        <h2 className={styles.titulo}>Lo nuevo en tu zona</h2>
                        <p className={styles.subtitulo}>Descubre complejos recien publicados y reserva en minutos.</p>
                    </div>
                    <div className={styles.controles} aria-label="Control del carrusel">
                        <button
                            type="button"
                            className={`btn btn-sm btn-light ${styles.ctrlBtn}`}
                            onClick={(e) => {
                                e.preventDefault();
                                scrollByDir("prev");
                            }}
                            aria-label="Mostrar complejos anteriores"
                        >
                            <ChevronLeft size={18} aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm btn-light ${styles.ctrlBtn}`}
                            onClick={(e) => {
                                e.preventDefault();
                                scrollByDir("next");
                            }}
                            aria-label="Mostrar siguientes complejos"
                        >
                            <ChevronRight size={18} aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {showGeoStatus && (
                    <div className={styles.geoStatus} role="status">
                        <span>{geoStatusTexto}</span>
                        {showGeoRetryButton && (
                            <button
                                type="button"
                                className={`btn btn-sm btn-outline-primary ${styles.geoRetry}`}
                                onClick={requestLocation}
                            >
                                Usar mi ubicación
                            </button>
                        )}
                    </div>
                )}

                {error && <div className={styles.error}>{error}</div>}
                {vacio && !error && <div className={styles.empty}>Aun no hay complejos recientes, vuelve pronto.</div>}

                <div
                    ref={carruselRef}
                    className={styles.carrusel}
                    role="region"
                    aria-roledescription="carousel"
                    aria-label="Complejos recientes"
                    tabIndex={0}
                    onKeyDown={onKeyDown}
                >
                    {cards.map((card) => {
                        if ("placeholder" in card) {
                            return (
                                <article key={card.id} className={`${styles.card} ${styles.cardPlaceholder}`} aria-hidden="true">
                                    <div className={styles.cardMedia} />
                                    <div className={styles.cardBody}>
                                        <div className={styles.linea} />
                                        <div className={styles.lineaCorta} />
                                        <div className={styles.chips}>
                                            <span className={styles.chip} />
                                            <span className={styles.chip} />
                                        </div>
                                    </div>
                                </article>
                            );
                        }

                        const precio = formatPrecio(card);
                        const chips = FEATURES.filter((f) => card.features?.[f.key]);
                        const tieneOwner = Boolean(card.owner_id);
                        const esEstandar = !card.verificado;
                        const mostrarReservar = card.verificado;
                        const mostrarMensajeVerificado = tieneOwner && esEstandar;
                        const adminWhatsappUrl = buildWhatsAppUrl(
                            ADMINISTRAR_WHATSAPP_PHONE,
                            ADMINISTRAR_WHATSAPP_MESSAGE
                        );
                        const esSinOwner = !tieneOwner;

                        return (
                        <article key={card.id} className={`card ${styles.card}`}>
                            <Link
                                href={`/${card.slug}`}
                                className={styles.cardMediaWrap}
                                aria-label={`Ver ${card.nombre}`}
                            >
                                    <img
                                        src={card.fotoUrl || DEFAULT_FOTO}
                                        alt={card.nombre}
                                        className={styles.cardMedia}
                                        loading="lazy"
                                        onError={(e) => {
                                            e.currentTarget.src = DEFAULT_FOTO;
                                        }}
                                    />
                                    <span className={styles.badgeNuevo}>Nuevo</span>
                                            <span className={`${styles.badgeEstado} ${card.verificado ? styles.badgeOk : styles.badgeBase}`}>
                                                <i className={`bi ${card.verificado ? "bi-shield-check" : "bi-shield"} me-1`} aria-hidden="true"></i>
                                                {card.verificado ? "Verificado" : "Estandar"}
                                            </span>
                                        </Link>
                                        <div className={styles.cardBody}>
                                            <div className={styles.cardTop}>
                                                <h3 className={styles.cardTitulo}>{card.nombre}</h3>
                                                {(card.departamento || card.distrito) && (
                                                    <div className={styles.locationMeta}>
                                                        {card.departamento && (
                                                            <span className={styles.locationItem}>
                                                                <span className={styles.locationLabel}>Departamento</span>
                                                                <span className={styles.locationValue}>{card.departamento}</span>
                                                            </span>
                                                        )}
                                                        {card.distrito && (
                                                            <span className={styles.locationItem}>
                                                                <span className={styles.locationLabel}>Distrito</span>
                                                                <span className={styles.locationValue}>{card.distrito}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {chips.length > 0 && (
                                                <div className={styles.chips}>
                                                    {chips.map((chip) => (
                                                        <span key={chip.key} className={styles.chip}>
                                                            {chip.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className={styles.cardFooter}>
                                                <div className={styles.cardAcciones}>
                                                    <Link
                                                        href={`/${card.slug}`}
                                                        className={`btn btn-outline-secondary btn-sm rounded-pill px-3 ${styles.btnDetalle}`}
                                                    >
                                                        <Info size={14} aria-hidden="true" />
                                                        Ver detalles
                                                    </Link>
                                                    {mostrarReservar ? (
                                                        <button
                                                            type="button"
                                                            className={`btn btn-success btn-sm rounded-pill px-3 ${styles.btnReservar}`}
                                                            onClick={() => abrirReserva(card)}
                                                        >
                                                            <MessageCircle size={16} className="me-2" aria-hidden="true" />
                                                            Reservar por WhatsApp
                                                        </button>
                                                    ) : esSinOwner && esEstandar ? (
                                                        <a
                                                            href={adminWhatsappUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className={`btn btn-success btn-sm rounded-pill px-3 ${styles.btnReservar}`}
                                                        >
                                                            <Smile size={16} className="me-2" aria-hidden="true" />
                                                            Reclamar perfil
                                                        </a>
                                                    ) : mostrarMensajeVerificado ? (
                                                        <span className={styles.reservaInfo}>Administración no verificada</span>
                                                    ) : null}
                                                </div>

                                                {precio && <div className={styles.precio}>{precio}</div>}
                                            </div>
                                        </div>
                                    </article>
                        );
                    })}
                </div>

            </div>

            {(detalleOpen || reservaOpen) && (
                <div
                    className={styles.modalOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-label={reservaOpen ? "Reservar por WhatsApp" : "Detalles del complejo"}
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) cerrarModales();
                    }}
                >
                    <div
                        className={`card border-0 shadow-lg ${styles.modalCard} ${reservaOpen ? styles.modalCardLarge : ""}`}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div className={`d-flex gap-3 justify-content-between align-items-start ${styles.modalHeader}`}>
                            <div>
                                <p className={styles.modalKicker}>
                                    {reservaOpen ? "Reservar por WhatsApp" : "Detalles del complejo"}
                                </p>
                                <h3 className={styles.modalTitle}>{activo?.nombre || "Complejo"}</h3>
                                <p className={styles.modalSub}>
                                    {reservaOpen
                                        ? activo?.verificado
                                            ? "Elige la cancha, fecha, hora y duracion. Se enviara en el mensaje al propietario."
                                            : "Elige fecha, hora y duracion. Se enviara en el mensaje al propietario."
                                        : activo?.zona || "Ubicacion no disponible"}
                                </p>
                            </div>

                            <button
                                className={`btn btn-sm btn-light border ${styles.modalClose}`}
                                type="button"
                                onClick={cerrarModales}
                                aria-label="Cerrar"
                            >
                                <X size={18} aria-hidden="true" />
                            </button>
                        </div>

                        {activo && !reservaOpen && (
                            <div className={styles.modalBody}>
                                <div className={styles.modalHero}>
                                    <img src={activo.fotoUrl || DEFAULT_FOTO} alt={activo.nombre} />
                                </div>
                                <div className={styles.modalInfo}>
                                    <h4>{activo.nombre}</h4>
                                    <p>{activo.zona || "Ubicacion no disponible"}</p>
                                    {formatPrecio(activo) && <p className={styles.modalPrecio}>{formatPrecio(activo)}</p>}
                                </div>
                                <div className={styles.modalChips}>
                                    {FEATURES.filter((f) => activo.features?.[f.key]).map((f) => (
                                        <span key={f.key} className={styles.modalChip}>
                                            {f.label}
                                        </span>
                                    ))}
                                </div>
                                <div className={styles.modalLista}>
                                    {activo.canchas.map((c) => (
                                        <div key={c.id} className={styles.modalFila}>
                                            <span>{c.nombre}</span>
                                            {typeof c.precioHora === "number" && <span>{moneyPE(c.precioHora)} /h</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activo && reservaOpen && (
                            <div className={styles.modalScroll}>
                                {reservaError ? (
                                    <div className={`alert alert-danger d-flex align-items-start gap-2 rounded-4 ${styles.modalError}`}>
                                        <TriangleAlert size={18} className="mt-1" aria-hidden="true" />
                                        <span>{reservaError}</span>
                                    </div>
                                ) : null}

                                <div className={styles.reservaLayout}>
                                    <div className={styles.modalGrid}>
                                        {activo.verificado && (
                                            <label className={styles.modalField}>
                                                <span className={styles.modalLabel}>
                                                    <LayoutGrid size={16} className="me-2" aria-hidden="true" />
                                                    Cancha
                                                </span>
                                                <select
                                                    className="form-select form-select-sm rounded-3"
                                                    value={String(reservaCanchaId ?? "")}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setReservaCanchaId(v ? Number(v) : null);
                                                    }}
                                                >
                                                    {activo.canchas.map((c) => (
                                                        <option key={c.id} value={String(c.id)}>
                                                            {c.nombre} • {c.tipo || "Cancha"} • {moneyPE(c.precioHora)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                        )}

                                        <label className={styles.modalField}>
                                            <span className={styles.modalLabel}>
                                                <CalendarDays size={16} className="me-2" aria-hidden="true" />
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
                                                <Hourglass size={16} className="me-2" aria-hidden="true" />
                                                Duracion
                                            </span>
                                            <select
                                                className="form-select form-select-sm rounded-3"
                                                value={String(reservaDuracion)}
                                                onChange={(e) => {
                                                    const next = Math.max(1, Number(e.target.value) || 1);
                                                    setReservaDuracion(next);
                                                    if (!selectedSlots[0]) return;
                                                    const nextSelection = buildSelection(selectedSlots[0], next, horariosSlots);
                                                    if (!nextSelection) {
                                                        setReservaError("Ese rango no esta disponible.");
                                                        return;
                                                    }
                                                    setReservaError(null);
                                                    setSelectedSlots(nextSelection);
                                                }}
                                            >
                                                {[1, 2, 3, 4].map((h) => (
                                                    <option key={h} value={String(h)} disabled={h > maxDuracionDisponible}>
                                                        {h} hora{h > 1 ? "s" : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <div className={styles.modalField}>
                                            <span className={styles.modalLabel}>Hora seleccionada</span>
                                            <div className={styles.modalStatic}>{formatSelectedRange()}</div>
                                        </div>
                                        <div className={styles.modalField}>
                                            <span className={styles.modalLabel}>Total</span>
                                            <div className={styles.modalStatic}>
                                                {totalReserva != null ? moneyPE(totalReserva) : "S/ --"}
                                            </div>
                                        </div>
                                        {horariosError ? <p className={styles.modalTiny}>{horariosError}</p> : null}
                                    </div>

                                    <div className={styles.agendaPanel}>
                                        <h4 className={styles.agendaTitle}>Agenda del complejo</h4>
                                        {horariosLoading ? (
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                                                Cargando agenda…
                                            </div>
                                        ) : (
                                            <div className={styles.agendaList}>
                                                {horariosSlots.map((slot) => {
                                                    const isSelected = selectedSlots.includes(slot.hora);
                                                    return (
                                                        <button
                                                            key={slot.hora}
                                                            type="button"
                                                            className={`${styles.agendaSlot} ${
                                                                slot.ocupado
                                                                    ? styles.agendaSlotBusy
                                                                    : isSelected
                                                                    ? styles.agendaSlotActive
                                                                    : ""
                                                            }`}
                                                            onClick={() => {
                                                                if (slot.ocupado) return;
                                                                const nextSelection = buildSelection(slot.hora, reservaDuracion, horariosSlots);
                                                                if (!nextSelection) {
                                                                    setReservaError("Ese rango no esta disponible.");
                                                                    return;
                                                                }
                                                                setReservaError(null);
                                                                setSelectedSlots(nextSelection);
                                                            }}
                                                            disabled={slot.ocupado}
                                                        >
                                                            <span>{slot.hora}</span>
                                                            <span className={styles.agendaState}>{slot.ocupado ? "Ocupado" : "Disponible"}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className={`d-flex justify-content-end gap-2 flex-wrap ${styles.modalBtns}`}>
                                    <button className={`btn btn-outline-secondary rounded-pill px-3 ${styles.btnCancel}`} type="button" onClick={cerrarModales}>
                                        Cancelar
                                    </button>
                                    <button className={`btn rounded-pill px-3 ${styles.ctaGreen}`} type="button" onClick={confirmarReservaWhatsApp}>
                                        <MessageCircle size={16} className="me-2" aria-hidden="true" />
                                        Enviar WhatsApp
                                    </button>
                                </div>

                                <p className={styles.modalTiny}>Tip: puedes editar el texto antes de enviarlo en WhatsApp.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
