import Link from "next/link";
import styles from "./CTAPropietarios.module.css";

const RUTA_CTA = "/registrarse/propietario";

export default function CTAPropietarios() {
    return (
        <section className={styles.seccion}>
            <div className={styles.banner}>
                <div className="container-fluid px-3 px-lg-5">
                    <div className={`row g-4 align-items-center ${styles.contenido}`}>
                    <div className="col-12 col-lg-7">
                        <div className={styles.info}>
                            <div className={styles.kicker}>
                                <i className="bi bi-building-check" aria-hidden="true"></i>
                                <span>Propietarios</span>
                            </div>
                            <h2 className={styles.titulo}>
                                {"Tu complejo, m\u00e1s ordenado y con m\u00e1s visibilidad"}
                            </h2>
                            <p className={styles.texto}>
                                {
                                    "Publica tu cancha y administra reservas de forma simple: horarios, datos, fotos y contacto con equipos."
                                }
                            </p>
                            <ul className={styles.lista}>
                                <li className={styles.item}>
                                    <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
                                    {"Perfil profesional con fotos y ubicaci\u00f3n"}
                                </li>
                                <li className={styles.item}>
                                    <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
                                    {"Gesti\u00f3n de reservas sin complicarte"}
                                </li>
                                <li className={styles.item}>
                                    <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
                                    {"M\u00e1s confianza para que te elijan"}
                                </li>
                            </ul>

                            <Link className={`btn btn-primary ${styles.ctaBtn}`} href={RUTA_CTA}>
                                {"Registrar mi complejo"}
                                <i className="bi bi-arrow-right" aria-hidden="true"></i>
                            </Link>
                        </div>
                    </div>

                    <div className="col-12 col-lg-5">
                        <div className={`card border-0 rounded-4 ${styles.sideCard}`}>
                            <div className={styles.sideHead}>
                                <i className="bi bi-calendar2-check" aria-hidden="true"></i>
                                <span>Panel para propietarios</span>
                            </div>
                            <div className={styles.badges}>
                                <span className={`badge rounded-pill ${styles.badge}`}>Reservas ordenadas</span>
                                <span className={`badge rounded-pill ${styles.badge}`}>Panel simple</span>
                                <span className={`badge rounded-pill ${styles.badge}`}>Mas visibilidad</span>
                            </div>
                            <div className={styles.sideNote}>
                                {"Todo en un solo lugar para crecer tu complejo."}
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
