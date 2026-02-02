import Link from "next/link";
import { CheckCircle2, Minus, Sparkles } from "lucide-react";
import styles from "./ComparativaPlanes.module.css";

const RUTA_CTA = "/registrarse/propietario";

const FILAS = [
    { label: "Destacado en la portada", free: false, premium: true },
    { label: "Aparición en búsquedas", free: false, premium: true },
    { label: "Promociones / destacados", free: false, premium: true },
    { label: "Estadísticas", free: false, premium: true },
    { label: "Notificaciones", free: false, premium: true },
    { label: "Gestión de reservas (panel)", free: false, premium: true },
    { label: "Soporte prioritario", free: false, premium: true },
    { label: "Perfil profesional (fotos + ubicación)", free: true, premium: true },
    { label: "Publicación del complejo", free: true, premium: true },
];

function iconoEstado(incluido: boolean) {
    const etiqueta = incluido ? "Incluido" : "No incluido";
    const clase = `${styles.icon} ${incluido ? styles.iconOk : styles.iconNo}`;
    return incluido ? (
        <CheckCircle2 size={18} className={clase} aria-label={etiqueta} role="img" />
    ) : (
        <Minus size={18} className={clase} aria-label={etiqueta} role="img" />
    );
}

export default function ComparativaPlanes() {
    return (
        <section className={styles.seccion}>
            <div className="container-fluid px-3 px-lg-5">
                <div className={styles.head}>
                    <h2 className={styles.titulo}>Destaca tu complejo y llena más horarios</h2>
                    <p className={styles.subtitulo}>
                        Pasa a Pro para ganar visibilidad y gestionar reservas con más orden.
                    </p>
                </div>

                {/* Desktop (tabla) */}
                <div className={`d-none d-lg-block ${styles.tableWrap}`}>
                    <div className={`card rounded-4 ${styles.tableCard}`}>
                        <div className="table-responsive">
                            <table className={`table align-middle ${styles.table}`}>
                                <thead>
                                    <tr>
                                        <th scope="col" className={styles.headCol}>
                                            Características
                                        </th>
                                        <th scope="col" className={styles.headCol}>
                                            Free
                                        </th>

                                        <th scope="col" className={`${styles.headCol} ${styles.premiumHead}`}>
                                            <div className={styles.premiumHeadInner}>
                                                <div className={styles.premiumTitleRow}>
                                                    <span className={styles.premiumTitle}>
                                                        <Sparkles size={16} className={styles.premiumIcon} aria-hidden="true" />
                                                        Pro
                                                    </span>

                                                    {/* Quité btn-primary para que NO interfiera con el verde/celeste */}
                                                    <Link className={`btn btn-sm ${styles.ctaInline}`} href={RUTA_CTA}>
                                                        COMPRAR
                                                    </Link>
                                                </div>

                                                <span className={`badge rounded-pill ${styles.badgeRec}`}>
                                                    Recomendado · primeros 30 días gratis
                                                </span>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {FILAS.map((fila) => (
                                        <tr key={fila.label}>
                                            <th scope="row" className={styles.rowLabel}>
                                                {fila.label}
                                            </th>
                                            <td className={styles.cell}>{iconoEstado(fila.free)}</td>
                                            <td className={`${styles.cell} ${styles.premiumCell}`}>
                                                {iconoEstado(fila.premium)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Mobile (cards) */}
                <div className={`row g-4 d-lg-none ${styles.stackRow}`}>
                    <div className="col-12">
                        <div className={`card rounded-4 ${styles.planCard}`}>
                            <div className={styles.cardHead}>
                                <h3 className={styles.cardTitle}>Free</h3>
                            </div>

                            <ul className={styles.list}>
                                {FILAS.map((fila) => (
                                    <li key={`free-${fila.label}`} className={styles.listItem}>
                                        <span className={styles.listLabel}>{fila.label}</span>
                                        <span className={styles.listIcon}>{iconoEstado(fila.free)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="col-12">
                        <div className={`card rounded-4 ${styles.planCard} ${styles.cardPremium}`}>
                            <div className={styles.cardHead}>
                                <div className={styles.premiumTitleRow}>
                                    <h3 className={styles.cardTitle}>
                                        <Sparkles size={16} className={styles.premiumIcon} aria-hidden="true" />
                                        Pro
                                    </h3>

                                    <Link className={`btn btn-sm ${styles.ctaInline}`} href={RUTA_CTA}>
                                        COMPRAR
                                    </Link>
                                </div>

                                <span className={`badge rounded-pill ${styles.badgeRec}`}>Recomendado</span>
                            </div>

                            <ul className={styles.list}>
                                {FILAS.map((fila) => (
                                    <li key={`premium-${fila.label}`} className={styles.listItem}>
                                        <span className={styles.listLabel}>{fila.label}</span>
                                        <span className={styles.listIcon}>{iconoEstado(fila.premium)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
