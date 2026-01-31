"use client";

import { useRouter } from "next/navigation";
import styles from "./SeccionPlanPremium.module.css";

export default function SeccionPlanPremium() {
    const router = useRouter();
    const beneficios = [
        {
            icon: "bi-grid-1x2",
            title: "Gesti?n de canchas",
            desc: "Crea, edita y administra tus canchas desde el panel sin l?mites del modo gratuito.",
        },
        {
            icon: "bi-calendar2-check",
            title: "Reservas organizadas",
            desc: "Controla solicitudes y reservas con estados, historial y mejor seguimiento.",
        },
        {
            icon: "bi-shield-check",
            title: "M?s confianza",
            desc: "Tu negocio se ve m?s profesional: mejor experiencia para tus clientes.",
        },
        {
            icon: "bi-lightning-charge",
            title: "Ahorro de tiempo",
            desc: "Menos trabajo manual: todo centralizado dentro del sistema.",
        },
    ];

    return (
        <section className={styles.seccion}>
            <div className="contenedor">
                <div className={styles.hero}>
                    <div className={styles.heroTop}>
                        <div>
                            <p className={styles.kicker}>Plan Premium</p>
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

                    <div className={styles.ctaRow}>
                        <button className="boton" type="button" onClick={() => router.push("/panel")}> 
                            Volver al panel
                        </button>

                        <a className={`boton ${styles.btnGhost}`} href="#beneficios">
                            Ver beneficios
                        </a>

                        {/* Este bot?n lo conectamos luego con Culqi */}
                        <button
                            className={`boton botonPrimario ${styles.btnPro}`}
                            type="button"
                            onClick={() => router.push("/panel?upgrade=premium")}
                        >
                            Quiero Premium (pronto)
                        </button>
                    </div>

                    <div className={styles.note}>
                        <p className={styles.noteTitle}>?Por qu? no aparece?</p>
                        <p className={styles.noteText}>
                            Tus pesta?as <strong>Mis Canchas</strong> y <strong>Reservas</strong> se activan autom?ticamente cuando tu plan sea{" "}
                            <strong>PRO</strong>.
                        </p>
                    </div>
                </div>

                <section id="beneficios" className={styles.beneficios}>
                    <div className={styles.sectionHead}>
                        <p className={styles.sectionKicker}>Beneficios</p>
                        <h2 className={styles.sectionTitle}>Todo lo que desbloqueas con Premium</h2>
                        <p className={styles.sectionSub}>
                            Beneficios clave del plan Premium para operar tu complejo con m?s control y mejor experiencia.
                        </p>
                    </div>

                    <div className={styles.beneficiosGrid}>
                        {beneficios.map((item) => (
                            <Card key={item.title} title={item.title} desc={item.desc} icon={item.icon} />
                        ))}
                    </div>
                </section>

                <section className={styles.comparativa}>
                    <div className={styles.sectionHead}>
                        <p className={styles.sectionKicker}>Comparativa</p>
                        <h2 className={styles.sectionTitle}>Free vs Premium</h2>
                        <p className={styles.sectionSub}>Compara r?pidamente lo que incluye cada plan.</p>
                    </div>

                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Beneficio</th>
                                    <th>Free</th>
                                    <th>Premium</th>
                                </tr>
                            </thead>
                            <tbody>
                                {beneficios.map((item) => (
                                    <tr key={item.title}>
                                        <td>{item.title}</td>
                                        <td>
                                            <i className={`bi bi-x ${styles.no}`} aria-hidden="true"></i>
                                        </td>
                                        <td>
                                            <i className={`bi bi-check2 ${styles.yes}`} aria-hidden="true"></i>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className={styles.mobilePlans}>
                        <div className={styles.planCard}>
                            <p className={styles.planTitle}>Plan Free</p>
                            <ul className={styles.planList}>
                                {beneficios.map((item) => (
                                    <li key={item.title}>
                                        <i className={`bi bi-x ${styles.no}`} aria-hidden="true"></i>
                                        <span>{item.title}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className={styles.planCard}>
                            <p className={styles.planTitle}>Plan Premium</p>
                            <ul className={styles.planList}>
                                {beneficios.map((item) => (
                                    <li key={item.title}>
                                        <i className={`bi bi-check2 ${styles.yes}`} aria-hidden="true"></i>
                                        <span>{item.title}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>
            </div>
        </section>
    );
}

function Card({ title, desc, icon }: { title: string; desc: string; icon: string }) {
    return (
        <div className={styles.card}>
            <div className={styles.cardIcon}>
                <i className={`bi ${icon}`} aria-hidden="true"></i>
            </div>
            <h3 className={styles.cardTitle}>{title}</h3>
            <p className={styles.cardDesc}>{desc}</p>
        </div>
    );
}
