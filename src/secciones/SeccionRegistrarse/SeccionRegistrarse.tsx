"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./SeccionRegistrarse.module.css";
import Link from "next/link";
import { apiFetch, apiUrl } from "@/lib/api";
import { getRoleFromToken, rutaPorRole, setToken } from "@/lib/auth";

type RegisterBody = {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    role: "usuario" | "propietario";
    business_name?: string | null;
    phone?: string | null;
};

type LoginResp = { access_token: string; token_type: string };

function isValidEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

type SeccionRegistrarseProps = {
    defaultRole?: "usuario" | "propietario";
    mostrarRoles?: boolean;
    titulo?: string;
    subtitulo?: string;
    badge?: string;
    compact?: boolean;
};

export default function SeccionRegistrarse({
    defaultRole,
    mostrarRoles,
    titulo,
    subtitulo,
    badge,
    compact,
}: SeccionRegistrarseProps) {
    const router = useRouter();

    const [role, setRole] = useState<"usuario" | "propietario">(defaultRole || "usuario");
    const [first_name, setFirst] = useState("");
    const [last_name, setLast] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [business_name, setBusiness] = useState("");
    const [password, setPass] = useState("");
    const [password2, setPass2] = useState("");

    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (defaultRole) setRole(defaultRole);
    }, [defaultRole]);

    const puede = useMemo(() => {
        if (!first_name.trim() || !last_name.trim()) return false;
        if (!isValidEmail(email)) return false;
        if (!password || password.length < 6) return false;
        if (password !== password2) return false;
        if (role === "propietario" && !business_name.trim()) return false;
        return true;
    }, [first_name, last_name, email, password, password2, role, business_name]);

    async function autoLogin(userEmail: string, pass: string) {
        const body = new URLSearchParams();
        body.set("username", userEmail.trim());
        body.set("password", pass);

        const res = await fetch(apiUrl("/auth/login"), {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        });

        if (!res.ok) {
            const txt = await res.text().catch(() => "");
            throw new Error(txt || "No se pudo iniciar sesión");
        }

        return (await res.json()) as LoginResp;
    }

    async function enviar(e: React.FormEvent) {
        e.preventDefault();
        if (!puede) return;

        setError("");
        setCargando(true);

        try {
            const payload: RegisterBody = {
                first_name: first_name.trim(),
                last_name: last_name.trim(),
                email: email.trim().toLowerCase(),
                password,
                role,
                phone: phone.trim() || null,
                business_name: role === "propietario" ? business_name.trim() : null,
            };

            await apiFetch("/auth/register", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const login = await autoLogin(payload.email, password);
            setToken(login.access_token);

            const r = getRoleFromToken(login.access_token);
            // ✅ Si es propietario, mostramos planes primero
            if (r === "propietario") {
                router.push("/panel/planes");
            } else {
                router.push(rutaPorRole(r));
            }
        } catch (err: any) {
            setError(err?.message || "No se pudo registrar");
        } finally {
            setCargando(false);
        }
    }

    const mostrarSelector = mostrarRoles ?? !defaultRole;
    const headerBadge = badge || "Registro rápido • Roles • Preparado para PRO";
    const headerTitulo = titulo || "Crear cuenta";
    const headerSubtitulo =
        subtitulo ||
        (mostrarSelector
            ? "Crea tu cuenta como usuario o propietario. Luego te redirigimos al panel correcto."
            : role === "propietario"
                ? "Registra tu complejo y empieza a recibir reservas desde tu panel."
                : "Crea tu cuenta para reservar canchas en minutos.");

    function oauthUrl(path: string) {
        const origin = (process.env.NEXT_PUBLIC_API_ORIGIN || "").replace(/\/$/, "");
        if (origin) return `${origin}${path}`;
        try {
            const u = new URL(apiUrl("/"));
            u.pathname = u.pathname.replace(/\/api\/?$/, "");
            u.search = "";
            u.hash = "";
            return `${u.toString().replace(/\/$/, "")}${path}`;
        } catch {
            return path;
        }
    }

    const seccionClass = compact ? `${styles.seccion} ${styles.compact}` : styles.seccion;

    return (
        <section className={seccionClass}>
            <div className={`contenedor ${styles.grid}`}>
                <header className={styles.cabecera}>
                    <p className={styles.badge}>{headerBadge}</p>
                    <h1 className={styles.titulo}>{headerTitulo}</h1>
                    <p className={styles.subtitulo}>{headerSubtitulo}</p>

                    <div className={styles.linksTop}>
                        <span className={styles.muted}>¿Ya tienes cuenta?</span>
                        <Link className={styles.link} href="/iniciar-sesion">Iniciar sesión</Link>
                    </div>
                </header>

                <section className={`tarjeta ${styles.panel}`}>
                    <form onSubmit={enviar} className={styles.form}>
                        {error && <div className={styles.error}>{error}</div>}

                        <div className={styles.oauthStack}>
                            <button
                                type="button"
                                className={`boton botonPrimario ${styles.btnGoogle}`}
                                onClick={() => (window.location.href = oauthUrl("/auth/google/login"))}
                            >
                                <span className={styles.googleIcon} aria-hidden="true">
                                    <svg viewBox="0 0 48 48" role="presentation" focusable="false">
                                        <path
                                            fill="#EA4335"
                                            d="M24 9.5c3.54 0 6.64 1.22 9.11 3.6l6.8-6.8C35.87 2.5 30.31 0 24 0 14.62 0 6.51 5.38 2.55 13.22l7.9 6.13C12.24 13.02 17.67 9.5 24 9.5z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M46.5 24.5c0-1.6-.15-3.14-.43-4.63H24v9.26h12.6c-.54 2.94-2.22 5.42-4.72 7.08l7.26 5.63C43.45 37.94 46.5 31.76 46.5 24.5z"
                                        />
                                        <path
                                            fill="#4A90E2"
                                            d="M10.45 28.65a14.9 14.9 0 0 1 0-9.3l-7.9-6.13A24 24 0 0 0 0 24c0 3.87.93 7.52 2.55 10.78l7.9-6.13z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M24 48c6.31 0 11.61-2.08 15.48-5.66l-7.26-5.63c-2.02 1.36-4.6 2.17-8.22 2.17-6.33 0-11.76-3.52-13.55-8.35l-7.9 6.13C6.51 42.62 14.62 48 24 48z"
                                        />
                                    </svg>
                                </span>
                                Continuar con Google
                            </button>
                            <div className={styles.divider}>
                                <span>o registra con correo</span>
                            </div>
                        </div>

                        {mostrarSelector && (
                            <div className={styles.roles}>
                                <button
                                    type="button"
                                    className={`${styles.rolBtn} ${role === "usuario" ? styles.rolOn : ""}`}
                                    onClick={() => setRole("usuario")}
                                    aria-pressed={role === "usuario"}
                                >
                                    Usuario
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.rolBtn} ${role === "propietario" ? styles.rolOn : ""}`}
                                    onClick={() => setRole("propietario")}
                                    aria-pressed={role === "propietario"}
                                >
                                    Propietario
                                </button>
                            </div>
                        )}

                        <div className={styles.filas}>
                            <label className={styles.campo}>
                                <span className={styles.label}>Nombres</span>
                                <input className={styles.input} value={first_name} onChange={(e) => setFirst(e.target.value)} required />
                            </label>

                            <label className={styles.campo}>
                                <span className={styles.label}>Apellidos</span>
                                <input className={styles.input} value={last_name} onChange={(e) => setLast(e.target.value)} required />
                            </label>

                            <label className={styles.campo}>
                                <span className={styles.label}>Correo</span>
                                <input className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
                            </label>

                            <label className={styles.campo}>
                                <span className={styles.label}>Teléfono</span>
                                <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Ej: 922023667" />
                            </label>

                            {role === "propietario" && (
                                <label className={styles.campoFull}>
                                    <span className={styles.label}>Nombre del negocio *</span>
                                    <input className={styles.input} value={business_name} onChange={(e) => setBusiness(e.target.value)} required />
                                </label>
                            )}

                            <label className={styles.campo}>
                                <span className={styles.label}>Contraseña</span>
                                <input className={styles.input} value={password} onChange={(e) => setPass(e.target.value)} type="password" required />
                                <span className={styles.hint}>Mínimo 6 caracteres.</span>
                            </label>

                            <label className={styles.campo}>
                                <span className={styles.label}>Confirmar</span>
                                <input className={styles.input} value={password2} onChange={(e) => setPass2(e.target.value)} type="password" required />
                                {password2 && password !== password2 && <span className={styles.hintBad}>Las contraseñas no coinciden.</span>}
                            </label>
                        </div>

                        <div className={styles.acciones}>
                            <button className={`boton botonPrimario ${styles.btnPrincipal}`} disabled={!puede || cargando} type="submit">
                                {cargando ? "Creando…" : "Crear cuenta"}
                            </button>
                            <Link className={`boton ${styles.btnSec}`} href="/">
                                Volver al inicio
                            </Link>
                        </div>

                        <p className={styles.aviso}>
                            Luego podrás activar funciones <strong>PRO</strong> desde tu panel (suscripciones lo conectamos después).
                        </p>
                    </form>
                </section>
            </div>
        </section>
    );
}
