"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./PiePagina.module.css";

const LINKS = {
  inicio: "/",
  buscar: "/buscar",
  contactanos: "/contactanos",
  faq: "/faq",
  terminos: "/terminos",
  privacidad: "/privacidad",
  registrarse: "/registrarse",
};

const SOPORTE_WA = "51999999999";
const SOPORTE_WA_TEXT = "Hola CanchasPro, necesito ayuda";
const SOPORTE_EMAIL = "soporte@canchaspro.pe";
const SOPORTE_WA_URL = `https://wa.me/${SOPORTE_WA}?text=${encodeURIComponent(SOPORTE_WA_TEXT)}`;

export default function PiePagina() {
  const pathname = usePathname();
  if (pathname?.startsWith("/panel")) return null;
  return (
    <footer className={styles.footer}>
      <div className={`container-xl px-3 ${styles.top}`}>
        <div className="row g-4">
          <div className="col-12 col-md-6 col-lg-3">
            <div className={styles.block}>
              <div className={styles.logo}>
                <span className={styles.punto} aria-hidden="true"></span>
                <span className={styles.marca}>CanchasPro</span>
              </div>
              <p className={styles.texto}>Reserva canchas y gestiona complejos en un solo lugar.</p>
              <p className={styles.soporte}>Soporte: Lun-Dom | 8am-10pm</p>
              <div className={styles.contactos}>
                <a className={styles.linkIcon} href={SOPORTE_WA_URL} aria-label="WhatsApp soporte">
                  <i className="bi bi-whatsapp" aria-hidden="true"></i>
                  WhatsApp soporte
                </a>
                {SOPORTE_EMAIL ? (
                  <a className={styles.linkIcon} href={`mailto:${SOPORTE_EMAIL}`} aria-label="Correo soporte">
                    <i className="bi bi-envelope" aria-hidden="true"></i>
                    {SOPORTE_EMAIL}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <div className={styles.block}>
              <h4 className={styles.titulo}>Usuarios</h4>
              <nav className={styles.links}>
                <Link className={styles.link} href={LINKS.buscar}>Buscar canchas</Link>
                <Link className={styles.link} href={LINKS.faq}>{`C\u00f3mo reservar`}</Link>
                <Link className={styles.link} href={LINKS.faq}>Preguntas frecuentes</Link>
                <Link className={styles.link} href={LINKS.contactanos}>{`Cont\u00e1ctanos`}</Link>
              </nav>
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <div className={styles.block}>
              <h4 className={styles.titulo}>Propietarios</h4>
              <nav className={styles.links}>
                <Link className={styles.link} href={LINKS.registrarse}>Publicar mi cancha</Link>
                <Link className={styles.link} href={LINKS.faq}>{`C\u00f3mo funciona para propietarios`}</Link>
                <Link className={styles.link} href={LINKS.faq}>Ayuda para propietarios</Link>
              </nav>
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <div className={styles.block}>
              <h4 className={styles.titulo}>Confianza y legal</h4>
              <nav className={styles.links}>
                <Link className={styles.link} href={LINKS.terminos}>{`T\u00e9rminos`}</Link>
                <Link className={styles.link} href={LINKS.privacidad}>Privacidad</Link>
              </nav>
              <p className={styles.textoSmall}>
                {`Perfiles claros, informaci\u00f3n completa y atenci\u00f3n cuando lo necesitas.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className="container-xl px-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className={styles.copy}>
            {`\u00a9 ${new Date().getFullYear()} CanchasPro. Todos los derechos reservados.`}
          </div>
          <div className={styles.legal}>
            <Link className={styles.linkMini} href={LINKS.terminos}>{`T\u00e9rminos`}</Link>
            <Link className={styles.linkMini} href={LINKS.privacidad}>Privacidad</Link>
            <span className={styles.madeIn}>{`Hecho en Per\u00fa`}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
