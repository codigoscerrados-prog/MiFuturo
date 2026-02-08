"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import styles from "./SeccionPanel.module.css";

import { clearToken, getRoleFromToken, getToken, isTokenExpired, rutaPorRole } from "@/lib/auth";
import { apiFetch, apiUrl } from "@/lib/api";
import BrandLogo from "@/components/BrandLogo";

const SectionFallback = () => (
    <div className={`tarjeta ${styles.tarjeta}`}>
        <p className={styles.muted}>Cargando...</p>
    </div>
);

const SeccionPerfil = dynamic(() => import("./SeccionPerfil"), { loading: SectionFallback });
const SeccionComplejos = dynamic(() => import("./SeccionComplejos"), { loading: SectionFallback });
const PanelCanchasPropietario = dynamic(() => import("./SeccionCanchas"), { loading: SectionFallback });
const PanelReservasPropietario = dynamic(() => import("./SeccionReservas"), { loading: SectionFallback });
const SeccionPagos = dynamic(() => import("./SeccionPagos"), { loading: SectionFallback });
const SeccionFacturacion = dynamic(() => import("./SeccionFacturacion"), { loading: SectionFallback });
const SeccionUtilitarios = dynamic(() => import("./SeccionUtilitarios"), { loading: SectionFallback });

const PRO_PRICE_TEXT = "S/ 59.90 / mes";
const PRO_AMOUNT_CENTS = 5990;

export type Role = "usuario" | "propietario" | "admin";

export type PlanActual = {
    plan_id: number;
    plan_codigo?: string | null;
    plan_nombre?: string | null;
    estado?: string | null;
    proveedor?: string | null;
    trial_disponible?: boolean | null;
    trial_expirado?: boolean | null;
    inicio?: string | null;
    fin?: string | null;
    dias_restantes?: number | null;
    culqi_estado?: string | null;
    culqi_mensaje?: string | null;
};

type HistorialRegistro = {
    id: number;
    cliente: string;
    cancha: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    estado: string;
    precio: number;
    metodo?: string | null;
    referencia?: string | null;
    startAt?: string | null;
    endAt?: string | null;
};

export type Perfil = {
    id: number;
    username: string;
    role: Role;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    email?: string | null;
    business_name?: string | null;
    jugador_categoria?: string | null;
    jugador_posicion?: string | null;
    avatar_url?: string | null;
};

export type SeccionPanelProps = {
    token?: string;
    role?: Role;
    perfil?: Perfil;
    onPerfilUpdated?: Dispatch<SetStateAction<Perfil | null>> | ((p: Perfil | null) => void);
    onLogout?: () => void;
};

function cn(...arr: Array<string | false | null | undefined>) {
    return arr.filter(Boolean).join(" ");
}

function normalizeStatus(st?: string | null) {
    return String(st || "active").toLowerCase();
}

function formatMoney(value?: number | null) {
    if (typeof value === "number") {
        return `S/ ${value.toFixed(2)}`;
    }
    return "S/ 0.00";
}

function formatDateLabel(value?: string | null) {
    if (!value) return "-";
    const d = new Date(value);
    return d.toLocaleDateString("es-PE");
}

