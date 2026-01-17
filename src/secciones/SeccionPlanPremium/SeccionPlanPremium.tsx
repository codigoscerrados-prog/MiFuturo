"use client";

import { useRouter } from "next/navigation";
import styles from "./SeccionPlanPremium.module.css";

export default function SeccionPlanPremium() {
    const router = useRouter();

    return (
        <section className={styles.seccion}>
            <div className="contenedor">
                <div className={styles.hero}>
                    <div className={styles.heroTop}>
                        <div>
                            <p className={styles.kicker}>Premium</p>
                            <h1 className={styles.titulo}>Desbloquea Mis Canchas y Reservas</h1>
                            <p className={styles.subtitulo}>
                                En el plan <strong>FREE</strong> puedes crear tu cuenta y perfil. Para gestionar canchas y controlar reservas
                                desde tu panel, necesitas <strong>Premium</strong>.
                            </p>
                        </div>

                        <div className={styles.badge}>
                            <span className={styles.badgeDot} />
                            <span className={styles.badgeText}>Acceso restringido en FREE</span>
                        </div>
                    </div>

                    <div className={styles.grid}>
                        <Card
                            title="✅ Gestión de canchas"
                            desc="Crea, edita y administra tus canchas desde el panel sin límites del modo gratuito."
                        />
                        <Card
                            title="📅 Reservas organizadas"
                            desc="Controla solicitudes y reservas con estados, historial y mejor seguimiento."
                        />
                        <Card
                            title="📈 Más confianza"
                            desc="Tu negocio se ve más profesional: mejor experiencia para tus clientes."
                        />
                        <Card
                            title="⚡ Ahorro de tiempo"
                            desc="Menos trabajo manual: todo centralizado dentro del sistema."
                        />
                    </div>

                    <div className={styles.ctaRow}>
                        <button className="boton" type="button" onClick={() => router.push("/panel")}>
                            Volver al panel
                        </button>

                        {/* Este botón lo conectamos luego con Culqi */}
                        <button
                            className={`boton botonPrimario ${styles.btnPro}`}
                            type="button"
                            onClick={() => router.push("/panel?upgrade=premium")}
                        >
                            Quiero Premium (pronto)
                        </button>
                    </div>

                    <div className={styles.note}>
                        <p className={styles.noteTitle}>¿Por qué no aparece?</p>
                        <p className={styles.noteText}>
                            Tus pestañas <strong>Mis Canchas</strong> y <strong>Reservas</strong> se activan automáticamente cuando tu plan sea{" "}
                            <strong>PRO</strong>.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function Card({ title, desc }: { title: string; desc: string }) {
    return (
        <div className={styles.card}>
            <h3 className={styles.cardTitle}>{title}</h3>
            <p className={styles.cardDesc}>{desc}</p>
        </div>
    );
}
