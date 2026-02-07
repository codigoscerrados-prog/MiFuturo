"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import GoogleMark from "@/components/GoogleMark";

import styles from "./SeccionRegistrarse.module.css";
import { apiFetch, apiUrl } from "@/lib/api";
import { getRoleFromToken, rutaPorRole, setToken } from "@/lib/auth";
import { AUTH_PAGE_BODY_CLASS } from "@/lib/ui";

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
    const [showPass, setShowPass] = useState(false);
    const [showPass2, setShowPass2] = useState(false);

    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");

    const passwordError = useMemo(() => {
        if (!password) return "";
        if (password.length < 6) return "Mínimo 6 caracteres.";
        if (!/[@#]/.test(password)) return "Debe incluir al menos @ o #.";
        return "";
    }, [password]);

    const password2Error = useMemo(() => {
        if (!password2) return "";
        if (password !== password2) return "Las contraseñas no coinciden.";
        return "";
    }, [password, password2]);

    useEffect(() => {
        if (defaultRole) setRole(defaultRole);
    }, [defaultRole]);

    useEffect(() => {
        if (typeof document === "undefined") return;
        document.body.classList.add(AUTH_PAGE_BODY_CLASS);
        return () => {
            document.body.classList.remove(AUTH_PAGE_BODY_CLASS);
        };
    }, []);

    const puede = useMemo(() => {
        if (!first_name.trim() || !last_name.trim()) return false;
        if (!isValidEmail(email)) return false;
        if (!password || password.length < 6) return false;
        if (!/[@#]/.test(password)) return false;
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

    function buildApiPath(path: string) {
        const normalized = path.startsWith("/") ? path : `/${path}`;
        return `/api${normalized.replace(/^\/api\/?/, "/")}`;
    }

    function oauthUrl(path: string, params?: Record<string, string | undefined>) {
        const origin = typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
        const url = new URL(buildApiPath(path), origin);

        if (params) {
            const query = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value != null && value !== "") {
                    query.set(key, value);
                }
            });

            if (query.toString()) {
                url.search = query.toString();
            }
        }

        return url.toString();
    }

    const googleNextPath = role === "propietario" ? "/panel/planes" : rutaPorRole(role);
    const seccionClass = compact ? `${styles.seccion} ${styles.compact}` : styles.seccion;

    return (
        <section className={seccionClass}>
            <div className={`contenedor ${styles.grid}`}>
                <section className={`tarjeta ${styles.panel}`}>
                    <div className={styles.panelGrid}>
                        <aside className={styles.panelSide}>
                        <header className={styles.cabecera}>
                            <div className={styles.brandRow}>
                                <BrandLogo href="/" variant="compact" size="lg" />
                            </div>
                            <p className={styles.badge}>{headerBadge}</p>
                            <h1 className={styles.titulo}>{headerTitulo}</h1>
                            <p className={styles.subtitulo}>{headerSubtitulo}</p>

                            <div className={styles.linksTop}>
                                <span className={styles.muted}>¿Ya tienes cuenta?</span>
                                <Link className={styles.link} href="/iniciar-sesion">Iniciar sesión</Link>
                            </div>
                        </header>
                        </aside>

                        <div className={styles.panelMain}>
                        <form onSubmit={enviar} className={styles.form}>
                            {error && <div className={styles.error}>{error}</div>}

                            <div className={styles.oauthStack}>
                                <button
                                    type="button"
                                    className={`boton botonPrimario ${styles.btnGoogle}`}
                                    onClick={() =>
                                        (window.location.href = oauthUrl("/auth/google/login", {
                                            role,
                                            next: googleNextPath,
                                        }))
                                    }
                                >
                                    <span className={styles.googleIcon} aria-hidden="true">
                                        <GoogleMark width={18} height={18} aria-hidden="true" />
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
                                    onClick={() => {
                                        const next = role === "propietario" ? "/panel/planes" : "/panel";
                                        window.location.href = oauthUrl("/auth/google/login", {
                                            role,
                                            next,
                                        });
                                    }}

                                        aria-pressed={role === "propietario"}
                                    >
                                        Propietario
                                    </button>
                                </div>
                            )}

                            <div className={styles.filas}>
                                <label className={styles.campo}>
                                    <span className={styles.label}>Nombres</span>
                                    <input
                                        id="first_name"
                                        name="first_name"
                                        autoComplete="given-name"
                                        className={styles.input}
                                        value={first_name}
                                        onChange={(e) => setFirst(e.target.value)}
                                        required
                                    />
                                </label>

                                <label className={styles.campo}>
                                    <span className={styles.label}>Apellidos</span>
                                    <input
                                        id="last_name"
                                        name="last_name"
                                        autoComplete="family-name"
                                        className={styles.input}
                                        value={last_name}
                                        onChange={(e) => setLast(e.target.value)}
                                        required
                                    />
                                </label>

                                <label className={styles.campo}>
                                    <span className={styles.label}>Correo</span>
                                    <input
                                        id="email"
                                        name="email"
                                        autoComplete="email"
                                        className={styles.input}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        type="email"
                                        required
                                    />
                                </label>

                                <label className={styles.campo}>
                                    <span className={styles.label}>Teléfono</span>
                                    <input
                                        id="phone"
                                        name="phone"
                                        autoComplete="tel"
                                        className={styles.input}
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        inputMode="tel"
                                        placeholder="Ej: 922023667"
                                    />
                                </label>

                                <label className={styles.campo}>
                                    <span className={styles.label}>Contraseña</span>
                                    <div className={styles.inputWrap}>
                                        <input
                                            className={styles.input}
                                            value={password}
                                            onChange={(e) => setPass(e.target.value)}
                                            type={showPass ? "text" : "password"}
                                            required
                                            id="password"
                                            name="password"
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className={styles.toggleBtn}
                                            onClick={() => setShowPass((v) => !v)}
                                            aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                                        >
                                            <i className={`bi ${showPass ? "bi-eye-slash" : "bi-eye"}`} aria-hidden="true"></i>
                                        </button>
                                    </div>
                                    <span className={styles.hint}>Mínimo 6 caracteres, incluye @ o #.</span>
                                    {passwordError ? <span className={styles.hintBad}>{passwordError}</span> : null}
                                </label>

                                <label className={styles.campo}>
                                    <span className={styles.label}>Confirmar</span>
                                    <div className={styles.inputWrap}>
                                        <input
                                            className={styles.input}
                                            value={password2}
                                            onChange={(e) => setPass2(e.target.value)}
                                            type={showPass2 ? "text" : "password"}
                                            required
                                            id="password_confirm"
                                            name="password_confirm"
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className={styles.toggleBtn}
                                            onClick={() => setShowPass2((v) => !v)}
                                            aria-label={showPass2 ? "Ocultar contraseña" : "Mostrar contraseña"}
                                        >
                                            <i className={`bi ${showPass2 ? "bi-eye-slash" : "bi-eye"}`} aria-hidden="true"></i>
                                        </button>
                                    </div>
                                    {password2Error ? <span className={styles.hintBad}>{password2Error}</span> : null}
                                </label>

                                {role === "propietario" && (
                                    <label className={styles.campoFull}>
                                        <span className={styles.label}>Nombre del negocio *</span>
                                        <input
                                            id="business_name"
                                            name="business_name"
                                            autoComplete="organization"
                                            className={styles.input}
                                            value={business_name}
                                            onChange={(e) => setBusiness(e.target.value)}
                                            required
                                        />
                                    </label>
                                )}
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
                        </div>
                    </div>
                </section>
            </div>
        </section>
    );
}
