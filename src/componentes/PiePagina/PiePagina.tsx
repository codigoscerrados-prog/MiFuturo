import Link from "next/link";
import styles from "./PiePagina.module.css";

export default function PiePagina() {
  return (
    <footer className={styles.footer}>
      <div className={`contenedor ${styles.grid}`}>
        <div className={styles.colMarca}>
          <div className={styles.logo}>
            <span className={styles.punto} />
            Canchas<span className={styles.marca}>Pro</span>
          </div>
          <p className={styles.texto}>
            Reserva canchas sintéticas, organiza partidos y gestiona horarios en un solo lugar.
          </p>

          <div className={styles.redes}>
            <a className={styles.icono} href="#" aria-label="Instagram">IG</a>
            <a className={styles.icono} href="#" aria-label="TikTok">TT</a>
            <a className={styles.icono} href="#" aria-label="WhatsApp">WA</a>
          </div>
        </div>

        <div className={styles.col}>
          <h4 className={styles.titulo}>Plataforma</h4>
          <Link className={styles.link} href="/">Inicio</Link>
          <a className={styles.link} href="#busqueda-de-cancha">Canchas</a>
          <a className={styles.link} href="#confianza">¿Por qué confiar?</a>
          <Link className={styles.link} href="/contactanos">Contáctanos</Link>
        </div>

        <div className={styles.col}>
          <h4 className={styles.titulo}>Cuenta</h4>
          <Link className={styles.link} href="/iniciar-sesion">Iniciar sesión</Link>
          <Link className={styles.link} href="/registrarse">Registrarse</Link>
          <a className={styles.link} href="#">Recuperar acceso</a>
          <a className={styles.link} href="#">Centro de ayuda</a>
        </div>

        <div className={styles.colSuscripcion}>
          <h4 className={styles.titulo}>Novedades</h4>
          <p className={styles.textoSmall}>
            Recibe lanzamientos, promos y novedades (sin spam).
          </p>

          <form className={styles.form}>
            <input
              className={styles.input}
              placeholder="Tu correo"
              type="email"
              name="correo"
            />
            <button className={`boton botonPrimario ${styles.botonForm}`} type="button">
              Suscribirme
            </button>
          </form>

          <div className={styles.micro}>
            <span className={styles.puntoVerde} />
            <span>Soporte: Lun–Dom • 8am–10pm</span>
          </div>
        </div>
      </div>

      <div className={styles.barra}>
        <div className={`contenedor ${styles.barraContenido}`}>
          <span>© {new Date().getFullYear()} CanchasPro. Todos los derechos reservados.</span>
          <div className={styles.legales}>
            <a className={styles.linkLegal} href="#">Términos</a>
            <a className={styles.linkLegal} href="#">Privacidad</a>
            <a className={styles.linkLegal} href="#">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
