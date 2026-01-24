import Link from "next/link";
import styles from "./SeccionLlamadoAccion.module.css";

export default function SeccionLlamadoAccion() {
    return (
        <section className={styles.seccion}>
            <div className={`contenedor ${styles.box}`}>
                <div>
                    <h2 className={styles.titulo}>¿Listo para reservar o publicar tu cancha?</h2>
                    <p className={styles.sub}>
                        Regístrate en segundos. Si eres dueño, te ayudamos a subir tu catálogo y horarios.
                    </p>
                </div>

                <div className={styles.acciones}>
                    <Link className="boton botonPrimario" href="/registrarse">Registrarse</Link>
                    <Link className="boton" href="/iniciar-sesion">Iniciar sesión</Link>
                    <Link className="boton" href="/contactanos">Contáctanos</Link>
                </div>
            </div>
        </section>
    );
}
