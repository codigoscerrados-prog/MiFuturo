import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

import styles from "./SeccionFacturacion.module.css";
import { apiFetch } from "@/lib/api";

const UPDATE_AMOUNT_CENTS = 1; // solo tokenizacion

type SuscripcionInfo = {
    subscription_id: string;
    status?: string | null;
    email?: string | null;
    card_id?: string | null;
    plan_id?: string | null;
};

type Props = {
    token: string | null;
};

export default function SeccionFacturacion({ token }: Props) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);
    const [info, setInfo] = useState<SuscripcionInfo | null>(null);
    const [email, setEmail] = useState("");
    const [culqiReady, setCulqiReady] = useState(false);
    const culqiRef = useRef<any>(null);

    useEffect(() => {
        if (!token) return;
        let active = true;
        setLoading(true);
        setError(null);
        apiFetch<SuscripcionInfo>("/payments/culqi/subscription", { token })
            .then((data) => {
                if (!active) return;
                setInfo(data);
                setEmail((data.email || "").trim());
            })
            .catch((e: any) => {
                if (!active) return;
                setError(e?.message || "No se pudo cargar la suscripci?n.");
            })
            .finally(() => {
                if (!active) return;
                setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [token]);

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
                title: "Actualizar tarjeta",
                currency: "PEN",
                amount: UPDATE_AMOUNT_CENTS,
            },
            options: {
                lang: "es",
                installments: false,
                paymentMethods: {
                    tarjeta: true,
                    yape: false,
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
                const msg = culqi.error.user_message || culqi.error.message || "No se pudo procesar la tarjeta.";
                setError(msg);
                return;
            }
            if (!culqi.token?.id) return;
            if (!token) return;
            try {
                setError(null);
                setOk(null);
                await apiFetch("/payments/culqi/subscription/card", {
                    token,
                    method: "PUT",
                    body: JSON.stringify({ token_id: culqi.token.id }),
                });
                setOk("Tarjeta actualizada correctamente.");
                const data = await apiFetch<SuscripcionInfo>("/payments/culqi/subscription", { token });
                setInfo(data);
            } catch (e: any) {
                setError(e?.message || "No se pudo actualizar la tarjeta.");
            }
        };
        culqiRef.current = instance;
    }, [culqiReady, token]);

    const statusLabel = useMemo(() => {
        if (!info?.status) return "-";
        return String(info.status);
    }, [info?.status]);

    function handleOpenCheckout() {
        if (!culqiRef.current) {
            setError("Culqi no est? listo a?n. Intenta otra vez.");
            return;
        }
        setError(null);
        setOk(null);
        culqiRef.current.open();
    }

    async function handleSaveEmail() {
        if (!token) return;
        const trimmed = email.trim();
        if (!trimmed) {
            setError("Ingresa un correo v?lido.");
            return;
        }
        try {
            setError(null);
            setOk(null);
            await apiFetch("/payments/culqi/subscription/email", {
                token,
                method: "PUT",
                body: JSON.stringify({ email: trimmed }),
            });
            setOk("Correo actualizado correctamente.");
        } catch (e: any) {
            setError(e?.message || "No se pudo actualizar el correo.");
        }
    }

    return (
        <section className={styles.wrap}>
            <Script src="https://js.culqi.com/checkout-js" strategy="afterInteractive" onLoad={() => setCulqiReady(true)} />
            <div className={styles.header}>
                <h2 className={styles.title}>Facturaci?n</h2>
                <p className={styles.subtitle}>Actualiza la tarjeta o el correo de confirmaci?n de tu suscripci?n.</p>
            </div>

            {error ? <div className={styles.alertError}>{error}</div> : null}
            {ok ? <div className={styles.alertOk}>{ok}</div> : null}

            {loading ? (
                <p className={styles.muted}>Cargando...</p>
            ) : info ? (
                <div className={styles.grid}>
                    <div className={styles.card}>
                        <h3>Suscripci?n</h3>
                        <div className={styles.row}><span>ID</span><strong>{info.subscription_id}</strong></div>
                        <div className={styles.row}><span>Estado</span><strong>{statusLabel}</strong></div>
                        <div className={styles.row}><span>Plan</span><strong>{info.plan_id || "-"}</strong></div>
                        <div className={styles.row}><span>Tarjeta</span><strong>{info.card_id || "-"}</strong></div>
                        <button className={styles.primaryBtn} type="button" onClick={handleOpenCheckout}>Cambiar tarjeta</button>
                        <p className={styles.note}>No se realizar? ning?n cobro al actualizar la tarjeta.</p>
                    </div>

                    <div className={styles.card}>
                        <h3>Correo de confirmaci?n</h3>
                        <label className={styles.label}>Correo</label>
                        <input
                            className={styles.input}
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@correo.com"
                        />
                        <button className={styles.primaryBtn} type="button" onClick={handleSaveEmail}>Guardar correo</button>
                    </div>
                </div>
            ) : (
                <div className={styles.card}>
                    <p className={styles.muted}>No tienes una suscripci?n activa.</p>
                </div>
            )}
        </section>
    );
}