function formatTimeLabel(value?: string | null) {
    if (!value) return "-";
    const d = new Date(value);
    return d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

const ICON_BY_TAB: Record<string, string> = {
    perfil: "bi-person",
    "mi-complejo": "bi-building",
    "mis-canchas": "bi-grid-1x2",
    reservas: "bi-calendar2-check",
    pagos: "bi-credit-card-2-front",
    historial: "bi-clock-history",
    utilitarios: "bi-tools",
    admin: "bi-shield-check",
};

const WHATSAPP_PAY_URL =
    "https://wa.me/51922023667?text=Hola%20CanchasPro%2C%20quiero%20pagar%20mi%20plan%20PRO";

const TRIAL_PAYMENT_LABEL = "S/ 59.90";

export default function SeccionPanel({
    token: tokenProp,
    role: roleProp,
    perfil: perfilProp,
    onPerfilUpdated,
    onLogout,
}: SeccionPanelProps) {
    const router = useRouter();

    const [token, setToken] = useState<string | null>(() => tokenProp ?? null);

    useEffect(() => {
        const t = tokenProp ?? getToken();
        if (t && isTokenExpired(t)) {
            clearToken();
            router.push("/iniciar-sesion");
            return;
        }
        setToken(t);
    }, [tokenProp, router]);

    const role = useMemo<Role>(() => {
        if (roleProp) return roleProp;
        const r = getRoleFromToken(token || "");
        return (r as Role) || "usuario";
    }, [roleProp, token]);

    // Siempre iniciar en Perfil
    const initialTabSet = useRef(false);
    const [tab, setTab] = useState<string>("perfil");
    useEffect(() => {
        if (initialTabSet.current) return;
        initialTabSet.current = true;
        setTab("perfil");
    }, []);

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [perfil, setPerfil] = useState<Perfil | null>(() => perfilProp ?? null);
    const [plan, setPlan] = useState<PlanActual | null>(null);
    const [planLoading, setPlanLoading] = useState(true);
    const [historial, setHistorial] = useState<HistorialRegistro[]>([]);
    const [historialLoading, setHistorialLoading] = useState(false);
    const [historialError, setHistorialError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDateStart, setFilterDateStart] = useState("");
    const [filterDateEnd, setFilterDateEnd] = useState("");
    const emisionLabel = useMemo(
        () => new Date().toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" }),
        []
    );

    const [showProModal, setShowProModal] = useState(false);
    const autoOpenedRef = useRef(false);
    const [culqiReady, setCulqiReady] = useState(false);
    const [pagandoPro, setPagandoPro] = useState(false);
    const [activandoTrial, setActivandoTrial] = useState(false);
    const culqiRef = useRef<any>(null);

    useEffect(() => {
        if (perfilProp) setPerfil(perfilProp);
    }, [perfilProp]);

    const isPro = useMemo(() => {
        if (!plan) return false;
        const codigo = String(plan.plan_codigo || "").toLowerCase();
        const nombre = String(plan.plan_nombre || "").toLowerCase();
        return plan.plan_id === 2 || codigo.includes("pro") || nombre.includes("pro");
    }, [plan]);
    useEffect(() => {
        if (autoOpenedRef.current) return;
        if (role === "propietario" && !isPro && plan?.trial_expirado) {
            autoOpenedRef.current = true;
            setShowProModal(true);
        }
    }, [role, isPro, plan?.trial_expirado]);

    useEffect(() => {
        if (!showProModal || !culqiReady || typeof window === "undefined") return;
        const pk = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY || "";
        if (!pk) {
            setError("Falta configurar la llave pública de Culqi.");
            return;
        }
        const CulqiCheckout = (window as any).CulqiCheckout;
        if (!CulqiCheckout) {
            setError("No se pudo cargar Culqi Checkout.");
            return;
        }

        const config = {
            settings: {
                title: "Plan PRO",
                currency: "PEN",
                amount: PRO_AMOUNT_CENTS,
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

        const instance = new CulqiCheckout(pk, config);
        instance.culqi = async () => {
            const culqi = instance;
            if (culqi.error) {
                const msg = culqi.error.user_message || culqi.error.message || "No se pudo procesar el pago.";
                setError(msg);
                setPagandoPro(false);
                return;
            }
            if (!culqi.token?.id) return;
            const t = token || getToken();
            if (!t) {
                router.push("/iniciar-sesion");
                return;
            }
            try {
                setPagandoPro(true);
                setError(null);
                setOk(null);
                culqiRef.current?.close?.();
                await apiFetch("/payments/culqi/subscribe", {
                    token: t,
                    method: "POST",
                    body: JSON.stringify({ token_id: culqi.token.id }),
                });
                const p = await apiFetch<PlanActual>("/perfil/plan", { token: t });
                setPlan(p);
                setOk("Pago en proceso. Te avisaremos cuando se active PRO.");
                setShowProModal(false);
                router.refresh();
                if (typeof window !== "undefined") {
                    const startedAt = Date.now();
                    const interval = window.setInterval(async () => {
                        if (!token) return;
                        try {
                            const latest = await apiFetch<PlanActual>("/perfil/plan", { token });
                            setPlan(latest);
                            const codigo = String(latest?.plan_codigo || "").toLowerCase();
                            const nombre = String(latest?.plan_nombre || "").toLowerCase();
                            const isProNow =
                                latest?.plan_id === 2 || codigo.includes("pro") || nombre.includes("pro");
                            if (isProNow && (latest?.estado || "").toLowerCase() === "activa") {
                                window.clearInterval(interval);
                                window.location.reload();
                                return;
                            }
                        } catch {
                            // ignore and keep polling
                        }
                        if (Date.now() - startedAt > 60000) {
                            window.clearInterval(interval);
                        }
                    }, 4000);
                }
            } catch (e: any) {
                setError(e?.message || "No se pudo activar PRO.");
            } finally {
                culqiRef.current?.close?.();
                setPagandoPro(false);
            }
        };
        culqiRef.current = instance;
    }, [showProModal, culqiReady, router, token]);

    const nombreCompleto = useMemo(() => {
        const first = (perfil?.first_name || "").trim();
        const last = (perfil?.last_name || "").trim();
        return [first, last].filter(Boolean).join(" ");
    }, [perfil?.first_name, perfil?.last_name]);

    const displayName = useMemo(() => {
        return (
            nombreCompleto ||
            (perfil?.business_name || "").trim() ||
            (perfil?.username || "").trim() ||
            (perfil?.email || "").trim() ||
            "-"
        );
    }, [nombreCompleto, perfil?.business_name, perfil?.username, perfil?.email]);

    const normalizedPlanStatus = normalizeStatus(plan?.estado);
    const isTrial = (plan?.proveedor || "").toLowerCase() === "trial";
    const showTrialCallout =
        isPro && isTrial && normalizedPlanStatus === "activa" && plan?.dias_restantes != null && plan.dias_restantes > 0;
    const planLabel = useMemo(() => {
        if (planLoading) return "...";
        if (!isPro) return "FREE";
        return showTrialCallout ? "TRIAL" : "PRO";
    }, [isPro, planLoading, showTrialCallout]);
    const planChipLabelText = planLoading
        ? "PLAN"
        : isPro
            ? showTrialCallout
                ? "PLAN PRO"
                : "PLAN PRO"
            : "PLAN FREE";
    const planChipClass = cn(
        styles.planChip,
        planLoading && styles.planChipLoading,
        !planLoading &&
            (isPro
                ? showTrialCallout
                    ? styles.planChipProTrial
                    : styles.planChipPro
                : styles.planChipFree)
    );
    const trialDaysRemaining = showTrialCallout && plan?.dias_restantes != null ? plan.dias_restantes : null;

    useEffect(() => {
        if (!token) {
            setCargando(false);
            return;
        }

        (async () => {
            try {
                setError(null);
                setCargando(true);
                setPlanLoading(true);

                const me = await apiFetch<Perfil>("/perfil/me", { token });
                setPerfil(me);

                try {
                    const p = await apiFetch<PlanActual>("/perfil/plan", { token });
                    setPlan(p);
                } catch {
                    setPlan(null);
                } finally {
                    setPlanLoading(false);
                }
            } catch (e: any) {
                setError(e?.message || "No se pudo cargar el panel.");
                setPlanLoading(false);
            } finally {
                setCargando(false);
            }
        })();
    }, [token]);

    function cerrarSesion() {
        if (onLogout) return onLogout();
        clearToken();
        router.push("/");
    }

    function handleSelectTab(nextTab: string) {
        if (
            role === "propietario" &&
            !isPro &&
            (nextTab === "mis-canchas" || nextTab === "reservas" || nextTab === "historial" || nextTab === "facturacion")
        ) {
            router.push("/plan-premium");
            return;
        }
        setTab(nextTab);
    }

    function buildHistorialExportQuery() {
        const params = new URLSearchParams();
        const term = searchTerm.trim();
        if (term) params.set("search", term);
        if (filterDateStart) params.set("fecha_inicio", filterDateStart);
        if (filterDateEnd) params.set("fecha_fin", filterDateEnd);
        const qs = params.toString();
        return qs ? `?${qs}` : "";
    }

    async function handleExportHistorial(format: "excel" | "pdf") {
        const extension = format === "excel" ? "xlsx" : "pdf";
        const url = apiUrl(`/panel/reservas/export.${extension}${buildHistorialExportQuery()}`);
        if (!token) {
            setHistorialError("Necesitas iniciar sesión para exportar.");
            return;
        }

        try {
            setHistorialError(null);
            const res = await fetch(url, {
                headers: {
                    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
                },
            });
            if (!res.ok) {
                const msg = await res.text().catch(() => "");
                throw new Error(msg || `No se pudo exportar (${res.status}).`);
            }

            const blob = await res.blob();
            const disposition = res.headers.get("content-disposition") || "";
            const match = disposition.match(/filename="?([^"]+)"?/i);
            const filename = match?.[1] || `reservas.${extension}`;

            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(link.href);
        } catch (e: any) {
            setHistorialError(e?.message || "No se pudo exportar el archivo.");
        }
    }

    function openProModal() {
        setError(null);
        setShowProModal(true);
    }

    async function activarTrialDesdePanel() {
        const t = token || getToken();
        if (!t) return router.push("/iniciar-sesion");
        try {
            setError(null);
            setOk(null);
            setActivandoTrial(true);
            await apiFetch("/perfil/plan/activar-pro-trial", { token: t, method: "POST" });
            const p = await apiFetch<PlanActual>("/perfil/plan", { token: t });
            setPlan(p);
            setOk("Listo ✅ Activaste tu prueba PRO.");
        } catch (e: any) {
            setError(e?.message || "No se pudo activar la prueba PRO.");
        } finally {
            setActivandoTrial(false);
        }
    }

    function resetHistorialFilters() {
        setSearchTerm("");
        setFilterDateStart("");
        setFilterDateEnd("");
    }

    const tabs = useMemo(() => {
        if (role === "propietario") {
            return [
                { key: "perfil", label: "Perfil", locked: false },
                { key: "mi-complejo", label: "Mi Complejo", locked: false },
                { key: "mis-canchas", label: "Mis Canchas", locked: !isPro },
                { key: "reservas", label: "Reservas", locked: !isPro },
                { key: "pagos", label: "Pagos", locked: !isPro },
                { key: "facturacion", label: "Facturación", locked: !isPro },
                { key: "historial", label: "Historial", locked: !isPro },
                { key: "utilitarios", label: "Utilitarios", locked: !isPro },
            ];
        }
        if (role === "usuario") {
            return [
                { key: "perfil", label: "Perfil", locked: false },
                { key: "historial", label: "Mis Reservas", locked: false },
            ];
        }
        return [{ key: "admin", label: "Admin", locked: false }];
    }, [role, isPro]);

    // Si el tab actual no existe, volver a Perfil
    useEffect(() => {
        if (!tabs.some((t) => t.key === tab)) setTab("perfil");
    }, [tabs, tab]);

    const filteredHistorial = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        const startFilterDate = filterDateStart ? filterDateStart : null;
        const endFilterDate = filterDateEnd ? filterDateEnd : null;

        return historial.filter((row) => {
            const normalized = `${row.cliente} ${row.cancha} ${row.estado}`.toLowerCase();
            if (term && !normalized.includes(term)) return false;

            if (!row.startAt) return false;
            const rowDateStr = row.startAt.slice(0, 10);
            if (startFilterDate && rowDateStr < startFilterDate) return false;
            if (endFilterDate && rowDateStr > endFilterDate) return false;
            return true;
        });
    }, [historial, searchTerm, filterDateStart, filterDateEnd]);

    useEffect(() => {
        if (role !== "propietario" || tab !== "historial" || !token) return;
        let activo = true;
        setHistorialLoading(true);
        setHistorialError(null);
        apiFetch<HistorialRegistro[]>("/panel/reservas", { token })
            .then((data) => {
                if (!activo) return;
                const array = Array.isArray(data) ? data : [];
                    const normalized = array.map((item) => {
                        const start = (item as any).start_at || (item as any).fecha_inicio || null;
                        const end = (item as any).end_at || (item as any).fecha_fin || null;
                        const precioRaw = Number(
                            (item as any).total_amount ?? (item as any).precio ?? (item as any).price ?? 0
                        );
                        const cliente =
                        (item as any).nombre_cliente ||
                        (item as any).client_name ||
                        (item as any).cliente ||
                        String(item.id || "-");
                        return {
                            id: item.id,
                            cliente,
                            cancha:
                                (item as any).cancha_nombre ||
                                (item as any).cancha?.nombre ||
                                String((item as any).cancha_id || "-"),
                            fecha: formatDateLabel(start),
                            hora_inicio: formatTimeLabel(start),
                            hora_fin: formatTimeLabel(end),
                            estado: normalizeStatus(
                                (item as any).estado ||
                                (item as any).payment_status ||
                                (item as any).status ||
                                "pendiente"
                            ),
                            precio: Number.isFinite(precioRaw) ? precioRaw : 0,
                            metodo: (item as any).payment_method || (item as any).metodo || null,
                            referencia: (item as any).payment_ref || (item as any).referencia || null,
                            startAt: start,
                            endAt: end,
                        };
                    });
                setHistorial(normalized);
            })
            .catch((e: any) => {
                if (!activo) return;
                setHistorialError(e?.message || "No se pudo cargar el historial.");
            })
            .finally(() => {
                if (!activo) return;
                setHistorialLoading(false);
            });
        return () => {
            activo = false;
        };
    }, [role, tab, token]);

    if (!token) {
        return (
            <section className={styles.seccion}>
                <div className={styles.contenedor}>
                    <div className={`tarjeta ${styles.tarjeta}`}>
                        <h2 className={styles.titulo}>Panel</h2>
                        <p className={styles.muted}>Debes iniciar sesión para ver tu panel.</p>
                        <div className={styles.filaBtns}>
                            <button className="boton botonPrimario" onClick={() => router.push("/auth/login")}>
                                Ir a Login
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className={styles.seccion}>
            <div className={styles.contenedor}>
                <div className={`${styles.layout} ${sidebarOpen ? styles.layoutOpen : styles.layoutCollapsed}`}>
                    <aside id="panel-sidebar" className={styles.sidebar}>
                        <div className={styles.sidebarCard}>
                            <Link className={styles.brandLink} href="/" aria-label="Ir al inicio">
                                <div className={styles.brand}>
                                    <BrandLogo variant="icon" size="sm" className={styles.brandLogo} />
                                    <div>
                                        <p className={styles.kicker}>Proyecto Canchas</p>
                                        <p className={styles.brandTitle}>Panel</p>
                                    </div>
                                </div>
                            </Link>

                            <details className={styles.sidebarNav} open>
                                <summary className={styles.sidebarSummary}>
                                    <i className="bi bi-list" aria-hidden="true"></i>
                                    Panel
                                </summary>
                                <nav className={styles.tabs}>
                                    {tabs.map((t) => (
                                        <button
                                            key={t.key}
                                            type="button"
                                            className={cn(styles.tab, tab === t.key && styles.tabActiva, t.locked && styles.tabLocked)}
                                            onClick={() => handleSelectTab(t.key)}
                                            title={t.locked ? "Disponible solo en PRO" : t.label}
                                        >
                                            <span className={styles.tabLeft}>
                                                <i className={`bi ${ICON_BY_TAB[t.key] || "bi-grid"} ${styles.tabIcon}`} aria-hidden="true"></i>
                                                <span>{t.label}</span>
                                            </span>
                                            {t.locked ? <span className={styles.lockBadge}>PRO</span> : null}
                                        </button>
                                    ))}
                                </nav>
                            </details>

                            <div id="panel-reservas-calendar-slot" className={styles.sidebarCalendarSlot} />

                            <div className={styles.sidebarFooter}>
                                <button type="button" className={styles.sidebarLogout} onClick={cerrarSesion}>
                                    <i className="bi bi-door-open" aria-hidden="true"></i>
                                    <span className={styles.sidebarLogoutText}>Cerrar sesión</span>
                                </button>
                            </div>
                        </div>
                    </aside>

                    <div className={styles.main}>
                        <div className={styles.header}>
                            

                            <div className={styles.headerBtns}>
                                <button
                                    type="button"
                                    className={styles.sidebarToggle}
                                    onClick={() => setSidebarOpen((v) => !v)}
                                    aria-expanded={sidebarOpen}
                                    aria-controls="panel-sidebar"
                                >
                                    <i className={`bi ${sidebarOpen ? "bi-layout-sidebar-inset" : "bi-layout-sidebar"}`} aria-hidden="true"></i>
                                    {sidebarOpen ? "Ocultar menú" : "Mostrar menú"}
                                </button>
                                {role === "propietario" && !planLoading && !isPro && plan?.trial_disponible ? (
                                    <button
                                        type="button"
                                        className={`boton botonPrimario ${styles.upgradeBtn}`}
                                        onClick={activarTrialDesdePanel}
                                    >
                                        {activandoTrial ? "Activando…" : "Prueba PRO 30 días gratis"}
                                    </button>
                                ) : role === "propietario" && !planLoading && !isPro && !plan?.trial_expirado ? (
                                    <button
                                        type="button"
                                        className={`boton botonPrimario ${styles.upgradeBtn}`}
                                        onClick={openProModal}
                                    >
                                        Subir a PRO
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        {showTrialCallout ? (
                            <div className={styles.trialCallout}>
                                <p className={styles.trialText}>
                                    {trialDaysRemaining === 1
                                        ? "Queda 1 día de trial PRO."
                                        : `Tu prueba PRO termina en ${trialDaysRemaining} días.`}
                                </p>
                            </div>
                        ) : null}

                        {role === "propietario" && !isPro && plan?.trial_expirado ? (
                            <div className={styles.trialCallout}>
                                <p className={styles.trialText}>Tu prueba PRO terminó. Activa PRO para continuar.</p>
                                <button
                                    type="button"
                                    className={`boton botonPrimario ${styles.trialBtn}`}
                                    onClick={openProModal}
                                >
                                    PAGAR AHORA · {TRIAL_PAYMENT_LABEL}
                                </button>
                            </div>
                        ) : null}

                        {role === "propietario" &&
                        !isPro &&
                        (plan?.culqi_estado === "pendiente" || plan?.culqi_estado === "rechazada") ? (
                            <div className={styles.trialCallout}>
                                <p className={styles.trialText}>¿Tu pago no se completó? Reintenta con otra tarjeta.</p>
                                <button
                                    type="button"
                                    className={`boton botonPrimario ${styles.trialBtn}`}
                                    onClick={openProModal}
                                >
                                    REINTENTAR PAGO
                                </button>
                            </div>
                        ) : null}

                        {error ? <div className={styles.alertError}>{error}</div> : null}
                        {!error && plan?.culqi_mensaje ? (
                            <div className={styles.alertError}>{plan.culqi_mensaje}</div>
                        ) : null}
                        {ok ? <div className={styles.alertOk}>{ok}</div> : null}

                        {showProModal ? (
                            <div className={styles.proModalOverlay} onMouseDown={(e) => e.target === e.currentTarget && setShowProModal(false)}>
                                <Script src="https://js.culqi.com/checkout-js" strategy="afterInteractive" onLoad={() => setCulqiReady(true)} />
                                <div className={styles.proModal}>
                                    <div className={styles.proModalHeader}>
                                        <h3>Plan PRO</h3>
                                        <button type="button" className={styles.proModalClose} onClick={() => setShowProModal(false)}>
                                            Cerrar
                                        </button>
                                    </div>
                                    <div className={styles.proModalBody}>
                                        <div className={styles.proBenefits}>
                                            <div className={styles.proBadge}>PRO</div>
                                            <h4 className={styles.proTitle}>Eleva tu complejo</h4>
                                            <p className={styles.proPrice}>Luego {PRO_PRICE_TEXT}</p>
                                            <div className={styles.proList}>
                                                <div className={styles.proItem}>
                                                    <span className={styles.proIcon}><i className="bi bi-building" aria-hidden="true"></i></span>
                                                    <span>Publica más complejos y canchas</span>
                                                </div>
                                                <div className={styles.proItem}>
                                                    <span className={styles.proIcon}><i className="bi bi-credit-card" aria-hidden="true"></i></span>
                                                    <span>Reservas y pagos en línea</span>
                                                </div>
                                                <div className={styles.proItem}>
                                                    <span className={styles.proIcon}><i className="bi bi-graph-up" aria-hidden="true"></i></span>
                                                    <span>Historial y reportes en el panel</span>
                                                </div>
                                                <div className={styles.proItem}>
                                                    <span className={styles.proIcon}><i className="bi bi-headset" aria-hidden="true"></i></span>
                                                    <span>Soporte prioritario</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={styles.proCheckout}>
                                            <p className={styles.proCheckoutText}>Paga con Culqi y activa PRO al instante.</p>
                                            <button
                                                type="button"
                                                className={`boton botonPrimario ${styles.proPayBtn}`}
                                                onClick={() => culqiRef.current?.open?.()}
                                                disabled={!culqiReady || pagandoPro}
                                            >
                                                {pagandoPro ? "Procesando..." : `Pagar ${PRO_PRICE_TEXT}`}
                                            </button>
                                            <p className={styles.proNote}>Cancelas cuando quieras. Sin permanencia.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        
                        {cargando ? (
                            <div className={`tarjeta ${styles.tarjeta}`}>
                                <p className={styles.muted}>Cargando...</p>
                            </div>
                        ) : (
                            <>
                                {role === "propietario" && tab === "mi-complejo" ? (
                                    <div className={styles.sectionWrap}>
                                        <SeccionComplejos token={token} />
                                    </div>
                                ) : null}
                                {role === "propietario" && tab === "mis-canchas" ? (
                                    <div className={styles.sectionWrap}>
                                        <PanelCanchasPropietario token={token} />
                                    </div>
                                ) : null}
                                {role === "propietario" && tab === "reservas" ? (
                                    <div className={styles.sectionWrap}>
                                        <PanelReservasPropietario token={token} />
                                    </div>
                                ) : null}
                                {role === "propietario" && tab === "pagos" ? (
                                    <div className={styles.sectionWrap}>
                                        {token ? <SeccionPagos token={token} /> : null}
                                    </div>
                                ) : null}
                                {role === "propietario" && tab === "facturacion" ? (
                                    <div className={styles.sectionWrap}>
                                        {token ? <SeccionFacturacion token={token} /> : null}
                                    </div>
                                ) : null}
                                {role === "propietario" && tab === "historial" ? (
                                    <div className={styles.sectionWrap}>
                                        <section className={`tarjeta ${styles.historialCard}`}>
                                            <div className={styles.historialHeader}>
                                                <div>
                                                    <p className={styles.kicker}>Historial de reservas</p>
                                                    <h2 className={styles.historialTitle}>Datos del propietario</h2>
                                                    <p className={styles.historialMeta}>
                                                        {displayName} ? Emitido {emisionLabel}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className={styles.historialActions}>
                                                <p className={styles.historialSubtitle}>
                                                    Todas las reservas registradas con su estado, cliente, cancha, fecha y horario.
                                                </p>
                                            </div>

                                            <div className={styles.historialFilters}>
                                                <label className={styles.historialFilterField}>
                                                    <span>Buscar</span>
                                                    <input
                                                        type="text"
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        placeholder="cliente, cancha o estado"
                                                    />
                                                </label>
                                                <label className={styles.historialFilterField}>
                                                    <span>Desde</span>
                                                    <input
                                                        type="date"
                                                        value={filterDateStart}
                                                        onChange={(e) => setFilterDateStart(e.target.value)}
                                                    />
                                                </label>
                                                <label className={styles.historialFilterField}>
                                                    <span>Hasta</span>
                                                    <input
                                                        type="date"
                                                        value={filterDateEnd}
                                                        onChange={(e) => setFilterDateEnd(e.target.value)}
                                                    />
                                                </label>
                                                <button
                                                    type="button"
                                                    className="boton botonSecundario"
                                                    onClick={resetHistorialFilters}
                                                >
                                                    Limpiar filtros
                                                </button>
                                            </div>

                                            <div className={styles.historialExports}>
                                                <button
                                                    type="button"
                                                    className="boton botonPrimario"
                                                    onClick={() => handleExportHistorial("excel")}
                                                >
                                                    Exportar Excel
                                                </button>
                                                <button
                                                    type="button"
                                                    className="boton botonSecundario"
                                                    onClick={() => handleExportHistorial("pdf")}
                                                >
                                                    Exportar PDF
                                                </button>
                                            </div>

                                            {historialLoading ? (
                                                <p className={styles.muted}>Cargando historial...</p>
                                            ) : historialError ? (
                                                <p className={styles.alertError}>{historialError}</p>
                                            ) : (
                                                <div className={styles.historialTableWrapper}>
                                                    <table className={styles.historialTable}>
                                                        <thead>
                                                            <tr>
                                                                <th>#</th>
                                                                <th>Cliente</th>
                                                                <th>Cancha</th>
                                                                <th>Fecha</th>
                                                                <th>Hora inicio</th>
                                                                <th>Hora fin</th>
                                                                <th>Precio</th>
                                                                <th>Pago</th>
                                                                <th>Estado</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredHistorial.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan={8} className={styles.historialEmpty}>
                                                                        No hay reservas en el historial.
                                                                    </td>
                                                                </tr>
                                                            ) : (
                                                                filteredHistorial.map((row, index) => (
                                                                    <tr key={`${row.id}-${index}`}>
                                                                        <td>{index + 1}</td>
                                                                        <td>{row.cliente}</td>
                                                                        <td>{row.cancha}</td>
                                                                        <td>{row.fecha}</td>
                                                                        <td>{row.hora_inicio}</td>
                                                                        <td>{row.hora_fin}</td>
                                                                        <td>{formatMoney(row.precio)}</td>
                                                                        <td>
                                                                            {row.metodo ? (
                                                                                <span className={styles.historialMetodo}>
                                                                                    {row.metodo}
                                                                                    {row.referencia ? ` • ${row.referencia}` : ""}
                                                                                </span>
                                                                            ) : (
                                                                                <span className={styles.historialMetodo}>-</span>
                                                                            )}
                                                                        </td>
                                                                        <td>
                                                                            <span
                                                                                className={cn(
                                                                                    styles.historialStatus,
                                                                                    styles[`estado-${row.estado}` as any]
                                                                                )}
                                                                            >
                                                                                {row.estado}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </section>
                                    </div>
                                ) : null}
                                {role === "propietario" && tab === "utilitarios" ? (
                                    <div className={styles.sectionWrap}>
                                        {token ? (
                                            <SeccionUtilitarios token={token} />
                                        ) : (
                                            <div className={`tarjeta ${styles.tarjeta}`}>
                                                <p className={styles.muted}>Inicia sesión para ver utilitarios.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : null}

                                {tab === "perfil" ? (
                                    perfil ? (
                                        <div className={styles.sectionWrap}>
                                            <SeccionPerfil
                                                token={token}
                                                role={role}
                                                perfil={perfil}
                                                onPerfilUpdated={(p: any) => {
                                                    setPerfil(p);
                                                    if (typeof onPerfilUpdated === "function") onPerfilUpdated(p);
                                                }}
                                                onLogout={cerrarSesion}
                                            />
                                        </div>
                                    ) : (
                                        <div className={styles.sectionWrap}>
                                            <div className={`tarjeta ${styles.tarjeta}`}>
                                                <p className={styles.muted}>
                                                    No se pudo cargar tu perfil.{" "}
                                                    <button className="boton" type="button" onClick={() => window.location.reload()}>
                                                        Recargar
                                                    </button>
                                                </p>
                                            </div>
                                        </div>
                                    )
                                ) : null}

                                {role === "usuario" && tab === "historial" ? (
                                    <div className={styles.sectionWrap}>
                                        <div className={`tarjeta ${styles.tarjeta}`}>
                                            <p className={styles.muted}>Aqui va tu historial (tu componente actual).</p>
                                        </div>
                                    </div>
                                ) : null}

                                {role === "admin" && tab === "admin" ? (
                                    <div className={styles.sectionWrap}>
                                        <div className={`tarjeta ${styles.tarjeta}`}>
                                            <p className={styles.muted}>Admin: usa la ruta {rutaPorRole("admin")} para tus modulos.</p>
                                        </div>
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
