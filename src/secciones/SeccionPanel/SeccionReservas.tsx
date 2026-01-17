"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

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

function parseHHMM(isoLike: string) {
    const d = new Date(isoLike);
    const hh = pad2(d.getHours());
    const mm = pad2(d.getMinutes());
    return `${hh}:${mm}`;
}

function addHoursHHMM(hhmm: string, hoursToAdd: number) {
    const [h, m] = hhmm.split(":").map((x) => Number(x));
    const d = new Date(2000, 0, 1, h, m, 0);
    d.setHours(d.getHours() + hoursToAdd);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

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
    const [formTime, setFormTime] = useState<string>(TIME_SLOTS[0]);
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

    const monthYearLabel = useMemo(() => {
        return `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
    }, [currentMonth]);

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

    const calendarCells = useMemo(() => {
        const y = currentMonth.getFullYear();
        const m = currentMonth.getMonth();
        const firstDayIndex = new Date(y, m, 1).getDay(); // 0=Dom
        const daysInMonth = new Date(y, m + 1, 0).getDate();

        const cells: Array<{ type: "empty" } | { type: "day"; day: number; dateStr: string }> = [];
        for (let i = 0; i < firstDayIndex; i++) cells.push({ type: "empty" });
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${y}-${pad2(m + 1)}-${pad2(day)}`;
            cells.push({ type: "day", day, dateStr });
        }
        return cells;
    }, [currentMonth]);

    const bookedBySlotForSelectedCourt = useMemo(() => {
        const map = new Map<string, Reserva>();
        if (!selectedCourtId) return map;
        for (const r of dayActiveReservations) {
            if (r.cancha_id !== selectedCourtId) continue;
            map.set(parseHHMM(r.start_at), r);
        }
        return map;
    }, [dayActiveReservations, selectedCourtId]);

    const reservationsForList = useMemo(() => {
        return dayActiveReservations
            .slice()
            .sort((a, b) => parseHHMM(a.start_at).localeCompare(parseHHMM(b.start_at)));
    }, [dayActiveReservations]);

    function changeMonth(delta: number) {
        setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    }

    function selectDateByStr(dateStr: string) {
        const [yy, mm, dd] = dateStr.split("-").map((x) => Number(x));
        setSelectedDate(new Date(yy, mm - 1, dd));
    }

    function openNewReservation(slot?: string) {
        if (!selectedCourtId && canchasActivas.length) setSelectedCourtId(canchasActivas[0].id);

        setEditReserva(null);
        setFormCourtId(selectedCourtId || (canchasActivas[0]?.id ?? null));
        setFormDate(selectedDateStr);
        setFormTime(slot || TIME_SLOTS[0]);
        setFormName("");
        setFormPhone("");
        setFormNotes("");
        setModalOpen(true);
    }

    function openEditReservation(r: Reserva) {
        const parsed = parseNotas(r.notas);
        setEditReserva(r);
        setFormCourtId(r.cancha_id);
        setFormDate(ymd(new Date(r.start_at)));
        setFormTime(parseHHMM(r.start_at));
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

    async function submitReservation() {
        if (!formCourtId) return showToast("Selecciona una cancha", "error");
        if (!formDate) return showToast("Selecciona fecha", "error");
        if (!formTime) return showToast("Selecciona horario", "error");
        if (!formName.trim() || !formPhone.trim()) return showToast("Completa Nombre y Teléfono", "error");

        const cancha = canchaById.get(formCourtId);
        const total = cancha ? Number(cancha.precio_hora || 0) : 0;

        const start_at = `${formDate}T${formTime}:00`;
        const end_at = `${formDate}T${addHoursHHMM(formTime, 1)}:00`;
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
                setModalOpen(false);
                setEditReserva(null);
                return;
            } catch {
                await apiFetch(`/panel/reservas/${original.id}/cancelar`, { token, method: "PUT" });
                await apiFetch("/panel/reservas", { token, method: "POST", body: JSON.stringify(payload) });
                await fetchDaySafe(ymd(new Date(start_at)));
                showToast("Reserva actualizada ✅", "success");
                setModalOpen(false);
                setEditReserva(null);
                return;
            }
        }

        await apiFetch("/panel/reservas", { token, method: "POST", body: JSON.stringify(payload) });
        await fetchDaySafe(formDate);
        showToast("Reserva creada correctamente", "success");
        setModalOpen(false);
    }

    const timeOptions = useMemo(() => {
        const dateStr = formDate || selectedDateStr;
        const day = dayCache[dateStr] || [];
        const booked = new Set<string>();

        for (const r of day) {
            if (!isActiveReservation(r)) continue;
            if (r.cancha_id !== (formCourtId || selectedCourtId || 0)) continue;
            booked.add(parseHHMM(r.start_at));
        }

        if (editReserva) booked.delete(parseHHMM(editReserva.start_at));
        return TIME_SLOTS.map((slot) => ({ slot, disabled: booked.has(slot) }));
    }, [dayCache, editReserva, formCourtId, selectedCourtId, formDate, selectedDateStr]);

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

    function isTodayDateStr(ds: string) {
        return ds === todayStr;
    }
    function isSelectedDateStr(ds: string) {
        return ds === selectedDateStr;
    }

    function dayDots(dateStr: string) {
        const arr = (dayCache[dateStr] || []).filter(isActiveReservation);
        if (!arr.length) return [];

        const uniqueCourtIds: number[] = [];
        for (const r of arr) {
            if (!uniqueCourtIds.includes(r.cancha_id)) uniqueCourtIds.push(r.cancha_id);
            if (uniqueCourtIds.length >= 3) break;
        }
        return uniqueCourtIds.map((id) => canchaColorById.get(id) || COURT_COLORSETS[0]);
    }

    const now = new Date();
    const isSelectedToday = selectedDateStr === todayStr;

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
                {/* Calendar */}
                <section className={cn(styles.card, styles.cardCalendar)}>
                    <div className={styles.calendarTop}>
                        <button type="button" onClick={() => changeMonth(-1)} className={styles.iconBtn} aria-label="Mes anterior">
                            <svg className={styles.icon} viewBox="0 0 24 24">
                                <path d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div className={styles.calendarTitle}>
                            {monthYearLabel}
                            {loadingMonth ? <span className={styles.loadingTag}> (cargando)</span> : null}
                        </div>

                        <button type="button" onClick={() => changeMonth(1)} className={styles.iconBtn} aria-label="Mes siguiente">
                            <svg className={styles.icon} viewBox="0 0 24 24">
                                <path d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    <div className={styles.weekdays}>
                        <span className={styles.weekday}>Dom</span>
                        <span className={styles.weekday}>Lun</span>
                        <span className={styles.weekday}>Mar</span>
                        <span className={styles.weekday}>Mié</span>
                        <span className={styles.weekday}>Jue</span>
                        <span className={styles.weekday}>Vie</span>
                        <span className={styles.weekday}>Sáb</span>
                    </div>

                    <div className={styles.calendarGrid}>
                        {calendarCells.map((cell, idx) => {
                            if (cell.type === "empty") return <div key={`e-${idx}`} className={styles.calendarEmpty} />;

                            const ds = cell.dateStr;
                            const dots = dayDots(ds);
                            const isToday = isTodayDateStr(ds);
                            const isSelected = isSelectedDateStr(ds);

                            return (
                                <button
                                    key={ds}
                                    type="button"
                                    className={cn(
                                        styles.calendarDay,
                                        isToday && styles.calendarDayToday,
                                        isSelected && styles.calendarDaySelected
                                    )}
                                    onClick={() => selectDateByStr(ds)}
                                    aria-pressed={isSelected}
                                >
                                    <span className={styles.calendarDayNum}>{cell.day}</span>

                                    {dots.length ? (
                                        <span className={styles.dots} aria-hidden="true">
                                            {dots.map((cset, i) => (
                                                <span
                                                    key={`${ds}-dot-${i}`}
                                                    className={styles.dot}
                                                    style={{ backgroundColor: cset.dotSoft }}
                                                />
                                            ))}
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>

                    <div className={styles.divisor} />

                    <div className={styles.legendTop}>
                        <h3 className={styles.legendTitle}>Canchas</h3>
                        <span className={styles.legendHint}>Colores por cancha</span>
                    </div>

                    {canchasActivas.length === 0 ? (
                        <div className={styles.legendEmpty}>Aún no tienes canchas registradas.</div>
                    ) : (
                        <div className={styles.legendList}>
                            {canchasActivas.map((c) => {
                                const cs = canchaColorById.get(c.id) || COURT_COLORSETS[0];
                                return (
                                    <div key={c.id} className={styles.legendItem}>
                                        <div className={styles.legendLeft}>
                                            <span className={styles.legendDot} style={{ backgroundColor: cs.dot }} />
                                            <span className={styles.legendName}>{c.nombre}</span>
                                        </div>
                                        <span className={styles.legendPrice}>S/ {Number(c.precio_hora || 0).toFixed(0)}/h</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Agenda */}
                <section className={cn(styles.card, styles.cardSchedule)}>
                    <div className={styles.cardTop}>
                        <div>
                            <h2 className={styles.cardTitle}>Agenda del día</h2>
                            <p className={styles.cardSubtitle}>
                                {formatDisplayDate(selectedDate)}
                                {loadingDay ? <span className={styles.loadingTag}> (cargando)</span> : null}
                            </p>
                        </div>
                    </div>

                    <div className={styles.courtTabs}>
                        {canchasActivas.map((c) => {
                            const cs = canchaColorById.get(c.id) || COURT_COLORSETS[0];
                            const active = selectedCourtId === c.id;

                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    className={cn(styles.canchaTab, active && styles.canchaTabActive)}
                                    onClick={() => setSelectedCourtId(c.id)}
                                    style={{
                                        borderColor: active ? cs.border : undefined,
                                        background: active ? cs.softBg : undefined,
                                        color: active ? cs.text : undefined,
                                    }}
                                    aria-pressed={active}
                                    title={c.nombre}
                                >
                                    <span className={styles.canchaDot} style={{ backgroundColor: cs.dot }} />
                                    <span className={styles.canchaLabel}>{c.nombre}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className={styles.agendaScroll}>
                        {TIME_SLOTS.map((slot) => {
                            const res = bookedBySlotForSelectedCourt.get(slot) || null;
                            const slotHour = Number(slot.split(":")[0] || 0);
                            const isPast = isSelectedToday && slotHour <= now.getHours();

                            if (res) {
                                const parsed = parseNotas(res.notas);
                                const st = (res.payment_status || res.estado || "pendiente") as PaymentStatus;
                                const badge = statusBadgeClass(st);

                                return (
                                    <div key={slot} className={cn(styles.timeSlot, styles.slotBooked)}>
                                        <div className={styles.slotRow}>
                                            <div className={styles.slotLeft}>
                                                <span className={styles.slotHour}>{slot}</span>
                                                <div className={styles.slotMeta}>
                                                    <p className={styles.slotName}>{parsed.client_name || "Reserva"}</p>
                                                    <p className={styles.slotPhone}>{parsed.client_phone || "—"}</p>
                                                </div>
                                            </div>

                                            <div className={styles.actions}>
                                                <button
                                                    type="button"
                                                    className={styles.iconBtn}
                                                    onClick={() => openEditReservation(res)}
                                                    title="Editar"
                                                >
                                                    <svg className={styles.icon} viewBox="0 0 24 24">
                                                        <path d="M15.232 5.232l3.536 3.536M16.732 3.732a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>

                                                <button
                                                    type="button"
                                                    className={cn(styles.iconBtn, styles.iconBtnDanger)}
                                                    onClick={() => requestDelete(res)}
                                                    title="Cancelar"
                                                >
                                                    <svg className={styles.icon} viewBox="0 0 24 24">
                                                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        <div className={styles.slotBottom}>
                                            <span className={badge}>
                                                {statusLabel(st)} • S/ {Number(res.total_amount || 0).toFixed(0)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            }

                            if (isPast) {
                                return (
                                    <div key={slot} className={cn(styles.timeSlot, styles.slotPast)}>
                                        <div className={styles.slotRow}>
                                            <div className={styles.slotLeft}>
                                                <span className={styles.slotHour}>{slot}</span>
                                                <span className={styles.slotFreeHint}>Horario pasado</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <button
                                    key={slot}
                                    type="button"
                                    className={cn(styles.timeSlot, styles.slotFree)}
                                    onClick={() => openNewReservation(slot)}
                                >
                                    <div className={styles.slotRow}>
                                        <div className={styles.slotLeft}>
                                            <span className={styles.slotHour}>{slot}</span>
                                            <span className={styles.slotFreeHint}>Disponible</span>
                                        </div>

                                        <span className={styles.slotPlus} aria-hidden="true">
                                            <svg className={styles.icon} viewBox="0 0 24 24">
                                                <path d="M12 5v14M5 12h14" />
                                            </svg>
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Lista del día */}
                <section className={cn(styles.card, styles.cardList)}>
                    <div className={styles.listTop}>
                        <h2 className={styles.cardTitle}>Reservas del día</h2>
                        <span className={styles.counter}>{reservationsForList.length}</span>
                    </div>

                    <div className={styles.listScroll}>
                        {reservationsForList.length === 0 ? (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyIcon}>
                                    <svg viewBox="0 0 24 24">
                                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <p className={styles.emptyText}>No hay reservas para este día</p>
                            </div>
                        ) : (
                            reservationsForList.map((res) => {
                                const cs = canchaColorById.get(res.cancha_id) || COURT_COLORSETS[0];
                                const parsed = parseNotas(res.notas);
                                const st = (res.payment_status || res.estado || "pendiente") as PaymentStatus;
                                const badge = statusBadgeClass(st);

                                return (
                                    <div key={res.id} className={styles.reservationCard}>
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
                                        <p className={styles.resPhone}>{parsed.client_phone || "—"}</p>

                                        {parsed.notes ? <p className={styles.resNotes}>"{parsed.notes}"</p> : null}

                                        <div className={styles.resBottom}>
                                            <span className={badge}>
                                                {statusLabel(st)} • S/ {Number(res.total_amount || 0).toFixed(0)}
                                            </span>

                                            <div className={styles.resActions}>
                                                <button type="button" className={styles.btnGhost} onClick={() => openEditReservation(res)}>
                                                    Editar
                                                </button>
                                                <button type="button" className={styles.btnDanger} onClick={() => requestDelete(res)}>
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
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

                            <p className={styles.help}>* Se reserva por 1 hora. (Luego lo hacemos configurable si quieres)</p>
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
