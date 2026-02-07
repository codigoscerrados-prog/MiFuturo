"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./SeccionPlanesPropietario.module.css";
import { getToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

type PlanActual = {
    plan_id: number;
    plan_codigo?: string | null;
    plan_nombre?: string | null;
    estado?: string | null;
    inicio?: string | null;
    fin?: string | null;
    dias_restantes?: number | null;
};

type Cell = boolean | string;

const SOPORTE_WA = "51922023667";
const SOPORTE_WA_TEXT = "Hola CanchasPro, quiero el plan empresarial";
const PRO_PRICE_TEXT = "S/ 69.90 / mes";
const PRO_AMOUNT_CENTS = 6990;

function waUrl() {
    return `https://wa.me/${SOPORTE_WA}?text=${encodeURIComponent(SOPORTE_WA_TEXT)}`;
}

const FILAS: { label: string; free: Cell; pro: Cell; emp: Cell }[] = [
    { label: "Publicación del complejo (sin canchas)", free: true, pro: true, emp: true },
    { label: "Aparición en búsquedas", free: "Básico", pro: "Prioridad", emp: "Máxima" },
    { label: "Perfil profesional", free: true, pro: true, emp: true },
    { label: "Perfil público (con tu enlace)", free: true, pro: true, emp: true },
    { label: "Gestión de reservas", free: false, pro: true, emp: true },
    { label: "Soporte prioritario", free: false, pro: true, emp: true },
    { label: "Creación de canchas", free: "0", pro: "Hasta 3", emp: "Ilimitadas" },
    { label: "Reportes / estadísticas", free: false, pro: "Básico", emp: "Avanzado" },
    { label: "Multi-sede / Multi-complejo", free: false, pro: false, emp: true },
    { label: "Roles y permisos (staff)", free: false, pro: false, emp: true },
    { label: "Integraciones (pagos, WhatsApp, API)", free: false, pro: false, emp: true },
    { label: "Onboarding + soporte VIP", free: false, pro: false, emp: true },
];

function icono(valor: Cell) {
    if (typeof valor === "string") return <span className={styles.cellText}>{valor}</span>;
    const clase = valor ? "bi bi-check-circle-fill" : "bi bi-dash-lg";
    return <i className={`${clase} ${styles.icon} ${valor ? styles.iconOk : styles.iconNo}`} aria-hidden="true" />;
}

export default function SeccionPlanesPropietario() {
    const router = useRouter();
    const [token, setToken] = useState<string | null>(null);
    const [plan, setPlan] = useState<PlanActual | null>(null);
    const [cargando, setCargando] = useState(true);
    const [activando, setActivando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);
    const [pagando, setPagando] = useState(false);
    const [culqiReady, setCulqiReady] = useState(false);
    const culqiRef = useRef<any>(null);

    useEffect(() => setToken(getToken()), []);

    useEffect(() => {
        (async () => {
            if (!token) {
                setCargando(false);
                return;
            }
            try {
                setError(null);
                setCargando(true);
                const data = await apiFetch<PlanActual>("/perfil/plan", { token });
                setPlan(data || null);
            } catch (e: any) {
                setError(e?.message || "No se pudo cargar tu plan.");
            } finally {
                setCargando(false);
            }
        })();
    }, [token]);

    const isPro = useMemo(() => {
        const codigo = (plan?.plan_codigo || "").toLowerCase();
        return plan?.plan_id === 2 || codigo.includes("pro");
    }, [plan]);

    const [proPagoModo, setProPagoModo] = useState<"suscripcion" | "mensual">("suscripcion");

    const handleCulqiAction = useCallback(async () => {
        const culqi = culqiRef.current;
        if (!culqi) return;

        if (culqi.error) {
            const msg = culqi.error.user_message || culqi.error.message || "No se pudo procesar el pago.";
            setError(msg);
            return;
        }

        if (culqi.token?.id) {
            try {
                setError(null);
                setOk(null);
                setPagando(true);
                if (typeof culqi.close === "function") {
                    culqi.close();
                }

                const t = token || getToken();
                if (!t) {
                    router.push("/iniciar-sesion");
                    return;
                }

                if (proPagoModo === "suscripcion") {
                    await apiFetch("/payments/culqi/subscribe", {
                        token: t,
                        method: "POST",
                        body: JSON.stringify({ token_id: culqi.token.id }),
                    });
                } else {
                    await apiFetch("/payments/culqi/charge-pro", {
                        token: t,
                        method: "POST",
                        body: JSON.stringify({ token_id: culqi.token.id, email: "" }),
                    });
                }

                setOk(proPagoModo === "suscripcion" ? "Suscripción PRO activada. ✅" : "Pago mensual PRO registrado. ✅");
                router.push("/panel");
            } catch (e: any) {
                setError(e?.message || "No se pudo activar la suscripción.");
            } finally {
                setPagando(false);
            }
        }
    }, [router, token, proPagoModo]);

    useEffect(() => {
        if (!culqiReady || typeof window === "undefined") return;

        const pk = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY || "";
        if (!pk) {
            setError("Falta configurar la llave p?blica de Culqi.");
            return;
        }

        const CulqiCheckout = (window as any).CulqiCheckout;
        if (!CulqiCheckout) {
            setError("No se pudo cargar Culqi Checkout.");
            return;
        }

        const config = {
            settings: {
                title: "Canchas PRO",
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
        instance.culqi = handleCulqiAction;
        culqiRef.current = instance;
    }, [culqiReady, handleCulqiAction]);

    async function activarProTrial() {
        if (!token) return router.push("/iniciar-sesion");
        try {
            setError(null);
            setOk(null);
            setActivando(true);
            await apiFetch("/perfil/plan/activar-pro-trial", { token, method: "POST" });
            setOk("Listo ✅ Activaste tu prueba PRO.");
            router.push("/panel");
        } catch (e: any) {
            setError(e?.message || "No se pudo activar la prueba PRO.");
        } finally {
            setActivando(false);
        }
    }

    function abrirCheckout(modo: "suscripcion" | "mensual") {
        const t = token || getToken();
        if (!t) return router.push("/iniciar-sesion");
        if (!culqiRef.current) {
            setError("Culqi no est? listo a?n. Intenta otra vez.");
            return;
        }
        setProPagoModo(modo);
        setError(null);
        setOk(null);
        culqiRef.current.open();
    }

    return (
        <section className={styles.seccion}>
            <Script src="https://js.culqi.com/checkout-js" strategy="afterInteractive" onLoad={() => setCulqiReady(true)} />
            <div className="container-fluid px-3 px-lg-5">
                <div className={styles.head}>
                    <p className={styles.kicker}>Planes para propietarios</p>
                    <h1 className={styles.titulo}>Elige cómo quieres empezar</h1>
                    <p className={styles.subtitulo}>
                        Puedes continuar en <strong>FREE</strong> o activar tu prueba <strong>PRO</strong> sin pagar hoy.
                    </p>

                    <div className={styles.metaRow}>
                        <div className={styles.metaPill}>
                            <i className={`bi bi-shield-check ${styles.metaIcon}`} aria-hidden="true"></i>
                            <span className={styles.metaText}>
                                {cargando ? "Cargando plan…" : isPro ? "Plan actual: PRO" : "Plan actual: FREE"}
                                {isPro && plan?.dias_restantes != null ? ` • ${plan.dias_restantes} días restantes` : ""}
                            </span>
                        </div>
                        <Link className={styles.metaLink} href="/panel">Ir al panel</Link>
                    </div>
                </div>

                {error ? <div className={styles.alertError}>{error}</div> : null}
                {ok ? <div className={styles.alertOk}>{ok}</div> : null}

                <div className={styles.tableWrap}>
                    <div className={`card rounded-4 ${styles.tableCard}`}>
                        <div className="table-responsive">
                            <table className={`table align-middle ${styles.table}`}>
                                <thead>
                                    <tr>
                                        <th className={styles.headCol}>Características</th>
                                        <th className={styles.headCol}>
                                            <div className={styles.colHead}>
                                                <span className={styles.planName}>Free</span>
                                                <span className={styles.planPrice}>S/ 0</span>
                                                <button className={`btn btn-outline-primary btn-sm ${styles.ctaInline}`} onClick={() => router.push("/panel")}>
                                                    Continuar
                                                </button>
                                            </div>
                                        </th>

                                        <th className={`${styles.headCol} ${styles.proHead}`}>
                                            <div className={styles.colHead}>
                                                <span className={styles.planName}>
                                                    <i className={`bi bi-stars ${styles.planIcon}`} aria-hidden="true"></i>Pro
                                                </span>
                                                <span className={styles.planPrice}>S/ 0.00 <span className={styles.smallMuted}>• 30 días gratis</span></span>
                                                <span className={styles.smallMuted}>Luego {PRO_PRICE_TEXT}</span>
                                                <button className={`btn btn-primary btn-sm ${styles.ctaInline}`} onClick={activarProTrial} disabled={activando || isPro}>
                                                    {isPro ? "Ya activo" : activando ? "Activando…" : "30 días gratis"}
                                                </button>
                                                <button
                                                    className={`btn btn-dark btn-sm ${styles.ctaInline}`}
                                                    onClick={() => abrirCheckout("suscripcion")}
                                                    disabled={pagando || isPro}
                                                >
                                                    {isPro ? "Ya activo" : pagando ? "Procesando…" : `Suscribirme (${PRO_PRICE_TEXT})`}
                                                </button>
                                                <button
                                                    className={`btn btn-sm ${styles.ctaInline} ${styles.yapeBtn}`}
                                                    onClick={() => abrirCheckout("mensual")}
                                                    disabled={pagando || isPro}
                                                >
                                                    {isPro || pagando ? (
                                                        isPro ? "Ya activo" : "Procesando…"
                                                    ) : (
                                                        <>
                                                            <img
                                                                src="/assets/yape.svg"
                                                                alt="Yape"
                                                                className={styles.yapeLogoImg}
                                                            />
                                                            <span>Pagar mensual</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </th>

                                        <th className={`${styles.headCol} ${styles.empHead}`}>
                                            <div className={styles.colHead}>
                                                <span className={styles.planName}>Empresarial</span>
                                                <span className={styles.planPrice}>A medida</span>
                                                <a className={`btn btn-outline-dark btn-sm ${styles.ctaInline}`} href={waUrl()} target="_blank" rel="noreferrer">
                                                    Cotizar
                                                </a>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {FILAS.map((fila) => (
                                        <tr key={fila.label}>
                                            <th className={styles.rowLabel}>{fila.label}</th>
                                            <td className={styles.cell}>{icono(fila.free)}</td>
                                            <td className={`${styles.cell} ${styles.proCell}`}>{icono(fila.pro)}</td>
                                            <td className={`${styles.cell} ${styles.empCell}`}>{icono(fila.emp)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.note}>
                            <p className={styles.noteTitle}>Tip</p>
                            <p className={styles.noteText}>
                                En <strong>FREE</strong> puedes publicar tu complejo. Para habilitar <strong>Mis Canchas</strong> y <strong>Reservas</strong>, activa <strong>PRO</strong>.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
