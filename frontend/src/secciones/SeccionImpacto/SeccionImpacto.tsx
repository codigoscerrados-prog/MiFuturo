"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./SeccionImpacto.module.css";
import { METRICAS } from "@/lib/metricas";

type MetricaItem = {
    key: string;
    label: string;
    value: number | string;
    numeric: boolean;
};

const FORMATTER = new Intl.NumberFormat("es-PE");

function useCountUp(target: number, start: number, durationMs: number, enabled: boolean) {
    const [value, setValue] = useState(start);
    const startRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled) return;
        setValue(start);
        startRef.current = null;

        const tick = (ts: number) => {
            if (startRef.current == null) startRef.current = ts;
            const elapsed = ts - startRef.current;
            const progress = Math.min(elapsed / durationMs, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const next = Math.round(start + (target - start) * eased);
            setValue(next);

            if (progress < 1) {
                rafRef.current = window.requestAnimationFrame(tick);
            }
        };

        rafRef.current = window.requestAnimationFrame(tick);
        return () => {
            if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
        };
    }, [durationMs, enabled, start, target]);

    return value;
}

export default function SeccionImpacto() {
    const seccionRef = useRef<HTMLElement | null>(null);
    const [enabled, setEnabled] = useState(false);
    const hasAnimated = useRef(false);

    useEffect(() => {
        const el = seccionRef.current;
        if (!el || hasAnimated.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry) return;
                if (entry.isIntersecting && !hasAnimated.current) {
                    hasAnimated.current = true;
                    setEnabled(true);
                }
            },
            { threshold: 0.35 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const usuarios = useCountUp(METRICAS.usuarios.value, 0, 900, enabled);
    const complejos = useCountUp(METRICAS.complejos.value, 0, 800, enabled);
    const reservasMes = useCountUp(METRICAS.reservasMes.value, 0, 1000, enabled);

    const metricas = useMemo<MetricaItem[]>(
        () => [
            { key: "usuarios", label: METRICAS.usuarios.label, value: usuarios, numeric: true },
            { key: "complejos", label: METRICAS.complejos.label, value: complejos, numeric: true },
            { key: "reservas", label: METRICAS.reservasMes.label, value: reservasMes, numeric: true },
            { key: "cobertura", label: METRICAS.cobertura.label, value: METRICAS.cobertura.value, numeric: false },
        ],
        [usuarios, complejos, reservasMes]
    );

    return (
        <section ref={seccionRef} className={styles.seccion} aria-label="Metricas">
            <div className="container-xl">
                <div className={styles.head}>
                    <h2 className={styles.titulo}>Cifras que generan confianza</h2>
                    <p className={styles.subtitulo}>
                        Datos reales de una comunidad activa que reserva con seguridad y rapidez.
                    </p>
                </div>
                <div className="row g-3 g-lg-4">
                    {metricas.map((metrica) => (
                        <div key={metrica.key} className="col-12 col-sm-6 col-lg-3">
                            <article className={`card h-100 ${styles.card}`}>
                                <div className={styles.cardBody}>
                                    <div className={styles.valor} aria-live="polite">
                                        {metrica.numeric ? (
                                            <>
                                                <span className={styles.plus}>+</span>
                                                <span>{FORMATTER.format(Number(metrica.value || 0))}</span>
                                            </>
                                        ) : (
                                            <span className={styles.valorTexto}>{String(metrica.value)}</span>
                                        )}
                                    </div>
                                    <div className={styles.label}>{metrica.label}</div>
                                </div>
                            </article>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
