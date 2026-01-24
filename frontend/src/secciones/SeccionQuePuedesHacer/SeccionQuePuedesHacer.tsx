import Link from "next/link";
import styles from "./SeccionQuePuedesHacer.module.css";

export default function SeccionQuePuedesHacer() {
    return (
        <section className={styles.seccion}>
            <div className={styles.banner}>
                <div className={styles.capa} aria-hidden="true" />

                <div className={`container-xl ${styles.contenido}`}>
                    <div className={styles.header}>
                        <h2 className={styles.titulo}>Que puedes hacer aqui</h2>
                        <p className={styles.subtitulo}>
                            Todo lo que necesitas para encontrar canchas y gestionar tu complejo en un solo lugar.
                        </p>
                    </div>

                    <div className="row g-4">
                        <div className="col-12 col-lg-6">
                            <div className={styles.columna}>
                                <h3 className={styles.colTitulo}>Para usuarios</h3>
                                <ul className={styles.lista}>
                                    <li className={styles.item}>
                                        <span className={styles.icono}>
                                            <i className="bi bi-geo-alt" aria-hidden="true"></i>
                                        </span>
                                        Buscar canchas por distrito y provincia
                                    </li>
                                    <li className={styles.item}>
                                        <span className={styles.icono}>
                                            <i className="bi bi-funnel" aria-hidden="true"></i>
                                        </span>
                                        Filtrar por precio, tipo y disponibilidad
                                    </li>
                                    <li className={styles.item}>
                                        <span className={styles.icono}>
                                            <i className="bi bi-map" aria-hidden="true"></i>
                                        </span>
                                        Ver complejos en mapa y comparar opciones
                                    </li>
                                    <li className={styles.item}>
                                        <span className={styles.icono}>
                                            <i className="bi bi-card-text" aria-hidden="true"></i>
                                        </span>
                                        Revisar fotos, detalles y reseñas
                                    </li>
                                    <li className={styles.item}>
                                        <span className={styles.icono}>
                                            <i className="bi bi-whatsapp" aria-hidden="true"></i>
                                        </span>
                                        Reservar rapido desde el panel o WhatsApp
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="col-12 col-lg-6">
                            <div className={styles.columna}>
                                <h3 className={styles.colTitulo}>Para propietarios</h3>
                                <ul className={styles.lista}>
                                    <li className={styles.item}>
                                        <span className={styles.icono}>
                                            <i className="bi bi-building" aria-hidden="true"></i>
                                        </span>
                                        Publicar complejos y canchas en minutos
                                    </li>
                                    <li className={styles.item}>
                                        <span className={styles.icono}>
                                            <i className="bi bi-camera" aria-hidden="true"></i>
                                        </span>
                                        Mostrar fotos y caracteristicas destacadas
                                    </li>
                                    <li className={styles.item}>
                                        <span className={styles.icono}>
                                            <i className="bi bi-calendar-check" aria-hidden="true"></i>
                                        </span>
                                        Gestionar horarios y precios desde el panel
                                    </li>
                                    <li className={styles.item}>
                                        <span className={styles.icono}>
                                            <i className="bi bi-chat-square-text" aria-hidden="true"></i>
                                        </span>
                                        Recibir solicitudes y mensajes de clientes
                                    </li>
                                    <li className={styles.item}>
                                        <span className={styles.icono}>
                                            <i className="bi bi-graph-up" aria-hidden="true"></i>
                                        </span>
                                        Mejorar tu visibilidad y conversiones
                                    </li>
                                </ul>

                                <div className={styles.cta}>
                                    <Link className="btn btn-primary" href="/registrarse">
                                        Publicar mi cancha
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
