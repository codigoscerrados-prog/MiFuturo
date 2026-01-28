"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./BarraNavegacion.module.css";

import { AUTH_CHANGED_EVENT, clearToken, getRoleFromToken, getToken, rutaPorRole } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

type PerfilMe = {
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
};

function IconoCerrar({ className = "" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12" />
            <path d="M18 6l-12 12" />
        </svg>
    );
}

export default function BarraNavegacion() {
    const router = useRouter();
    const pathname = usePathname();
    const hideNav = pathname?.startsWith("/panel");

    const [token, setToken] = useState<string | null>(null);
    const [nombreUsuario, setNombreUsuario] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        if (hideNav) return;
        const sync = () => setToken(getToken());
        sync();

        window.addEventListener(AUTH_CHANGED_EVENT, sync as EventListener);
        window.addEventListener("storage", sync);
        window.addEventListener("focus", sync);

        return () => {
            window.removeEventListener(AUTH_CHANGED_EVENT, sync as EventListener);
            window.removeEventListener("storage", sync);
            window.removeEventListener("focus", sync);
        };
    }, [hideNav]);

    useEffect(() => {
        if (hideNav) return;
        let activo = true;
        if (!token) {
            setNombreUsuario(null);
            return;
        }

        (async () => {
            try {
                const me = await apiFetch<PerfilMe>("/perfil/me", { token });
                if (!activo) return;
                const full = [me?.first_name, me?.last_name].filter(Boolean).join(" ").trim();
                const name = full || me?.username || null;
                setNombreUsuario(name);
            } catch {
                if (activo) setNombreUsuario(null);
            }
        })();

        return () => {
            activo = false;
        };
    }, [token, hideNav]);

    // cerrar menú al cambiar de ruta
    useEffect(() => {
        if (hideNav) return;
        setMenuOpen(false);
    }, [pathname, hideNav]);

    // ESC para cerrar + bloquear scroll cuando abre
    useEffect(() => {
        if (hideNav) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setMenuOpen(false);
        }
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = menuOpen ? "hidden" : "";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [menuOpen, hideNav]);

    useEffect(() => {
        if (hideNav) return;
        function onScroll() {
            const y = window.scrollY;
            setScrolled(y > 8);
        }
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [hideNav]);

    const role = useMemo(() => getRoleFromToken(token), [token]);
    const rutaPanel = useMemo(() => rutaPorRole(role), [role]);

    const isActivePanel = pathname === rutaPanel || pathname?.startsWith("/panel");

    function cerrarSesion() {
        clearToken();
        setToken(null);
        setNombreUsuario(null);
        setMenuOpen(false);
        router.push("/");
        router.refresh();
    }

    const iniciales = useMemo(() => {
        if (!nombreUsuario) return "CP";
        const parts = nombreUsuario.trim().split(/\s+/).filter(Boolean);
        const a = parts[0]?.[0] || "C";
        const b = parts[1]?.[0] || "P";
        return `${a}${b}`.toUpperCase();
    }, [nombreUsuario]);

    if (hideNav) return null;

    return (
        <header
            className={`${styles.header} navbar`}
            data-open={menuOpen ? "true" : "false"}
            data-scrolled={scrolled ? "true" : "false"}
        >
            <div className={`contenedor container-xl px-3 ${styles.contenido}`}>
                <Link
                    href="/"
                    className={`${styles.logo} navbar-brand d-inline-flex align-items-center text-decoration-none`}
                    aria-label="Ir al inicio"
                >
                    <span className={styles.logoIcon} aria-hidden="true">
                        <Image
                            src="/logo_principal.svg"
                            alt="Lateralverde"
                            width={140}
                            height={56}
                            className={styles.logoImage}
                            priority
                        />
                    </span>
                    <span className={styles.srOnly}>Lateralverde</span>
                </Link>

                
                {/* Acciones */}
                <div className={`${styles.acciones} d-none d-md-flex align-items-center`}>
                    {!token ? (
                        <>
                            <Link className={`boton ${styles.btnGhost} d-inline-flex align-items-center gap-2`} href="/registrarse/usuario">
                                Crear Tu Perfil de Jugador
                            </Link>
                            <Link className={`boton ${styles.btnGhost} d-inline-flex align-items-center gap-2`} href="/registrarse/propietario">
                                Registra tu Complejo
                            </Link>
                            <Link className={`boton ${styles.btnAction} d-inline-flex align-items-center gap-2`} href="/iniciar-sesion">
                                Iniciar Sesión
                            </Link>
                        </>
                    ) : (
                        <>
                            <div className={`${styles.userPill} d-inline-flex align-items-center`}>
                                <span className={styles.userAvatar} aria-hidden="true">
                                    {iniciales}
                                </span>
                                <span className={styles.userName} aria-hidden={!nombreUsuario} data-empty={!nombreUsuario}>
                                    <i className={`bi bi-person-lines-fill ${styles.userBi}`} aria-hidden="true"></i>
                                    {nombreUsuario ? `Hola, ${nombreUsuario}` : "Hola"}
                                </span>
                            </div>

                            <Link
                                className={`boton ${styles.btnGhost} ${styles.desktopOnly} d-inline-flex align-items-center gap-2 ${isActivePanel ? styles.botonActive : ""
                                    }`}
                                href={rutaPanel}
                            >
                                <i className={`bi bi-speedometer2 ${styles.btnIcon}`} aria-hidden="true"></i>
                                Ir a mi panel
                            </Link>

                            <button
                                type="button"
                                className={`boton ${styles.btnDanger} ${styles.desktopOnly} d-inline-flex align-items-center gap-2`}
                                onClick={cerrarSesion}
                            >
                                <i className={`bi bi-box-arrow-right ${styles.btnIcon}`} aria-hidden="true"></i>
                                Cerrar sesión
                            </button>
                        </>
                    )}
                </div>

                {/* Botón menú móvil */}
                <button
                    type="button"
                    className={`${styles.botonMenu} d-inline-flex d-md-none`}
                    aria-label={menuOpen ? "Cerrar menu" : "Abrir menu"}
                    aria-expanded={menuOpen}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuOpen((v) => !v);
                    }}
                >
                    <span className={`${styles.hamburger} ${menuOpen ? styles.hamburgerActivo : ""}`} aria-hidden="true">
                        <span className={styles.hamburgerLine} />
                        <span className={styles.hamburgerLine} />
                        <span className={styles.hamburgerLine} />
                    </span>
                </button>
            </div>

            {/* Overlay + panel móvil */}
            <div className={`${styles.overlay} ${menuOpen ? styles.overlayOn : ""}`} onClick={() => setMenuOpen(false)} />

            <div className={`${styles.movil} ${menuOpen ? styles.movilOn : ""} shadow-lg`} role="dialog" aria-modal="true">
                <div className={styles.movilHeader}>
                    <div className={styles.movilBrand}>
                        <span className={styles.logoIcon}>
                            <Image
                                src="/logo_principal.svg"
                                alt="Lateralverde"
                                width={40}
                                height={40}
                                className={styles.logoImage}
                                priority
                            />
                        </span>
                        <span className={styles.srOnly}>Lateralverde</span>
                    </div>

                    <button type="button" className={styles.movilClose} onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
                        <IconoCerrar className={`${styles.iconoClose} ${styles.iconoLegacy}`} />
                        <i className={`bi bi-x-lg ${styles.biClose}`} aria-hidden="true"></i>
                    </button>
                </div>

                <div className={styles.movilContenido}>
                    <div className={styles.movilAcciones}>
                        {!token ? (
                            <>
                                <Link className={`boton ${styles.botonFull} ${styles.btnGhost}`} href="/registrarse/usuario">
                                    Crear tu perfil de jugador
                                </Link>
                                <Link className={`boton ${styles.botonFull} ${styles.btnGhost}`} href="/registrarse/propietario">
                                    Registra tu complejo
                                </Link>
                                <Link className={`boton ${styles.botonFull} ${styles.btnAction}`} href="/iniciar-sesion">
                                    Iniciar sesión
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link className={`boton ${styles.botonFull} ${styles.btnGhost}`} href={rutaPanel}>
                                    <i className={`bi bi-speedometer2 ${styles.btnIcon}`} aria-hidden="true"></i>
                                    Ir a mi panel
                                </Link>
                                <button
                                    type="button"
                                    className={`boton ${styles.botonFull} ${styles.btnDanger}`}
                                    onClick={cerrarSesion}
                                >
                                    <i className={`bi bi-box-arrow-right ${styles.btnIcon}`} aria-hidden="true"></i>
                                    Cerrar sesión
                                </button>
                            </>
                        )}
                    </div>

                    <div className={styles.movilNav}>
                        <Link className={styles.movilLink} href="/buscar">
                            <i className="bi bi-search" aria-hidden="true"></i>
                            Buscar canchas
                        </Link>
                        <Link className={styles.movilLink} href="/contactanos">
                            <i className="bi bi-chat-dots" aria-hidden="true"></i>
                            Contacto
                        </Link>
                        <Link className={styles.movilLink} href="/terminos">
                            <i className="bi bi-file-text" aria-hidden="true"></i>
                            Términos & privacidad
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}
