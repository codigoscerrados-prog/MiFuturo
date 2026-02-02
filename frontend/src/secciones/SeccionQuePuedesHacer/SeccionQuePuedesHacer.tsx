import Link from "next/link";
import {
    Building2,
    CalendarCheck,
    Camera,
    FileText,
    Filter,
    Map,
    MapPin,
    MessageCircle,
    MessageSquareText,
    TrendingUp,
} from "lucide-react";
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
                                            <MapPin size={18} aria-hidden="true" />
                                        </span>
                                        Buscar canchas por distrito y provincia
                                    </li>
                                    <li className={styles.item}>
                                        <span className={styles.icono}>
                                            <Filter size={18} aria-hidden="true" />
                                        </span>
                                        Filtrar por precio, tipo y disponibilidad
                                    </li>
                                    <li className={styles.item}>
                                        <span className={styles.icono}>
                                            <Map size={18} aria-hidden="true" />
                                        </span>
                                        Ver complejos en mapa y comparar opciones
                                    </li>
                                    <li className={styles.item}>
                                        <span className={styles.icono}>
                                            <FileText size={18} aria-hidden="true" />
                                        </span>
                                        Revisar fotos, detalles y reseñas
                                    </li>
                                    <li className={styles.item}>
                                        <span className={styles.icono}>
                                            <MessageCircle size={18} aria-hidden="true" />
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
                                            <Building2 size={18} aria-hidden="true" />
                                        </span>
                                        Publicar complejos y canchas en minutos
                                    </li>
                                    <li className={styles.item}>
                                        <span className={styles.icono}>
                                            <Camera size={18} aria-hidden="true" />
                                        </span>
                                        Mostrar fotos y caracteristicas destacadas
                                    </li>
                                    <li className={styles.item}>
                                        <span className={styles.icono}>
                                            <CalendarCheck size={18} aria-hidden="true" />
                                        </span>
                                        Gestionar horarios y precios desde el panel
                                    </li>
                                    <li className={styles.item}>
                                        <span className={styles.icono}>
                                            <MessageSquareText size={18} aria-hidden="true" />
                                        </span>
                                        Recibir solicitudes y mensajes de clientes
                                    </li>
                                    <li className={styles.item}>
                                        <span className={styles.icono}>
                                            <TrendingUp size={18} aria-hidden="true" />
                                        </span>
                                        Mejorar tu visibilidad y conversiones
                                    </li>
                                </ul>

                                <div className={styles.cta}>
                                    <Link className="btn btn-primary" href="/registrarse/propietario">
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
