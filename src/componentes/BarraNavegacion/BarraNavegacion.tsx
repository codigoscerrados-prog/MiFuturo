"use client";

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

function IconoCancha({ className = "" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16v12H4z" />
            <path d="M12 6v12" />
            <path d="M4 12h16" />
            <path d="M8 9a4 4 0 0 0 0 6" />
            <path d="M16 9a4 4 0 0 1 0 6" />
        </svg>
    );
}

function IconoContacto({ className = "" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16v12H4z" />
            <path d="M4 7l8 6 8-6" />
        </svg>
    );
}

function IconoBeneficios({ className = "" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v18" />
            <path d="M7 7h10" />
            <path d="M7 17h10" />
            <path d="M6 12h12" />
        </svg>
    );
}

function IconoInicio({ className = "" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 11l8-7 8 7" />
            <path d="M6 10v10h12V10" />
        </svg>
    );
}

function IconoMenu({ className = "" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h16" />
        </svg>
    );
}

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

    const [token, setToken] = useState<string | null>(null);
    const [nombreUsuario, setNombreUsuario] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
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
    }, []);

    useEffect(() => {
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
    }, [token]);

    // cerrar menú al cambiar de ruta
    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    // ESC para cerrar + bloquear scroll cuando abre
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setMenuOpen(false);
        }
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = menuOpen ? "hidden" : "";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [menuOpen]);

    const role = useMemo(() => getRoleFromToken(token), [token]);
    const rutaPanel = useMemo(() => rutaPorRole(role), [role]);

    const isActiveInicio = pathname === "/";
    const isActiveContacto = pathname?.startsWith("/contactanos");
    const isActivePanel = pathname === rutaPanel || pathname?.startsWith("/panel");

    function cerrarSesion() {
        clearToken();
        setToken(null);
        setNombreUsuario(null);
        setMenuOpen(false);
        router.push("/");
        router.refresh();
    }

    return (
        <header className={styles.header}>
            <div className={`contenedor ${styles.contenido}`}>
                <Link href="/" className={styles.logo} aria-label="Ir al inicio">
                    <span className={styles.punto} />
                    Canchas<span className={styles.marca}>Pro</span>
                </Link>

                {/* Desktop nav */}
                <nav className={styles.nav} aria-label="Navegación principal">
                    <div className={styles.navGrupo}>
                        <Link href="/" className={`${styles.link} ${isActiveInicio ? styles.activo : ""}`}>
                            <IconoInicio className={styles.iconoLinea} />
                            Inicio
                        </Link>

                        

                        <Link href="/contactanos" className={`${styles.link} ${isActiveContacto ? styles.activo : ""}`}>
                            <IconoContacto className={styles.iconoLinea} />
                            Contáctanos
                        </Link>
                    </div>
                </nav>

                {/* Acciones */}
                <div className={styles.acciones}>
                    {!token ? (
                        <>
                            <Link className={`boton ${styles.botonGhost}`} href="/iniciar-sesion">
                                Iniciar sesión
                            </Link>
                            <Link className={`boton botonPrimario`} href="/registrarse">
                                Registrarse
                            </Link>
                        </>
                    ) : (
                        <>
                            <span
                                className={styles.userName}
                                aria-hidden={!nombreUsuario}
                                data-empty={!nombreUsuario}
                            >
                                {nombreUsuario ? `Hola, ${nombreUsuario}` : "Hola"}
                            </span>


                            <Link
                                className={`boton ${styles.botonGhost} ${styles.desktopOnly} ${isActivePanel ? styles.botonActive : ""}`}
                                href={rutaPanel}
                            >
                                Ir a mi panel
                            </Link>

                            <button type="button" className={`boton ${styles.botonSalir} ${styles.desktopOnly}`} onClick={cerrarSesion}>
                                Cerrar sesión
                            </button>
                        </>
                    )}

                    
                </div>

                {/* Boton menu movil */}
                <button
                    type="button"
                    className={styles.botonMenu}
                    aria-label={menuOpen ? "Cerrar menu" : "Abrir menu"}
                    aria-expanded={menuOpen}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuOpen((v) => !v);
                    }}
                >
                    {menuOpen ? (
                        <IconoCerrar className={styles.iconoMenu} />
                    ) : (
                        <IconoMenu className={styles.iconoMenu} />
                    )}
                </button>

            </div>

            {/* Overlay + panel móvil */}
            <div className={`${styles.overlay} ${menuOpen ? styles.overlayOn : ""}`} onClick={() => setMenuOpen(false)} />

            <div className={`${styles.movil} ${menuOpen ? styles.movilOn : ""}`} role="dialog" aria-modal="true">
                <div className={`contenedor ${styles.movilContenido}`}>
                    <Link href="/" className={`${styles.movilLink} ${isActiveInicio ? styles.movilActivo : ""}`}>
                        <IconoInicio className={styles.iconoLinea} />
                        Inicio
                    </Link>


                    <Link href="/contactanos" className={`${styles.movilLink} ${isActiveContacto ? styles.movilActivo : ""}`}>
                        <IconoContacto className={styles.iconoLinea} />
                        Contáctanos
                    </Link>

                    <div className={styles.movilAcciones}>
                        {!token ? (
                            <>
                                <Link className={`boton ${styles.botonFull} ${styles.botonGhost}`} href="/iniciar-sesion">
                                    Iniciar sesión
                                </Link>
                                <Link className={`boton botonPrimario ${styles.botonFull}`} href="/registrarse">
                                    Registrarse
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link className={`boton ${styles.botonFull} ${styles.botonGhost}`} href={rutaPanel}>
                                    Ir a mi panel
                                </Link>
                                <button type="button" className={`boton ${styles.botonFull} ${styles.botonSalir}`} onClick={cerrarSesion}>
                                    Cerrar sesión
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
