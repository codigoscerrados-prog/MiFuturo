import Link from "next/link";
import { ArrowRight, Building2, CalendarCheck, CheckCircle2 } from "lucide-react";
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
                                <Building2 size={18} aria-hidden="true" />
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
                                    <CheckCircle2 size={18} aria-hidden="true" />
                                    {"Perfil profesional con fotos y ubicaci\u00f3n"}
                                </li>
                                <li className={styles.item}>
                                    <CheckCircle2 size={18} aria-hidden="true" />
                                    {"Gesti\u00f3n de reservas sin complicarte"}
                                </li>
                                <li className={styles.item}>
                                    <CheckCircle2 size={18} aria-hidden="true" />
                                    {"M\u00e1s confianza para que te elijan"}
                                </li>
                            </ul>

                            <Link className={`btn btn-primary ${styles.ctaBtn}`} href={RUTA_CTA}>
                                {"Registrar mi complejo"}
                                <ArrowRight size={18} aria-hidden="true" />
                            </Link>
                        </div>
                    </div>

                    <div className="col-12 col-lg-5">
                        <div className={`card border-0 rounded-4 ${styles.sideCard}`}>
                            <div className={styles.sideHead}>
                                <CalendarCheck size={18} aria-hidden="true" />
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
