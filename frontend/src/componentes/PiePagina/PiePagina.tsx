"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./PiePagina.module.css";

const LINKS = {
  inicio: "/",
  buscar: "/buscar",
  faq: "/faq",
  registrarse: "/registrarse",
  ayuda: "/contactanos?motivo=ayuda",
  contacto: "/contactanos?motivo=contacto",
  problema: "/contactanos?motivo=problema",
  terminos: "/terminos",
  privacidad: "/privacidad",
  cookies: "/cookies",
  reembolsos: "/reembolsos",
  aviso: "/aviso-responsabilidad",
};

const SOPORTE_WA = "51999999999";
const SOPORTE_WA_TEXT = "Hola Lateralverde, necesito ayuda";
const SOPORTE_EMAIL = "soporte@lateralverde.pe";
const SOPORTE_WA_URL = `https://wa.me/${SOPORTE_WA}?text=${encodeURIComponent(SOPORTE_WA_TEXT)}`;

export default function PiePagina() {
  const pathname = usePathname();
  if (pathname?.startsWith("/panel")) return null;

  const openCookiePreferences = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("lv-open-cookie-preferences"));
  };

  return (
    <footer className={styles.footer}>
      <div className={`container-xl px-3 ${styles.top}`}>
        <div className="row g-4">
          <div className="col-12 col-md-6 col-lg-3">
            <div className={styles.block}>
              <div className={styles.logo}>
                <span className={styles.punto} aria-hidden="true"></span>
                <span className={styles.marca}>Lateralverde</span>
              </div>
              <p className={styles.texto}>Reserva canchas, gestiona horarios y conecta con clubes en un solo lugar.</p>
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
              <nav className={styles.links} aria-label="Enlaces para usuarios">
                <Link className={styles.link} href={LINKS.buscar}>Buscar canchas</Link>
                <Link className={styles.link} href={LINKS.ayuda}>Centro de ayuda</Link>
                <Link className={styles.link} href={LINKS.contacto}>Contacto</Link>
                <Link className={styles.link} href={LINKS.problema}>Reportar un problema</Link>
              </nav>
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <div className={styles.block}>
              <h4 className={styles.titulo}>Propietarios</h4>
              <nav className={styles.links} aria-label="Enlaces para propietarios">
                <Link className={styles.link} href={LINKS.registrarse}>Publicar mi cancha</Link>
                <Link className={styles.link} href={LINKS.faq}>{`Cómo funciona para propietarios`}</Link>
                <Link className={styles.link} href={LINKS.faq}>Ayuda para propietarios</Link>
              </nav>
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <div className={styles.block}>
              <h4 className={styles.titulo}>Confianza y legal</h4>
              <nav className={styles.links} aria-label="Enlaces legales">
                <Link className={styles.link} href={LINKS.terminos}>Términos y Condiciones</Link>
                <Link className={styles.link} href={LINKS.privacidad}>Privacidad</Link>
                <Link className={styles.link} href={LINKS.cookies}>Cookies</Link>
                <Link className={styles.link} href={LINKS.reembolsos}>Reembolsos</Link>
                <Link className={styles.link} href={LINKS.aviso}>Aviso de Responsabilidad</Link>
              </nav>
              <button className={styles.cookieAction} type="button" onClick={openCookiePreferences}>
                Preferencias de cookies
              </button>
              <p className={styles.textoSmall}>Perfiles claros, información completa y atención cuando lo necesitas.</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className="container-xl px-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className={styles.copy}>{`© ${new Date().getFullYear()} Lateralverde. Todos los derechos reservados.`}</div>
          <div className={styles.legal}>
            <Link className={styles.linkMini} href={LINKS.terminos}>Términos</Link>
            <Link className={styles.linkMini} href={LINKS.privacidad}>Privacidad</Link>
            <span className={styles.madeIn}>Hecho en Perú</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
