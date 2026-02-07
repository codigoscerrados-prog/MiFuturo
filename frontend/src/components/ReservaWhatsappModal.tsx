"use client";

import Script from "next/script";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "@/secciones/BusquedaDeCancha/BusquedaDeCancha.module.css";
import { apiFetch } from "@/lib/api";

type CanchaLite = {
    id: number;
    nombre: string;
    tipo?: string | null;
    pasto?: string | null;
    precioHora?: number | null;
};

type ComplejoLite = {
    nombre: string;
    distrito?: string | null;
    provincia?: string | null;
    departamento?: string | null;
    verificado: boolean;
    propietarioPhone?: string | null;
    precioMin?: number | null;
    precioMax?: number | null;
    canchas: CanchaLite[];
    culqiEnabled?: boolean;
    culqiPk?: string | null;
};

type HorarioSlot = {
    hora: string;
    ocupado: boolean;
};

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

function formatDuracion(duracionHoras: number) {
    if (!duracionHoras || duracionHoras <= 0) return "";
    return duracionHoras === 1 ? "1 hora" : `${duracionHoras} horas`;
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

function normalizarTelefonoWhatsApp(raw: string | null | undefined) {
    const t = (raw || "").trim();
    if (!t) return null;

    const digits = t.replace(/[^\d]/g, "");
    if (!digits) return null;

    if (digits.length === 9 && digits.startsWith("9")) return `51${digits}`;
    if (digits.length >= 10) return digits;
    return null;
}

function buildWhatsAppUrl(phone: string, message: string) {
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${phone}?text=${encoded}`;
}

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

function buildDateTimeISO(fechaISO: string, hora: string) {
    return new Date(`${fechaISO}T${hora}:00`).toISOString();
}

function moneyPE(n: number) {
    try {
        return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n);
    } catch {
        return `S/ ${n.toFixed(0)}`;
    }
}

function construirMensajeWhatsApp(
    c: CanchaLite,
    complejo: ComplejoLite,
    fechaISO: string,
    hora: string,
    duracionHoras: number
) {
    const lugar = [complejo.distrito, complejo.provincia, complejo.departamento].filter(Boolean).join(", ");
    const fechaHumana = formatoFechaHumana(fechaISO);
    const duracionTxt = formatDuracion(duracionHoras);
    const zona = lugar || "Lima";
    const precio = `S/ ${Number(c.precioHora || 0).toFixed(0)}/h`;
    const total = typeof c.precioHora === "number" ? `S/ ${(c.precioHora * duracionHoras).toFixed(0)}` : "S/ --";
    const tipo = c.tipo ? `${c.tipo} • ${c.pasto || ""}`.trim() : "Por confirmar";
    const wave = "👋";
    const sparkles = "✨";
    const soccer = "⚽";
    const stadium = "🏟️";
    const pin = "📍";
    const target = "🎯";
    const money = "💸";
    const check = "✅";
    const fire = "🔥";
    const thanks = "🙏";
    const calendar = "📅";
    const clock = "⏰";
    const chat = "💬";
    return (
        `Hola ${wave}${sparkles}\n` +
        `Vengo de *CanchaPro* ${soccer} y vi su publicación para reservar ${fire}\n\n` +
        `${stadium} *Cancha:* ${c.nombre}\n` +
        `${pin} *Zona:* ${zona}\n` +
        `${target} *Tipo:* ${tipo}\n` +
        `${money} *Precio:* ${precio}\n` +
        `${money} *Total:* ${total}\n\n` +
        `${calendar} *Fecha:* ${fechaHumana}\n` +
        `${clock} *Hora:* ${hora}\n` +
        (duracionTxt ? `${target} *Duración:* ${duracionTxt}\n\n` : "\n") +
        `${check} ¿Está disponible en ese horario?\n` +
        `${chat} Si me confirmas, lo reservo de inmediato.\n\n` +
        `${thanks} ¡Gracias! Quedo atento(a).`
    );
}

function construirMensajeWhatsAppEstandar(
    complejo: ComplejoLite,
    fechaISO: string,
    hora: string,
    duracionHoras: number
) {
    const lugar = [complejo.distrito, complejo.provincia, complejo.departamento].filter(Boolean).join(", ");
    const fechaHumana = formatoFechaHumana(fechaISO);
    const duracionTxt = formatDuracion(duracionHoras);
    const zona = lugar || "Lima";
    const precio =
        typeof complejo.precioMin === "number" && typeof complejo.precioMax === "number"
            ? `S/ ${Math.round(complejo.precioMin)} - ${Math.round(complejo.precioMax)}/h`
            : typeof complejo.precioMin === "number"
            ? `S/ ${Math.round(complejo.precioMin)}/h`
            : "S/ --";
    const total =
        typeof complejo.precioMin === "number"
            ? `S/ ${Math.round(complejo.precioMin * Math.max(1, duracionHoras))}`
            : "S/ --";
    const wave = "👋";
    const sparkles = "✨";
    const soccer = "⚽";
    const stadium = "🏟️";
    const pin = "📍";
    const target = "🎯";
    const money = "💸";
    const check = "✅";
    const fire = "🔥";
    const thanks = "🙏";
    const calendar = "📅";
    const clock = "⏰";
    const chat = "💬";
    return (
        `Hola ${wave}${sparkles}\n` +
        `Vengo de *CanchaPro* ${soccer} y vi su publicación para reservar ${fire}\n\n` +
        `${stadium} *Complejo:* ${complejo.nombre}\n` +
        `${pin} *Zona:* ${zona}\n` +
        `${money} *Precio:* ${precio}\n` +
        `${money} *Total:* ${total}\n\n` +
        `${calendar} *Fecha:* ${fechaHumana}\n` +
        `${clock} *Hora:* ${hora}\n` +
        (duracionTxt ? `${target} *Duración:* ${duracionTxt}\n\n` : "\n") +
        `${check} ¿Está disponible en ese horario?\n` +
        `${chat} Si me confirmas, lo reservo de inmediato.\n\n` +
        `${thanks} ¡Gracias! Quedo atento(a).`
    );
}

export default function ReservaWhatsappModal({
    open,
    onClose,
    complejo,
}: {
    open: boolean;
    onClose: () => void;
    complejo: ComplejoLite | null;
}) {
    const [reservaCanchaId, setReservaCanchaId] = useState<number | null>(null);
    const [reservaFecha, setReservaFecha] = useState("");
    const [reservaDuracion, setReservaDuracion] = useState(1);
    const [reservaError, setReservaError] = useState<string | null>(null);
    const [reservaOk, setReservaOk] = useState<string | null>(null);
    const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
    const [horariosSlots, setHorariosSlots] = useState<HorarioSlot[]>(() =>
        DEFAULT_HORARIOS.map((hora) => ({ hora, ocupado: false }))
    );
    const [horariosLoading, setHorariosLoading] = useState(false);
    const [horariosError, setHorariosError] = useState("");
    const [email, setEmail] = useState("");
    const [pagando, setPagando] = useState(false);
    const [culqiReady, setCulqiReady] = useState(false);
    const [deviceId, setDeviceId] = useState("");
    const culqiRef = useRef<any>(null);
    const paymentRef = useRef<{
        cancha_id: number;
        start_at: string;
        end_at: string;
        email: string;
    } | null>(null);

    const canchaSeleccionada = useMemo(() => {
        if (!complejo || !complejo.verificado) return null;
        if (reservaCanchaId) {
            const match = complejo.canchas.find((c) => c.id === reservaCanchaId);
            if (match) return match;
        }
        return complejo.canchas[0] || null;
    }, [complejo, reservaCanchaId]);

    const totalReserva = useMemo(() => {
        if (!canchaSeleccionada || typeof canchaSeleccionada.precioHora !== "number") return null;
        const horas = selectedSlots.length || reservaDuracion;
        return canchaSeleccionada.precioHora * horas;
    }, [canchaSeleccionada, reservaDuracion, selectedSlots]);

    useEffect(() => {
        if (!open || !complejo) return;
        setReservaError(null);
        setReservaOk(null);
        setEmail("");
        setReservaDuracion(1);
        setReservaCanchaId(complejo.verificado ? (complejo.canchas[0]?.id ?? null) : null);
        const today = new Date();
        const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        setReservaFecha(iso);
        setHorariosSlots(DEFAULT_HORARIOS.map((hora) => ({ hora, ocupado: false })));
        setSelectedSlots(DEFAULT_HORARIOS.slice(0, 1));
        setHorariosError("");
        setHorariosLoading(false);
    }, [open, complejo]);

    useEffect(() => {
        if (!open || !complejo) return;
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
    }, [canchaSeleccionada, reservaFecha, open, complejo]);

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

    function formatSelectedRange() {
        const start = selectedSlots[0];
        if (!start) return "Selecciona en la agenda";
        return buildHoraRango(start, reservaDuracion, horariosSlots);
    }

    const handleCulqiAction = useCallback(async () => {
        const culqi = culqiRef.current;
        if (!culqi) return;

        if (culqi.error) {
            const msg = culqi.error.user_message || culqi.error.message || "No se pudo procesar el pago.";
            setReservaError(msg);
            setPagando(false);
            return;
        }

        if (culqi.token?.id && paymentRef.current) {
            try {
                setReservaError(null);
                setReservaOk(null);
                setPagando(true);

                try {
                    await apiFetch("/payments/culqi/charge", {
                        method: "POST",
                        body: JSON.stringify({
                            token_id: culqi.token.id,
                            cancha_id: paymentRef.current.cancha_id,
                            start_at: paymentRef.current.start_at,
                            end_at: paymentRef.current.end_at,
                            email: paymentRef.current.email,
                            device_id: deviceId,
                        }),
                    });
                } catch (err: any) {
                    if (err?.message === "3DS_REQUIRED") {
                        const culqi3ds = (window as any).Culqi3DS;
                        if (!culqi3ds) throw err;
                        const auth = await culqi3ds.initAuthentication(culqi.token.id);
                        await apiFetch("/payments/culqi/charge", {
                            method: "POST",
                            body: JSON.stringify({
                                token_id: culqi.token.id,
                                cancha_id: paymentRef.current.cancha_id,
                                start_at: paymentRef.current.start_at,
                                end_at: paymentRef.current.end_at,
                                email: paymentRef.current.email,
                                device_id: deviceId,
                                authentication_3ds: auth,
                            }),
                        });
                    } else {
                        throw err;
                    }
                }

                setReservaOk("Pago realizado. Tu reserva fue registrada.");
                if (typeof culqi.close === "function") {
                    culqi.close();
                }
                onClose();
            } catch (e: any) {
                setReservaError(e?.message || "No se pudo procesar el pago.");
            } finally {
                setPagando(false);
            }
        }
    }, [onClose]);

    function confirmarReservaWhatsApp() {
        if (!complejo) return;
        const esEstandar = !complejo.verificado;
        let cancha: CanchaLite | null = null;

        if (!esEstandar) {
            cancha = complejo.canchas.find((c) => c.id === reservaCanchaId) || complejo.canchas[0] || null;
            if (!cancha) {
                setReservaError("No se encontró la cancha seleccionada.");
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

        const phone = normalizarTelefonoWhatsApp(complejo.propietarioPhone);
        if (!phone) {
            setReservaError("Este complejo no tiene WhatsApp configurado.");
            return;
        }

        const horasSeleccionadas = selectedSlots.length || reservaDuracion;
        const horaRango = buildHoraRango(horaSeleccionada, horasSeleccionadas, horariosSlots);
        const msg = esEstandar
            ? construirMensajeWhatsAppEstandar(complejo, reservaFecha, horaRango, horasSeleccionadas)
            : construirMensajeWhatsApp(cancha as CanchaLite, complejo, reservaFecha, horaRango, horasSeleccionadas);
        const url = buildWhatsAppUrl(phone, msg);
        window.open(url, "_blank", "noopener,noreferrer");
        onClose();
    }

    function abrirPagoCulqi() {
        if (!complejo) return;
        if (!complejo.culqiEnabled || !complejo.culqiPk) {
            setReservaError("Este complejo no tiene Culqi activo.");
            return;
        }
        if (!culqiReady || typeof window === "undefined") {
            setReservaError("Culqi no está listo aún. Intenta otra vez.");
            return;
        }

        const cancha = canchaSeleccionada;
        if (!cancha || typeof cancha.precioHora !== "number") {
            setReservaError("No se encontró la cancha o el precio.");
            return;
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
        if (!email.trim()) {
            setReservaError("Ingresa tu correo para el pago.");
            return;
        }

        const horas = selectedSlots.length || reservaDuracion;
        const total = cancha.precioHora * horas;
        const amountCents = Math.max(1, Math.round(total * 100));

        const startISO = buildDateTimeISO(reservaFecha, horaSeleccionada);
        const endDate = new Date(new Date(startISO).getTime() + horas * 60 * 60 * 1000);
        const endISO = endDate.toISOString();

        paymentRef.current = {
            cancha_id: cancha.id,
            start_at: startISO,
            end_at: endISO,
            email: email.trim(),
        };

        const CulqiCheckout = (window as any).CulqiCheckout;
        if (!CulqiCheckout) {
            setReservaError("No se pudo cargar Culqi Checkout.");
            return;
        }

        const config = {
            settings: {
                title: complejo.nombre,
                currency: "PEN",
                amount: amountCents,
            },
            options: {
                lang: "es",
                installments: false,
                paymentMethods: {
                    tarjeta: true,
                    yape: true,
                    bancaMovil: false,
                    agente: false,
                    billetera: false,
                    cuotealo: false,
                },
            },
        };

        const instance = new CulqiCheckout(complejo.culqiPk, config);
        instance.culqi = handleCulqiAction;
        culqiRef.current = instance;
        instance.open();
    }

    if (!open || !complejo) return null;

    return (
        <div
            className={styles.modalOverlay}
            style={{ zIndex: 110000 }}
            role="dialog"
            aria-modal="true"
            aria-label="Reservar por WhatsApp"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <Script src="https://js.culqi.com/checkout-js" strategy="afterInteractive" onLoad={() => setCulqiReady(true)} />
            <Script
                src="https://3ds.culqi.com"
                strategy="afterInteractive"
                onLoad={() => {
                    const pk = complejo?.culqiPk || "";
                    const culqi3ds = (window as any).Culqi3DS;
                    if (pk && culqi3ds) {
                        culqi3ds.publicKey = pk;
                        const maybe = culqi3ds.generateDevice?.();
                        if (maybe && typeof maybe.then === "function") {
                            maybe.then((id: string) => setDeviceId(id)).catch(() => {});
                        } else if (typeof maybe === "string") {
                            setDeviceId(maybe);
                        }
                    }
                }}
            />
            <div className={`card border-0 shadow-lg ${styles.modalCard} ${styles.modalCardLarge}`}>
                <div className={`d-flex gap-3 justify-content-between align-items-start ${styles.modalHeader}`}>
                    <div>
                        <p className={styles.modalKicker}>Reservar</p>
                        <h3 className={styles.modalTitle}>{complejo.nombre}</h3>
                        <p className={styles.modalSub}>
                            {complejo.culqiEnabled && complejo.culqiPk
                                ? "Elige la cancha, fecha y hora. Luego podrás pagar en línea."
                                : complejo.verificado
                                ? "Elige la cancha, fecha y hora. Se enviará en el mensaje al propietario."
                                : "Elige fecha y hora. Se enviará en el mensaje al propietario."}
                        </p>
                    </div>

                    <button className={`btn btn-sm btn-light border ${styles.modalClose}`} type="button" onClick={onClose} aria-label="Cerrar">
                        ✕
                    </button>
                </div>

                {reservaError ? (
                    <div className={`alert alert-danger d-flex align-items-start gap-2 rounded-4 ${styles.modalError}`}>
                        <i className="bi bi-exclamation-triangle-fill mt-1" aria-hidden="true"></i>
                        <span>{reservaError}</span>
                    </div>
                ) : null}
                {reservaOk ? (
                    <div className={`alert alert-success d-flex align-items-start gap-2 rounded-4 ${styles.modalError}`}>
                        <i className="bi bi-check-circle-fill mt-1" aria-hidden="true"></i>
                        <span>{reservaOk}</span>
                    </div>
                ) : null}

                <div className={styles.modalScroll}>
                    <div className={styles.reservaLayout}>
                        <div className={styles.modalGrid}>
                            {complejo.verificado && (
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
                                        {complejo.canchas.map((c) => (
                                            <option key={c.id} value={String(c.id)}>
                                                {c.nombre} • {c.tipo || "Cancha"} • {moneyPE(Number(c.precioHora || 0))}
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
                                    <i className="bi bi-hourglass-split me-2" aria-hidden="true"></i>
                                    Duración
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
                                            setReservaError("Ese rango no está disponible.");
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

                            {complejo.culqiEnabled && complejo.culqiPk ? (
                                <label className={styles.modalField}>
                                    <span className={styles.modalLabel}>
                                        <i className="bi bi-envelope me-2" aria-hidden="true"></i>
                                        Correo
                                    </span>
                                    <input
                                        className="form-control form-control-sm rounded-3"
                                        type="email"
                                        placeholder="tucorreo@ejemplo.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </label>
                            ) : null}

                            <div className={styles.modalField}>
                                <span className={styles.modalLabel}>Hora seleccionada</span>
                                <div className={styles.modalStatic}>
                                    {formatSelectedRange()}
                                </div>
                            </div>
                            {complejo.verificado ? (
                                <div className={styles.modalField}>
                                    <span className={styles.modalLabel}>Total</span>
                                    <div className={styles.modalStatic}>
                                        {totalReserva != null ? moneyPE(totalReserva) : "S/ --"}
                                    </div>
                                </div>
                            ) : null}
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
                                                        setReservaError("Ese rango no está disponible.");
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
                </div>

                <div className={`d-flex justify-content-end gap-2 flex-wrap ${styles.modalBtns}`}>
                    <button className="btn btn-outline-secondary rounded-pill px-3" type="button" onClick={onClose}>
                        Cancelar
                    </button>
                    {complejo.culqiEnabled && complejo.culqiPk ? (
                        <button
                            className={`btn rounded-pill px-3 ${styles.ctaGreen}`}
                            type="button"
                            onClick={abrirPagoCulqi}
                            disabled={pagando}
                        >
                            <i className="bi bi-credit-card-2-front me-2" aria-hidden="true"></i>
                            {pagando ? "Procesando..." : "Pagar con Culqi"}
                        </button>
                    ) : (
                        <button className={`btn rounded-pill px-3 ${styles.ctaGreen}`} type="button" onClick={confirmarReservaWhatsApp}>
                            <i className="bi bi-whatsapp me-2" aria-hidden="true"></i>
                            Enviar WhatsApp
                        </button>
                    )}
                </div>

                <p className={styles.modalTiny}>
                    {complejo.culqiEnabled && complejo.culqiPk
                        ? "Tu pago se procesará de forma segura con Culqi."
                        : "Tip: puedes editar el texto antes de enviarlo en WhatsApp."}
                </p>
            </div>
        </div>
    );
}
