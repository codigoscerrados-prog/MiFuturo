"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./SeccionReservas.module.css";
import { apiFetch } from "@/lib/api";

type Cancha = {
    id: number;
    nombre: string;
    precio_hora: number;
    is_active: boolean;
    complejo_id?: number | null;
};

type PaymentStatus = "pendiente" | "parcial" | "pagada" | "cancelada";

type Reserva = {
    id: number;
    cancha_id: number;
    cancha_nombre?: string | null;
    start_at: string;
    end_at: string;
    total_amount: number;
    paid_amount: number;
    payment_method?: string | null;
    payment_status: PaymentStatus;
    notas?: string | null;

    // aliases (por compat)
    estado?: PaymentStatus | null;
    fecha_inicio?: string | null;
    fecha_fin?: string | null;
};

const TIME_SLOTS = [
    "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00",
    "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00",
] as const;
const SLOT_MINUTES = 30;
const DURATION_OPTIONS = [30, 60, 90, 120] as const;
const DEFAULT_DURATION_MINUTES = 60;


type CourtColorSet = {
    dot: string;
    dotSoft: string;
    softBg: string;
    border: string;
    text: string;
};

const COURT_COLORSETS: readonly CourtColorSet[] = [
    { dot: "#1fbe6a", dotSoft: "rgba(31,190,106,.65)", softBg: "rgba(31,190,106,.08)", border: "rgba(31,190,106,.35)", text: "#14532d" },
    { dot: "#14b8a6", dotSoft: "rgba(20,184,166,.65)", softBg: "rgba(20,184,166,.08)", border: "rgba(20,184,166,.35)", text: "#0f766e" },
    { dot: "#06b6d4", dotSoft: "rgba(6,182,212,.65)", softBg: "rgba(6,182,212,.08)", border: "rgba(6,182,212,.35)", text: "#155e75" },
    { dot: "#0ea5e9", dotSoft: "rgba(14,165,233,.65)", softBg: "rgba(14,165,233,.08)", border: "rgba(14,165,233,.35)", text: "#075985" },
    { dot: "#8b5cf6", dotSoft: "rgba(139,92,246,.65)", softBg: "rgba(139,92,246,.08)", border: "rgba(139,92,246,.35)", text: "#5b21b6" },
    { dot: "#d946ef", dotSoft: "rgba(217,70,239,.65)", softBg: "rgba(217,70,239,.08)", border: "rgba(217,70,239,.35)", text: "#86198f" },
    { dot: "#f59e0b", dotSoft: "rgba(245,158,11,.65)", softBg: "rgba(245,158,11,.10)", border: "rgba(245,158,11,.35)", text: "#92400e" },
    { dot: "#fb7185", dotSoft: "rgba(251,113,133,.65)", softBg: "rgba(251,113,133,.09)", border: "rgba(251,113,133,.35)", text: "#9f1239" },
] as const;

