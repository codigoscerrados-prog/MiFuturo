"use client";

import { useEffect, useState } from "react";
import styles from "./SeccionUtilitarios.module.css";
import { apiFetch } from "@/lib/api";

type CulqiConfig = {
    enabled: boolean;
    culqi_pk?: string | null;
    sk_set?: boolean;
};

export default function SeccionUtilitarios({ token }: { token: string }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);
    const [enabled, setEnabled] = useState(false);
    const [pk, setPk] = useState("");
    const [sk, setSk] = useState("");
    const [skSet, setSkSet] = useState(false);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);
        apiFetch<CulqiConfig>("/panel/utilitarios/culqi", { token })
            .then((data) => {
                if (!active) return;
                setEnabled(Boolean(data.enabled));
                setPk(data.culqi_pk || "");
                setSk("");
                setSkSet(Boolean(data.sk_set));
            })
            .catch((e: any) => {
                if (!active) return;
                setError(e?.message || "No se pudo cargar la configuración.");
            })
            .finally(() => {
                if (!active) return;
                setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [token]);

    async function guardar() {
        try {
            setSaving(true);
            setError(null);
            setOk(null);
            const data = await apiFetch<CulqiConfig>("/panel/utilitarios/culqi", {
                token,
                method: "PUT",
                body: JSON.stringify({
                    enabled,
                    culqi_pk: pk || undefined,
                    culqi_sk: sk || undefined,
                }),
            });
            setOk("Configuración guardada.");
            setSk("");
            setSkSet(Boolean(data.sk_set));
        } catch (e: any) {
            setError(e?.message || "No se pudo guardar.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className={styles.seccion}>
            <div className={styles.head}>
                <h2 className={styles.titulo}>Utilitarios • Culqi</h2>
                <p className={styles.subtitulo}>
                    Activa pagos online para tus reservas. Tus llaves se guardan cifradas en el servidor.
                </p>
            </div>

            {loading ? <p>Cargando…</p> : null}
            {error ? <div className={styles.alertError}>{error}</div> : null}
            {ok ? <div className={styles.alertOk}>{ok}</div> : null}

            <div className={styles.card}>
                <div className={styles.row}>
                    <label className={styles.switch}>
                        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                        <span className={styles.slider} />
                    </label>
                    <div>
                        <p className={styles.label}>Culqi</p>
                        <p className={styles.hint}>{enabled ? "Activo" : "Inactivo"}</p>
                    </div>
                </div>

                <div className={styles.field}>
                    <label className={styles.label}>Public Key (pk)</label>
                    <input
                        className={styles.input}
                        type="text"
                        placeholder="pk_test_..."
                        value={pk}
                        onChange={(e) => setPk(e.target.value)}
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label}>Secret Key (sk)</label>
                    <input
                        className={styles.input}
                        type="password"
                        placeholder={skSet ? "sk_•••••••• (guardado)" : "sk_test_..."}
                        value={sk}
                        onChange={(e) => setSk(e.target.value)}
                    />
                    <p className={styles.hint}>Por seguridad, la clave secreta no se muestra.</p>
                </div>

                <div className={styles.actions}>
                    <button className={styles.btn} type="button" onClick={guardar} disabled={saving}>
                        {saving ? "Guardando..." : "Guardar"}
                    </button>
                </div>
            </div>
        </section>
    );
}
