"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./SeccionIniciarSesion.module.css";
import { apiFetch, apiUrl } from "@/lib/api";
import { getRoleFromToken, rutaPorRole, setToken } from "@/lib/auth";
import Link from "next/link";

type LoginResp = { access_token: string; token_type: string };
type OtpVerifyResp = { access_token: string; token_type: string; needs_profile: boolean };

export default function SeccionIniciarSesion() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");

    const [step, setStep] = useState<"start" | "code">("start");
    const [mostrarCorreo, setMostrarCorreo] = useState(false);
    const [mostrarPassword, setMostrarPassword] = useState(false);

    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const [ok, setOk] = useState("");

    // Helper para URLs OAuth (usa env si existe, si no, cae al base de apiUrl).
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

    function guardarToken(token: string) {
        if (typeof setToken === "function") {
            setToken(token);
            return;
        }
        try {
            localStorage.setItem("token", token);
        } catch {
            // ignore
        }
    }

    function validarEmail(v: string) {
        return v.includes("@");
    }

    async function enviarPassword() {
        // Login clasico (no se borra por compatibilidad).
        if (!validarEmail(email)) {
            setError("Ingresa un correo válido.");
            return;
        }
        if (!password) {
            setError("Ingresa tu contraseña.");
            return;
        }

        setError("");
        setOk("");
        setCargando(true);

        try {
            const body = new URLSearchParams();
            body.set("username", email.trim()); // OAuth2PasswordRequestForm usa "username"
            body.set("password", password);

            const res = await fetch(apiUrl("/auth/login"), {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body,
            });

            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                throw new Error(txt || "Credenciales inválidas");
            }

            const data = (await res.json()) as LoginResp;
            guardarToken(data.access_token);

            const role = getRoleFromToken(data.access_token);
            router.push(rutaPorRole(role));
        } catch (err: any) {
            setError(err?.message || "No se pudo iniciar sesión");
        } finally {
            setCargando(false);
        }
    }

    async function solicitarCodigo() {
        if (!validarEmail(email)) {
            setError("Ingresa un correo válido.");
            return;
        }

        setError("");
        setOk("");
        setCargando(true);

        try {
            await apiFetch("/auth/otp/request", {
                method: "POST",
                body: JSON.stringify({ email: email.trim() }),
            });
            setOk("Te enviamos un código de 6 dígitos.");
            setStep("code");
        } catch (err: any) {
            setError(err?.message || "No se pudo enviar el código.");
        } finally {
            setCargando(false);
        }
    }

    async function verificarCodigo() {
        if (!validarEmail(email)) {
            setError("Ingresa un correo válido.");
            return;
        }
        if (code.length !== 6) {
            setError("Ingresa el código de 6 dígitos.");
            return;
        }

        setError("");
        setOk("");
        setCargando(true);

        try {
            const data = await apiFetch<OtpVerifyResp>("/auth/otp/verify", {
                method: "POST",
                body: JSON.stringify({ email: email.trim(), code }),
            });
            guardarToken(data.access_token);

            if (data.needs_profile) {
                router.push("/perfil/crear");
            } else {
                const role = getRoleFromToken(data.access_token);
                router.push(rutaPorRole(role));
            }
        } catch (err: any) {
            setError(err?.message || "No se pudo verificar el código.");
        } finally {
            setCargando(false);
        }
    }

    async function reenviarCodigo() {
        setCode("");
        await solicitarCodigo();
    }

    function cambiarCorreo() {
        setStep("start");
        setCode("");
        setOk("");
        setError("");
    }

    async function enviar(e: React.FormEvent) {
        e.preventDefault();
        if (!mostrarCorreo) return;
        if (mostrarPassword) {
            await enviarPassword();
            return;
        }
        if (step === "start") {
            await solicitarCodigo();
            return;
        }
        await verificarCodigo();
    }

    return (
        <section className={styles.seccion}>
            <div className={`contenedor ${styles.grid}`}>
                <header className={styles.cabecera}>
                    <p className={styles.badge}>Acceso seguro • Dashboard por rol • Estilo SaaS</p>
                    <h1 className={styles.titulo}>Iniciar sesión</h1>
                    <p className={styles.subtitulo}>Entra a tu cuenta para administrar canchas o reservar.</p>

                    <div className={styles.linksTop}>
                        <span className={styles.muted}>¿No tienes cuenta?</span>
                        <Link className={styles.link} href="/registrarse">Crear cuenta</Link>
                    </div>
                </header>

                <section className={`tarjeta ${styles.panel}`}>
                    <form onSubmit={enviar} className={styles.form}>
                        {error && <div className={styles.error}>{error}</div>}
                        {ok && <div className={styles.ok}>{ok}</div>}

                        {/* Opciones OAuth */}
                        <div className={styles.oauthStack}>
                            <button
                                className={`boton ${styles.oauthBtn}`}
                                type="button"
                                onClick={() => (window.location.href = oauthUrl("/auth/google/login"))}
                            >
                                Continuar con Google
                            </button>
                            <button
                                className={`boton ${styles.oauthBtn}`}
                                type="button"
                                onClick={() => (window.location.href = oauthUrl("/auth/facebook/login"))}
                            >
                                Continuar con Facebook
                            </button>
                        </div>

                        <div className={styles.divider} aria-hidden="true">
                            <span>o</span>
                        </div>

                        {!mostrarCorreo ? (
                            <button
                                className={`boton ${styles.btnSec}`}
                                type="button"
                                onClick={() => setMostrarCorreo(true)}
                            >
                                Ingresar con correo
                            </button>
                        ) : (
                            <div className={styles.emailBlock}>
                                <label className={styles.campo}>
                                    <span className={styles.label}>Correo</span>
                                    <input
                                        className={styles.input}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="tuemail@email.com"
                                        type="email"
                                        required
                                    />
                                </label>

                                {step === "code" && !mostrarPassword && (
                                    <label className={styles.campo}>
                                        <span className={styles.label}>Código</span>
                                        <input
                                            className={styles.input}
                                            value={code}
                                            onChange={(e) =>
                                                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                                            }
                                            placeholder="123456"
                                            inputMode="numeric"
                                            pattern="\d{6}"
                                            maxLength={6}
                                            required
                                        />
                                    </label>
                                )}

                                {mostrarPassword && (
                                    <label className={styles.campo}>
                                        <span className={styles.label}>Contraseña</span>
                                        <input
                                            className={styles.input}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            type="password"
                                            required
                                        />
                                    </label>
                                )}

                                <div className={styles.acciones}>
                                    <button
                                        className={`boton botonPrimario ${styles.btnPrincipal}`}
                                        disabled={cargando}
                                        type="submit"
                                    >
                                        {cargando
                                            ? "Procesando…"
                                            : mostrarPassword
                                            ? "Ingresar"
                                            : step === "start"
                                            ? "Enviar código"
                                            : "Verificar"}
                                    </button>

                                    <button
                                        type="button"
                                        className={`boton ${styles.btnSec}`}
                                        onClick={() => {
                                            setMostrarCorreo(false);
                                            setMostrarPassword(false);
                                            setStep("start");
                                            setCode("");
                                            setOk("");
                                            setError("");
                                        }}
                                    >
                                        Volver
                                    </button>
                                </div>

                                {!mostrarPassword && step === "code" && (
                                    <div className={styles.inlineLinks}>
                                        <button
                                            type="button"
                                            className={styles.linkBtn}
                                            onClick={() => void reenviarCodigo()}
                                            disabled={cargando}
                                        >
                                            Reenviar código
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.linkBtn}
                                            onClick={cambiarCorreo}
                                            disabled={cargando}
                                        >
                                            Cambiar correo
                                        </button>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    className={styles.linkBtn}
                                    onClick={() => setMostrarPassword((v) => !v)}
                                >
                                    {mostrarPassword ? "Usar código" : "Ingresar con contraseña"}
                                </button>
                            </div>
                        )}

                        <div className={styles.acciones}>
                            <Link className={`boton ${styles.btnSec}`} href="/">
                                Volver al inicio
                            </Link>
                        </div>

                        <p className={styles.aviso}>
                            Tu acceso redirige automáticamente según tu rol: <strong>admin</strong>, <strong>propietario</strong> o <strong>usuario</strong>.
                        </p>
                    </form>
                </section>
            </div>
        </section>
    );
}
