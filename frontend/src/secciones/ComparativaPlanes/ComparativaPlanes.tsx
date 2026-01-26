import Link from "next/link";
import styles from "./ComparativaPlanes.module.css";

const RUTA_CTA = "/registrarse/propietario";

const FILAS = [
    { label: "Destacado en la portada", free: false, premium: true },
    { label: "Aparici\u00f3n en b\u00fasquedas", free: false, premium: true },
    { label: "Promociones / destacados", free: false, premium: true },
    { label: "Estad\u00edsticas", free: false, premium: true },
    { label: "Notificaciones", free: false, premium: true },
    { label: "Gesti\u00f3n de reservas (panel)", free: false, premium: true },
    { label: "Soporte prioritario", free: false, premium: true },
    { label: "Perfil profesional (fotos + ubicaci\u00f3n)", free: true, premium: true },
    { label: "Publicaci\u00f3n del complejo", free: true, premium: true },
];

function iconoEstado(incluido: boolean) {
    const clase = incluido ? "bi bi-check-circle-fill" : "bi bi-dash-lg";
    const etiqueta = incluido ? "Incluido" : "No incluido";
    return <i className={`${clase} ${styles.icon} ${incluido ? styles.iconOk : styles.iconNo}`} aria-label={etiqueta} role="img"></i>;
}

export default function ComparativaPlanes() {
    return (
        <section className={styles.seccion}>
            <div className="container-fluid px-3 px-lg-5">
                <div className={styles.head}>
                    <h2 className={styles.titulo}>Destaca tu complejo y llena más horarios</h2>
                    <p className={styles.subtitulo}>
                        Pasa a Premium para ganar visibilidad y gestionar reservas con más orden.
                    </p>
                </div>

                <div className={`d-none d-lg-block ${styles.tableWrap}`}>
                    <div className={`card rounded-4 ${styles.tableCard}`}>
                        <div className="table-responsive">
                            <table className={`table align-middle ${styles.table}`}>
                                <thead>
                                    <tr>
                                        <th scope="col" className={styles.headCol}>{`Caracter\u00edsticas`}</th>
                                        <th scope="col" className={styles.headCol}>Free</th>
                                        <th scope="col" className={`${styles.headCol} ${styles.premiumHead}`}>
                                            <div className={styles.premiumHeadInner}>
                                                <div className={styles.premiumTitleRow}>
                                                    <span className={styles.premiumTitle}>
                                                        <i className={`bi bi-stars ${styles.premiumIcon}`} aria-hidden="true"></i>
                                                        Pro
                                                    </span>
                                                    <Link className={`btn btn-primary btn-sm ${styles.ctaInline}`} href={RUTA_CTA}>
                                                        COMPRAR
                                                    </Link>
                                                </div>
                                                <span className={`badge rounded-pill ${styles.badgeRec}`}>Recomendado primeros 30 días gratis</span>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {FILAS.map((fila) => (
                                        <tr key={fila.label}>
                                            <th scope="row" className={styles.rowLabel}>{fila.label}</th>
                                            <td className={styles.cell}>{iconoEstado(fila.free)}</td>
                                            <td className={`${styles.cell} ${styles.premiumCell}`}>{iconoEstado(fila.premium)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

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
                                        <i className={`bi bi-stars ${styles.premiumIcon}`} aria-hidden="true"></i>
                                        Premium
                                    </h3>
                                    <Link className={`btn btn-primary btn-sm ${styles.ctaInline}`} href={RUTA_CTA}>
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
