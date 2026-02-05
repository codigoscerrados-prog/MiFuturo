"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";

import styles from "./SeccionPanel.module.css";

import { clearToken, getRoleFromToken, getToken, rutaPorRole } from "@/lib/auth";
import { apiFetch, apiUrl } from "@/lib/api";
import BrandLogo from "@/components/BrandLogo";

import PanelReservasPropietario from "./SeccionReservas";
import PanelCanchasPropietario from "./SeccionCanchas";
import SeccionPagos from "./SeccionPagos";

import SeccionPerfil from "./SeccionPerfil";
import SeccionComplejos from "./SeccionComplejos";
import SeccionUtilitarios from "./SeccionUtilitarios";

export type Role = "usuario" | "propietario" | "admin";

export type PlanActual = {
    plan_id: number;
    plan_codigo?: string | null;
    plan_nombre?: string | null;
    estado?: string | null;
    inicio?: string | null;
    fin?: string | null;
    dias_restantes?: number | null;
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

const TRIAL_PAYMENT_LABEL = "S/ 69.90";

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
        setToken(tokenProp ?? getToken());
    }, [tokenProp]);

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

    useEffect(() => {
        if (perfilProp) setPerfil(perfilProp);
    }, [perfilProp]);

    const isPro = useMemo(() => {
        if (!plan) return false;

        const planId = Number((plan as any).plan_id);
        const st = normalizeStatus((plan as any).status);
        const name = String((plan as any).plan_name || "").toLowerCase();

        if (planId === 2) return st === "active" || st === "" || st === "null";
        if (name.includes("pro")) return true;

        return false;
    }, [plan]);

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
    const showTrialCallout =
        isPro && normalizedPlanStatus === "activa" && plan?.dias_restantes != null && plan.dias_restantes > 0;
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
            (nextTab === "mis-canchas" || nextTab === "reservas" || nextTab === "historial")
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
                <div className={styles.layout}>
                    <aside className={styles.sidebar}>
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
                                {role === "propietario" && !planLoading && !isPro ? (
                                    <Link href="/plan-premium" className={`boton botonPrimario ${styles.upgradeBtn}`}>
                                        Subir a PRO
                                    </Link>
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
                                <a
                                    className={`boton botonPrimario ${styles.trialBtn}`}
                                    href={WHATSAPP_PAY_URL}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    PAGAR AHORA · {TRIAL_PAYMENT_LABEL}
                                </a>
                            </div>
                        ) : null}

                        {error ? <div className={styles.alertError}>{error}</div> : null}

                        
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