function cn(...arr: Array<string | false | null | undefined>) {
    return arr.filter(Boolean).join(" ");
}

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function ymd(date: Date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatDisplayDate(date: Date) {
    return date.toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
}

function startOfWeek(date: Date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d;
}

function parseHHMM(isoLike: string) {
    const d = new Date(isoLike);
    const hh = pad2(d.getHours());
    const mm = pad2(d.getMinutes());
    return `${hh}:${mm}`;
}

function addMinutesHHMM(hhmm: string, minutesToAdd: number) {
    const [h, m] = hhmm.split(":").map((x) => Number(x));
    const d = new Date(2000, 0, 1, h, m, 0);
    d.setMinutes(d.getMinutes() + minutesToAdd);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function hhmmToMinutes(hhmm: string) {
    const [h, m] = hhmm.split(":").map((x) => Number(x));
    return (h || 0) * 60 + (m || 0);
}

function minutesToHHMM(totalMinutes: number) {
    const normalized = ((totalMinutes % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${pad2(h)}:${pad2(m)}`;
}

function colorFromString(input: string) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = (hash * 31 + input.charCodeAt(i)) | 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 45%)`;
}

function formatDurationLabel(minutes: number) {
    if (minutes === 30) return "30 min";
    if (minutes === 60) return "1 h";
    if (minutes === 90) return "1 h 30 min";
    if (minutes === 120) return "2 h";
    return `${minutes} min`;
}

function normalizarTelefonoWhatsApp(raw: string | null | undefined) {
    const t = (raw || "").trim();
    if (!t) return null;

    const digits = t.replace(/[^\d]/g, "");
    if (!digits) return null;

    // Peru: 9 digitos que empiezan con 9 -> +51
    if (digits.length === 9 && digits.startsWith("9")) return `51${digits}`;

    // Si ya viene con pais o largo
    if (digits.length >= 10) return digits;

    return null;
}

function buildWhatsAppUrl(phone: string, message: string) {
    const encoded = encodeURIComponent(message);
    return `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`;
}

function formatWhatsAppDate(dateStr: string) {
    try {
        const d = new Date(`${dateStr}T00:00:00`);
        const txt = d.toLocaleDateString("es-PE", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "2-digit",
        });
        return txt.charAt(0).toUpperCase() + txt.slice(1);
    } catch {
        return dateStr;
    }
}

function buildWhatsAppConfirmMessage(params: {
    name: string;
    dateStr: string;
    startTime: string;
    endTime: string;
    courtName: string;
}) {
    const check = "\u2705";
    const cal = "\uD83D\uDCC5";
    const clock = "\u23F0";
    const stadium = "\uD83C\uDFDF\uFE0F";
    const soccer = "\u26BD";

    const saludo = params.name ? `Hola ${params.name}!` : "Hola!";
    const fecha = formatWhatsAppDate(params.dateStr);

    return (
        `${check} ${saludo} Tu reserva fue agendada y confirmada.\n\n` +
        `${cal} Fecha: *${fecha}*\n` +
        `${clock} Hora: *${params.startTime} - ${params.endTime}*\n` +
        `${stadium} Cancha: *${params.courtName}*\n\n` +
        `${soccer} Te esperamos.`
    );
}

const HALF_HOUR_SLOTS = TIME_SLOTS.flatMap((slot) => [
    slot,
    addMinutesHHMM(slot, SLOT_MINUTES),
]);
const HOUR_GROUPS = TIME_SLOTS;

function formatSlotRange(slot: string) {
    return `${slot} a ${addMinutesHHMM(slot, SLOT_MINUTES)}`;
}
const DAY_END_MINUTES =
    hhmmToMinutes(HALF_HOUR_SLOTS[HALF_HOUR_SLOTS.length - 1]) + SLOT_MINUTES;

function parseNotas(notas?: string | null) {
    const raw = (notas || "").trim();
    if (!raw) return { client_name: "", client_phone: "", notes: "" };

    const name = raw.match(/Cliente:\s*(.+)/i)?.[1]?.trim() || "";
    const phone = raw.match(/Tel:\s*(.+)/i)?.[1]?.trim() || "";
    const notes = raw.match(/Notas:\s*([\s\S]+)/i)?.[1]?.trim() || "";

    if (!name && !phone && !notes) return { client_name: "", client_phone: "", notes: raw };
    return { client_name: name, client_phone: phone, notes };
}

function buildNotas(clientName: string, clientPhone: string, extraNotes: string) {
    const n = clientName.trim();
    const p = clientPhone.trim();
    const x = extraNotes.trim();

    let out = "";
    if (n) out += `Cliente: ${n}\n`;
    if (p) out += `Tel: ${p}\n`;
    if (x) out += `Notas: ${x}\n`;

    return out.trim() || null;
}

function isActiveReservation(r: Reserva) {
    const st = (r.payment_status || r.estado) as PaymentStatus;
    return st !== "cancelada";
}

function statusLabel(st: PaymentStatus) {
    if (st === "pagada") return "Pagada";
    if (st === "parcial") return "Parcial";
    if (st === "cancelada") return "Cancelada";
    return "Pendiente";
}

function statusBadgeClass(st: PaymentStatus) {
    if (st === "pagada") return cn(styles.statusBadge, styles.statusOk);
    if (st === "parcial") return cn(styles.statusBadge, styles.statusWarn);
    if (st === "cancelada") return cn(styles.statusBadge, styles.statusOff);
    return cn(styles.statusBadge, styles.statusPending);
}

function eventCardClass(st: PaymentStatus) {
    if (st === "pagada") return cn(styles.eventCard, styles.eventOk);
    if (st === "parcial") return cn(styles.eventCard, styles.eventWarn);
    if (st === "cancelada") return cn(styles.eventCard, styles.eventOff);
    return cn(styles.eventCard, styles.eventPending);
}

export default function PanelReservasPropietario({ token }: { token: string }) {
    const [canchas, setCanchas] = useState<Cancha[]>([]);
    const [currentMonth, setCurrentMonth] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null);

    const [dayCache, setDayCache] = useState<Record<string, Reserva[]>>({});
    const [loadingMonth, setLoadingMonth] = useState(false);
    const [loadingDay, setLoadingDay] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editReserva, setEditReserva] = useState<Reserva | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Reserva | null>(null);

    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
    const toastTimerRef = useRef<number | null>(null);

    const [formCourtId, setFormCourtId] = useState<number | null>(null);
    const [formDate, setFormDate] = useState<string>("");
    const [formTime, setFormTime] = useState<string>(HALF_HOUR_SLOTS[0]);
    const [formDuration, setFormDuration] = useState<number>(DEFAULT_DURATION_MINUTES);
    const [formName, setFormName] = useState("");
    const [formPhone, setFormPhone] = useState("");
    const [formNotes, setFormNotes] = useState("");

    const selectedDateStr = useMemo(() => ymd(selectedDate), [selectedDate]);

    const canchaById = useMemo(() => {
        const m = new Map<number, Cancha>();
        canchas.forEach((c) => m.set(c.id, c));
        return m;
    }, [canchas]);

    const canchaColorById = useMemo(() => {
        const m = new Map<number, CourtColorSet>();
        canchas.forEach((c, i) => m.set(c.id, COURT_COLORSETS[i % COURT_COLORSETS.length]));
        return m;
    }, [canchas]);

    const canchasActivas = useMemo(() => canchas.filter((c) => c.is_active), [canchas]);

    const dayReservations = useMemo(() => (dayCache[selectedDateStr] || []).slice(), [dayCache, selectedDateStr]);
    const dayActiveReservations = useMemo(() => dayReservations.filter(isActiveReservation), [dayReservations]);

    const todayStr = useMemo(() => ymd(new Date()), []);
    const todayCount = useMemo(() => {
        const arr = dayCache[todayStr] || [];
        return arr.filter(isActiveReservation).length;
    }, [dayCache, todayStr]);


    const fetchCanchas = useCallback(async () => {
        const data = await apiFetch<Cancha[]>("/panel/canchas", { token });
        const arr = Array.isArray(data) ? data : [];
        setCanchas(arr);
        const activas = arr.filter((c) => c.is_active);
        if (!selectedCourtId && activas.length) setSelectedCourtId(activas[0].id);
    }, [token, selectedCourtId]);

    // ✅ día puntual (fallback/refresh)
    const fetchDay = useCallback(
        async (dateStr: string) => {
            const data = await apiFetch<Reserva[]>(
                `/panel/reservas?fecha=${encodeURIComponent(dateStr)}`,
                { token }
            );
            const arr = Array.isArray(data) ? data : [];
            setDayCache((prev) => ({ ...prev, [dateStr]: arr }));
            return arr;
        },
        [token]
    );

    const fetchDaySafe = useCallback(
        async (dateStr: string) => {
            try {
                return await fetchDay(dateStr);
            } catch {
                setDayCache((prev) => ({ ...prev, [dateStr]: prev[dateStr] || [] }));
                return [];
            }
        },
        [fetchDay]
    );

    // ✅ mes completo en 1 request
    const fetchMonthRange = useCallback(
        async (fromStr: string, toStr: string) => {
            const data = await apiFetch<Reserva[]>(
                `/panel/reservas/rango?from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}`,
                { token }
            );
            return Array.isArray(data) ? data : [];
        },
        [token]
    );

    useEffect(() => {
        (async () => {
            try {
                setError(null);
                await fetchCanchas();
            } catch (e: any) {
                setError(e?.message || "No se pudo cargar canchas.");
            }
        })();
    }, [fetchCanchas]);

    useEffect(() => {
        setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }, [selectedDate]);

    // ✅ carga mes (1 llamada) y llena dayCache por fecha
    useEffect(() => {
        (async () => {
            setLoadingMonth(true);
            try {
                const y = currentMonth.getFullYear();
                const m = currentMonth.getMonth();
                const fromStr = `${y}-${pad2(m + 1)}-01`;
                const lastDay = new Date(y, m + 1, 0).getDate();
                const toStr = `${y}-${pad2(m + 1)}-${pad2(lastDay)}`;

                const monthRows = await fetchMonthRange(fromStr, toStr);

                const grouped: Record<string, Reserva[]> = {};
                for (const r of monthRows) {
                    const ds = ymd(new Date(r.start_at));
                    if (!grouped[ds]) grouped[ds] = [];
                    grouped[ds].push(r);
                }

                // asegúrate que todos los días del mes existan (aunque sea vacío)
                for (let d = 1; d <= lastDay; d++) {
                    const ds = `${y}-${pad2(m + 1)}-${pad2(d)}`;
                    if (!grouped[ds]) grouped[ds] = [];
                }

                setDayCache((prev) => ({ ...prev, ...grouped }));
            } catch (e: any) {
                setError(e?.message || "No se pudo cargar reservas del mes.");
            } finally {
                setLoadingMonth(false);
            }
        })();
    }, [currentMonth, fetchMonthRange]);

    // ✅ si el día seleccionado no está (ej. cambio rápido), fallback a fetch puntual
    useEffect(() => {
        (async () => {
            try {
                setLoadingDay(true);
                setError(null);

                if (!dayCache[todayStr]) await fetchDaySafe(todayStr);
                if (!dayCache[selectedDateStr]) await fetchDaySafe(selectedDateStr);
            } finally {
                setLoadingDay(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDateStr, todayStr]);

    const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setToast(null), 3000);
    }, []);

    const occupiedSlotsByCourt = useMemo(() => {
        const map = new Map<number, Map<string, { res: Reserva; isStart: boolean }>>();
        for (const r of dayActiveReservations) {
            const startSlot = parseHHMM(r.start_at);
            const endSlot = parseHHMM(r.end_at);
            const startMin = hhmmToMinutes(startSlot);
            const endMin = hhmmToMinutes(endSlot);

            for (let t = startMin; t < endMin; t += SLOT_MINUTES) {
                const key = minutesToHHMM(t);
                if (!map.has(r.cancha_id)) map.set(r.cancha_id, new Map());
                map.get(r.cancha_id)!.set(key, { res: r, isStart: t === startMin });
            }
        }
        return map;
    }, [dayActiveReservations]);

    const reservationsForList = useMemo(() => {
        return dayActiveReservations
            .filter((r) => (r.payment_status || r.estado || "pendiente") !== "pagada")
            .slice()
            .sort((a, b) => parseHHMM(a.start_at).localeCompare(parseHHMM(b.start_at)));
    }, [dayActiveReservations]);

    const dayMetrics = useMemo(() => {
        const active = dayReservations.filter(isActiveReservation);
        const canceladas = dayReservations.filter((r) => (r.payment_status || r.estado) === "cancelada");
        const pagadas = active.filter((r) => (r.payment_status || r.estado) === "pagada");
        const pendientes = active.filter((r) => {
            const st = (r.payment_status || r.estado || "pendiente") as PaymentStatus;
            return st === "pendiente" || st === "parcial";
        });

        const totalPagado = pagadas.reduce((sum, r) => sum + Number(r.total_amount || 0), 0);
        const faltanCobrar = active.reduce((sum, r) => {
            const total = Number(r.total_amount || 0);
            const paid = Number(r.paid_amount || 0);
            return sum + Math.max(0, total - paid);
        }, 0);

        return {
            agendas: active.length,
            pagadasSoles: totalPagado,
            faltanCobrar,
            pendientes: pendientes.length,
            canceladas: canceladas.length,
        };
    }, [dayReservations]);


function selectDateByStr(dateStr: string) {
    const [yy, mm, dd] = dateStr.split("-").map((x) => Number(x));
    setSelectedDate(new Date(yy, mm - 1, dd));
}

function moveWeek(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta * 7);
    setSelectedDate(d);
}

    function openNewReservation(slot?: string) {
        if (!selectedCourtId && canchasActivas.length) setSelectedCourtId(canchasActivas[0].id);

        setEditReserva(null);
        setFormCourtId(selectedCourtId || (canchasActivas[0]?.id ?? null));
        setFormDate(selectedDateStr);
        setFormTime(slot || HALF_HOUR_SLOTS[0]);
        setFormDuration(DEFAULT_DURATION_MINUTES);
        setFormName("");
        setFormPhone("");
        setFormNotes("");
        setModalOpen(true);
    }

    function openNewReservationForCourt(courtId: number, slot?: string) {
        setSelectedCourtId(courtId);
        openNewReservation(slot);
        setFormCourtId(courtId);
    }

    function openEditReservation(r: Reserva) {
        const parsed = parseNotas(r.notas);
        const diffMs = new Date(r.end_at).getTime() - new Date(r.start_at).getTime();
        const diffMin = Math.max(SLOT_MINUTES, Math.round(diffMs / 60000));
        const normalizedDuration = DURATION_OPTIONS.includes(diffMin as (typeof DURATION_OPTIONS)[number])
            ? diffMin
            : DEFAULT_DURATION_MINUTES;
        setEditReserva(r);
        setFormCourtId(r.cancha_id);
        setFormDate(ymd(new Date(r.start_at)));
        setFormTime(parseHHMM(r.start_at));
        setFormDuration(normalizedDuration);
        setFormName(parsed.client_name || "");
        setFormPhone(parsed.client_phone || "");
        setFormNotes(parsed.notes || "");
        setModalOpen(true);
    }

    function requestDelete(r: Reserva) {
        setDeleteTarget(r);
        setDeleteOpen(true);
    }

    async function cancelReservation(r: Reserva) {
        await apiFetch(`/panel/reservas/${r.id}/cancelar`, { token, method: "PUT" });
        await fetchDaySafe(selectedDateStr);
        showToast("Reserva cancelada correctamente", "success");
    }

    async function markReservationPaid(r: Reserva) {
        try {
            await apiFetch(`/panel/reservas/${r.id}/pago`, {
                token,
                method: "PUT",
                body: JSON.stringify({ mark_paid_full: true }),
            });
            await fetchDaySafe(selectedDateStr);
            showToast("Pago registrado correctamente", "success");
        } catch (e: any) {
            showToast(e?.message || "No se pudo registrar el pago.", "error");
        }
    }

    function openWhatsAppConfirmation(params: {
        name: string;
        phone: string;
        dateStr: string;
        startTime: string;
        endTime: string;
        courtName: string;
    }) {
        const phone = normalizarTelefonoWhatsApp(params.phone);
        if (!phone) {
            showToast("Telefono invalido para WhatsApp.", "error");
            return;
        }

        const msg = buildWhatsAppConfirmMessage({
            name: params.name,
            dateStr: params.dateStr,
            startTime: params.startTime,
            endTime: params.endTime,
            courtName: params.courtName,
        });

        const url = buildWhatsAppUrl(phone, msg);
        window.open(url, "_blank", "noopener,noreferrer");
    }

    async function submitReservation() {
        if (!formCourtId) return showToast("Selecciona una cancha", "error");
        if (!formDate) return showToast("Selecciona fecha", "error");
        if (!formTime) return showToast("Selecciona horario", "error");
        const selectedOption = timeOptions.find((t) => t.slot === formTime);
        if (!selectedOption || selectedOption.disabled) {
            return showToast("Horario no disponible. Elige otro horario.", "error");
        }
        if (!formName.trim() || !formPhone.trim()) return showToast("Completa Nombre y Teléfono", "error");

        const cancha = canchaById.get(formCourtId);
        const total = cancha ? Number(cancha.precio_hora || 0) * (formDuration / 60) : 0;

        const start_at = `${formDate}T${formTime}:00`;
        const end_at = `${formDate}T${addMinutesHHMM(formTime, formDuration)}:00`;
        const notas = buildNotas(formName, formPhone, formNotes);

        const payload = {
            cancha_id: formCourtId,
            start_at,
            end_at,
            total_amount: total,
            paid_amount: 0,
            payment_method: null,
            payment_status: "pendiente" as PaymentStatus,
            notas,
            cliente_id: null,
        };

        if (editReserva) {
            const original = editReserva;
            try {
                await apiFetch(`/panel/reservas/${original.id}`, {
                    token,
                    method: "PUT",
                    body: JSON.stringify(payload),
                });
                await fetchDaySafe(ymd(new Date(start_at)));
                showToast("Reserva actualizada correctamente", "success");
                openWhatsAppConfirmation({
                    name: formName,
                    phone: formPhone,
                    dateStr: formDate,
                    startTime: formTime,
                    endTime: addMinutesHHMM(formTime, formDuration),
                    courtName: cancha?.nombre || "Cancha",
                });
                setModalOpen(false);
                setEditReserva(null);
                return;
            } catch {
                await apiFetch(`/panel/reservas/${original.id}/cancelar`, { token, method: "PUT" });
                await apiFetch("/panel/reservas", { token, method: "POST", body: JSON.stringify(payload) });
                await fetchDaySafe(ymd(new Date(start_at)));
                showToast("Reserva actualizada ✅", "success");
                openWhatsAppConfirmation({
                    name: formName,
                    phone: formPhone,
                    dateStr: formDate,
                    startTime: formTime,
                    endTime: addMinutesHHMM(formTime, formDuration),
                    courtName: cancha?.nombre || "Cancha",
                });
                setModalOpen(false);
                setEditReserva(null);
                return;
            }
        }

        await apiFetch("/panel/reservas", { token, method: "POST", body: JSON.stringify(payload) });
        await fetchDaySafe(formDate);
        showToast("Reserva creada correctamente", "success");
        openWhatsAppConfirmation({
            name: formName,
            phone: formPhone,
            dateStr: formDate,
            startTime: formTime,
            endTime: addMinutesHHMM(formTime, formDuration),
            courtName: cancha?.nombre || "Cancha",
        });
        setModalOpen(false);
    }

    const timeOptions = useMemo(() => {
        const dateStr = formDate || selectedDateStr;
        const day = dayCache[dateStr] || [];
        const booked = new Set<string>();
        const isToday = dateStr === todayStr;
        const nowLocal = new Date();
        const nowMin = nowLocal.getHours() * 60 + nowLocal.getMinutes();

        for (const r of day) {
            if (!isActiveReservation(r)) continue;
            if (r.cancha_id !== (formCourtId || selectedCourtId || 0)) continue;
            if (editReserva && r.id === editReserva.id) continue;

            const startSlot = parseHHMM(r.start_at);
            const endSlot = parseHHMM(r.end_at);
            const startMin = hhmmToMinutes(startSlot);
            const endMin = hhmmToMinutes(endSlot);

            for (let t = startMin; t < endMin; t += SLOT_MINUTES) {
                booked.add(minutesToHHMM(t));
            }
        }

        return HALF_HOUR_SLOTS.map((slot) => {
            const startMin = hhmmToMinutes(slot);
            const endMin = startMin + formDuration;
            if (endMin > DAY_END_MINUTES) return { slot, disabled: true, hidden: true };
            if (isToday && startMin + SLOT_MINUTES <= nowMin) return { slot, disabled: true, hidden: true };

            for (let t = startMin; t < endMin; t += SLOT_MINUTES) {
                if (booked.has(minutesToHHMM(t))) return { slot, disabled: true, hidden: false };
            }

            return { slot, disabled: false, hidden: false };
        }).filter((opt) => !opt.hidden);
    }, [dayCache, editReserva, formCourtId, selectedCourtId, formDate, selectedDateStr, formDuration, todayStr]);

    useEffect(() => {
        const current = timeOptions.find((t) => t.slot === formTime);
        if (!current || current.disabled) {
            const firstFree = timeOptions.find((t) => !t.disabled);
            if (firstFree) setFormTime(firstFree.slot);
        }
    }, [timeOptions, formTime]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setModalOpen(false);
                setDeleteOpen(false);
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);



    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const nowMs = now.getTime();
    const agendaSlotCount = HALF_HOUR_SLOTS.length;
    const agendaGridStyle = {
        gridTemplateColumns: `210px repeat(${agendaSlotCount}, minmax(120px, 1fr))`,
    };
    const agendaScrollHeight = Math.min(
        720,
        Math.max(320, 120 + canchasActivas.length * 90)
    );
    const agendaScrollStyle = { maxHeight: `${agendaScrollHeight}px`, paddingLeft: "0px" };
    const isSelectedToday = selectedDateStr === todayStr;
    const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
    const weekDates = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            return d;
        });
    }, [weekStart]);

    return (
        <div className={styles.shell}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <p className={styles.kicker}>Panel propietario</p>
                    <h1 className={styles.titulo}>Sistema de Reservas</h1>
                    <p className={styles.muted}>Agenda por cancha • calendario + horarios + reservas del día</p>
                </div>

                <div className={styles.headerBtns}>
                    <div className={styles.hoyPill} title="Reservas de hoy">
                        <span className={styles.pulseDot} />
                        <span className={styles.hoyText}>
                            {dayCache[todayStr] ? `${todayCount} reservas hoy` : "Cargando..."}
                        </span>
                    </div>

                    <button type="button" onClick={() => openNewReservation()} className={styles.btnPrimary}>
                        <span className={styles.btnIcon} aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                        </span>
                        Nueva reserva
                    </button>
                </div>
            </div>

            {error ? <div className={styles.alertError}>{error}</div> : null}

            {/* Main Grid */}
            <div className={styles.mainGrid}>

                {/* Lista del dÇða */}
                <section className={cn(styles.card, styles.cardList)}>
                    <div className={styles.listTop}>
                        <h2 className={styles.cardTitle}>Reservas del día</h2>
                        <span className={styles.counter}>{reservationsForList.length}</span>
                    </div>

                    <div className={styles.daySplit}>
                        <aside className={styles.dayMetrics} aria-label="Metricas del dia">
                            <div className={styles.metricsGrid}>
                                <div className={styles.metricCard}>
                                    <span className={styles.metricLabel}>Agendas del dia</span>
                                    <span className={styles.metricValue}>{dayMetrics.agendas}</span>
                                </div>
                                <div className={styles.metricCard}>
                                    <span className={styles.metricLabel}>Pagadas</span>
                                    <span className={styles.metricValue}>S/ {dayMetrics.pagadasSoles.toFixed(0)}</span>
                                </div>
                                <div className={styles.metricCard}>
                                    <span className={styles.metricLabel}>Faltan cobrar</span>
                                    <span className={styles.metricValue}>S/ {dayMetrics.faltanCobrar.toFixed(0)}</span>
                                </div>
                                <div className={styles.metricCard}>
                                    <span className={styles.metricLabel}>Pendientes</span>
                                    <span className={styles.metricValue}>{dayMetrics.pendientes}</span>
                                </div>
                                <div className={styles.metricCard}>
                                    <span className={styles.metricLabel}>Canceladas</span>
                                    <span className={styles.metricValue}>{dayMetrics.canceladas}</span>
                                </div>
                            </div>
                        </aside>

                        <div className={styles.dayCards}>
                            <div className={styles.listScroll}>
                                {reservationsForList.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <div className={styles.emptyIcon}>
                                            <svg viewBox="0 0 24 24">
                                                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <p className={styles.emptyText}>No hay reservas para este dia</p>
                                    </div>
                                ) : (
                                    reservationsForList.map((res) => {
                                        const cs = canchaColorById.get(res.cancha_id) || COURT_COLORSETS[0];
                                        const parsed = parseNotas(res.notas);
                                        const st = (res.payment_status || res.estado || "pendiente") as PaymentStatus;
                                        const badge = statusBadgeClass(st);
                                        const canPay = st !== "pagada" && st !== "cancelada";

                                        return (
                                            <div
                                                key={res.id}
                                                className={styles.reservationCard}
                                                style={{
                                                    ["--res-accent" as any]: cs.dot,
                                                    ["--res-accent-soft" as any]: cs.dotSoft,
                                                }}
                                            >
                                                <div className={styles.resTop}>
                                                    <div className={styles.resCourt}>
                                                        <span className={styles.resDot} style={{ backgroundColor: cs.dot }} />
                                                        <span>
                                                            {res.cancha_nombre || canchaById.get(res.cancha_id)?.nombre || "Cancha"}
                                                        </span>
                                                    </div>

                                                    <span className={styles.resTime}>{parseHHMM(res.start_at)}</span>
                                                </div>

                                                <h4 className={styles.resName}>{parsed.client_name || "Reserva"}</h4>
                                                <p className={styles.resPhone}>{parsed.client_phone || "-"}</p>

                                                {parsed.notes ? <p className={styles.resNotes}>"{parsed.notes}"</p> : null}

                                                <div className={styles.resBottom}>
                                                    <span className={badge}>
                                                        {statusLabel(st)} - S/ {Number(res.total_amount || 0).toFixed(0)}
                                                    </span>

                                                    <div className={styles.resActions}>
                                                        <button
                                                            type="button"
                                                            className={cn(styles.btnGhost, styles.btnPay, styles.btnIconOnly)}
                                                            onClick={() => markReservationPaid(res)}
                                                            aria-label="Cobrar"
                                                            title="Cobrar"
                                                            disabled={!canPay}
                                                        >
                                                            <i className="bi bi-cash-coin" aria-hidden="true"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={cn(styles.btnGhost, styles.btnIconOnly)}
                                                            onClick={() => openEditReservation(res)}
                                                            aria-label="Editar"
                                                            title="Editar"
                                                        >
                                                            <i className="bi bi-pencil" aria-hidden="true"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={cn(styles.btnDanger, styles.btnIconOnly)}
                                                            onClick={() => requestDelete(res)}
                                                            aria-label="Cancelar"
                                                            title="Cancelar"
                                                        >
                                                            <i className="bi bi-trash" aria-hidden="true"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Agenda */}
                <section className={styles.cardSchedule}>
                    <div className={styles.cardTop}>
                        <div>
                            <h2 className={styles.cardTitle}>Agenda del dia</h2>
                            <p className={styles.cardSubtitle}>
                                {formatDisplayDate(selectedDate)}
                                {loadingDay ? <span className={styles.loadingTag}> (cargando)</span> : null}
                            </p>
                        </div>

                        <div className={styles.viewTabs}>
                            <button type="button" className={styles.weekNavBtn} onClick={() => moveWeek(-1)} aria-label="Semana anterior">
                                <i className="bi bi-chevron-left" aria-hidden="true"></i>
                            </button>
                            <div className={styles.weekButtons}>
                                {weekDates.map((d) => {
                                    const ds = ymd(d);
                                    const label = d.toLocaleDateString("es-ES", { weekday: "short" });
                                    return (
                                        <button
                                            key={ds}
                                            type="button"
                                            className={cn(styles.weekBtn, ds == selectedDateStr && styles.weekBtnActive)}
                                            onClick={() => selectDateByStr(ds)}
                                        >
                                            <span className={styles.weekLabel}>{label}</span>
                                            <span className={styles.weekDay}>{d.getDate()}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <button type="button" className={styles.weekNavBtn} onClick={() => moveWeek(1)} aria-label="Semana siguiente">
                                <i className="bi bi-chevron-right" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>

                    {canchasActivas.length === 0 ? (
                        <div className={styles.timelineEmpty}>Aun no tienes canchas registradas.</div>
                    ) : (
                        <div className={styles.agendaScroll} style={agendaScrollStyle}>
                            <div className={styles.agendaGrid} style={agendaGridStyle}>
                                <div className={styles.gridCorner}>Cancha</div>
                                {HALF_HOUR_SLOTS.map((slot) => (
                                    <div key={slot} className={styles.gridTime}>
                                        {formatSlotRange(slot)}
                                    </div>
                                ))}

                                {canchasActivas.map((c) => {
                                    const cs = canchaColorById.get(c.id) || COURT_COLORSETS[0];
                                    const active = selectedCourtId === c.id;
                                    return (
                                        <Fragment key={c.id}>
                                            <div
                                                className={cn(styles.gridCourtLabel, active && styles.gridCourtLabelActive)}
                                                style={{ borderColor: cs.border }}
                                            >
                                                <span className={styles.gridCourtDot} style={{ backgroundColor: cs.dot }} />
                                                <span className={styles.gridCourtName}>{c.nombre}</span>
                                            </div>
                                            {HALF_HOUR_SLOTS.map((slot) => {
                                                const slotState = occupiedSlotsByCourt.get(c.id)?.get(slot);
                                                const slotStartMin = hhmmToMinutes(slot);
                                                const slotEndMin = slotStartMin + SLOT_MINUTES;
                                                const isPast = isSelectedToday && nowMinutes >= slotEndMin;

                                                if (slotState) {
                                                    const res = slotState.res;
                                                    const parsed = parseNotas(res.notas);
                                                    const clientKey = parsed.client_name || parsed.client_phone || String(res.id);
                                                    const clientColor = colorFromString(clientKey);
                                                    const clientName = parsed.client_name || "Cliente";
                                                    const st = (res.payment_status || res.estado || "pendiente") as PaymentStatus;
                                                    const statusText = statusLabel(st);
                                                    const endMs = new Date(res.end_at).getTime();
                                                    const remainingMinutes = (endMs - nowMs) / 60000;
                                                    const endingSoon = remainingMinutes > 0 && remainingMinutes <= 5;
                                                    return (
                                                        <div
                                                            key={`${slot}-${c.id}`}
                                                            className={cn(styles.gridSlot, styles.gridSlotReserved)}
                                                            style={{
                                                                ["--res-court-bg" as any]: cs.softBg,
                                                                ["--res-court-border" as any]: cs.border,
                                                                ["--res-client" as any]: clientColor,
                                                            }}
                                                        >
                                                            <button
                                                                type="button"
                                                                className={cn(
                                                                    styles.reservedBlock,
                                                                    st === "pagada" && styles.reservedBlockPaid,
                                                                    endingSoon && styles.reservedBlockEndingSoon
                                                                )}
                                                                onClick={() => openEditReservation(res)}
                                                                aria-label="Reservado"
                                                                title="Reservado"
                                                            >
                                                                <span className={styles.reservedLabel}>Reservado</span>
                                                                <span className={styles.reservedName}>{clientName}</span>
                                                                <span
                                                                    className={cn(
                                                                        styles.reservedStatus,
                                                                        st === "pagada" && styles.reservedStatusOk,
                                                                        st === "parcial" && styles.reservedStatusWarn,
                                                                        st === "cancelada" && styles.reservedStatusOff,
                                                                        st === "pendiente" && styles.reservedStatusPending
                                                                    )}
                                                                >
                                                                    {statusText}
                                                                </span>
                                                            </button>
                                                        </div>
                                                    );
                                                }

                                                if (isPast) {
                                                    return (
                                                        <div
                                                            key={`${slot}-${c.id}`}
                                                            className={cn(styles.gridSlot, styles.gridSlotPast)}
                                                        >
                                                            <span className={styles.slotFreeHint}>Horario pasado</span>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={`${slot}-${c.id}`} className={cn(styles.gridSlot, styles.gridSlotFree)}>
                                                        <button
                                                            type="button"
                                                            className={styles.slotButton}
                                                            onClick={() => openNewReservationForCourt(c.id, slot)}
                                                        >
                                                            <span className={styles.slotFreeHint}>Disponible</span>
                                                            <span className={styles.slotPlus} aria-hidden="true">
                                                                <svg className={styles.icon} viewBox="0 0 24 24">
                                                                    <path d="M12 5v14M5 12h14" />
                                                                </svg>
                                                            </span>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </section>

                
            </div>

            {/* Modal Crear/Editar */}
            {modalOpen ? (
                <div className={styles.overlay} role="dialog" aria-modal="true">
                    <div className={styles.backdrop} onClick={() => setModalOpen(false)} />
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>{editReserva ? "Editar reserva" : "Nueva reserva"}</h3>
                            <button type="button" className={styles.modalClose} onClick={() => setModalOpen(false)} aria-label="Cerrar">
                                ✕
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.field}>
                                <label className={styles.label}>Cancha</label>
                                <select
                                    value={String(formCourtId ?? "")}
                                    onChange={(e) => setFormCourtId(Number(e.target.value))}
                                    className={styles.select}
                                >
                                    {canchasActivas.map((c) => (
                                        <option key={c.id} value={String(c.id)}>
                                            {c.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>Fecha</label>
                                <input
                                    type="date"
                                    value={formDate}
                                    onChange={(e) => setFormDate(e.target.value)}
                                    className={styles.input}
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>Horario</label>
                                <select
                                    value={formTime}
                                    onChange={(e) => setFormTime(e.target.value)}
                                    className={styles.select}
                                >
                                    {timeOptions.map((t) => (
                                        <option key={t.slot} value={t.slot} disabled={t.disabled}>
                                            {t.slot} {t.disabled ? "(Ocupado)" : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>Duracion</label>
                                <select
                                    value={String(formDuration)}
                                    onChange={(e) => setFormDuration(Number(e.target.value))}
                                    className={styles.select}
                                >
                                    {DURATION_OPTIONS.map((minutes) => (
                                        <option key={minutes} value={String(minutes)}>
                                            {formatDurationLabel(minutes)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>Nombre del cliente</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Nombre completo"
                                    className={styles.input}
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>Teléfono</label>
                                <input
                                    type="tel"
                                    value={formPhone}
                                    onChange={(e) => setFormPhone(e.target.value)}
                                    placeholder="Número de contacto"
                                    className={styles.input}
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>Notas (opcional)</label>
                                <textarea
                                    rows={3}
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    placeholder="Información adicional…"
                                    className={styles.textarea}
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <button type="button" className={styles.btnGhost} onClick={() => setModalOpen(false)}>
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    className={styles.btnPrimary}
                                    onClick={async () => {
                                        try {
                                            await submitReservation();
                                        } catch (e: any) {
                                            showToast(e?.message || "Error al guardar", "error");
                                        }
                                    }}
                                >
                                    Guardar
                                </button>
                            </div>

                            <p className={styles.help}>* Se reserva por el tiempo elegido. (Luego lo hacemos configurable si quieres)</p>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Confirmación cancelar */}
            {deleteOpen && deleteTarget ? (
                <div className={styles.overlay} role="dialog" aria-modal="true">
                    <div className={styles.backdrop} onClick={() => setDeleteOpen(false)} />
                    <div className={styles.confirm}>
                        <div className={styles.confirmIcon}>!</div>
                        <h3 className={styles.confirmTitle}>¿Cancelar reserva?</h3>
                        <p className={styles.confirmText}>Esta acción no se puede deshacer.</p>

                        <div className={styles.modalActions}>
                            <button type="button" className={styles.btnGhost} onClick={() => setDeleteOpen(false)}>
                                Volver
                            </button>

                            <button
                                type="button"
                                className={styles.btnDanger}
                                onClick={async () => {
                                    try {
                                        await cancelReservation(deleteTarget);
                                        setDeleteOpen(false);
                                        setDeleteTarget(null);
                                    } catch (e: any) {
                                        showToast(e?.message || "Error al cancelar", "error");
                                    }
                                }}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Toast */}
            {toast ? (
                <div className={cn(styles.toastWrap, toast.type === "error" ? styles.toastError : styles.toastOk)}>
                    <div className={styles.toastIcon}>{toast.type === "error" ? "✕" : "✓"}</div>
                    <div className={styles.toastText}>{toast.msg}</div>
                </div>
            ) : null}
        </div>
    );
}
