"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import styles from "./SeccionIniciarSesion.module.css";
import { apiFetch, apiUrl } from "@/lib/api";
import { getRoleFromToken, rutaPorRole, setToken } from "@/lib/auth";

type LoginResp = { access_token: string; token_type: string };
type OtpVerifyResp = { access_token: string; token_type: string; needs_profile: boolean };

function IconMail(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M22 6l-10 7L2 6" />
        </svg>
    );
}

function IconLock(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

function IconEye({ off = false, ...props }: { off?: boolean } & React.SVGProps<SVGSVGElement>) {
    if (off) {
        return (
            <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
        );
    }

    return (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function GoogleMark(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} viewBox="0 0 24 24" aria-hidden="true">
            <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
        </svg>
    );
}

export default function SeccionIniciarSesion() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");

    const [step, setStep] = useState<"start" | "code">("start");
    const [mostrarPassword, setMostrarPassword] = useState(true);
    const [verPassword, setVerPassword] = useState(false);
    const [remember, setRemember] = useState(false);

    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const [ok, setOk] = useState("");

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
        if (!validarEmail(email)) {
            setOk("");
            setError("Ingresa un correo válido.");
            return;
        }
        if (!password) {
            setOk("");
            setError("Ingresa tu contraseña.");
            return;
        }

        setError("");
        setOk("");
        setCargando(true);

        try {
            const body = new URLSearchParams();
            body.set("username", email.trim());
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
            setOk("");
            setError(err?.message || "No se pudo iniciar sesión");
        } finally {
            setCargando(false);
        }
    }

    async function solicitarCodigo() {
        if (!validarEmail(email)) {
            setOk("");
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
            setOk("");
            setError(err?.message || "No se pudo enviar el código.");
        } finally {
            setCargando(false);
        }
    }

    async function verificarCodigo() {
        if (!validarEmail(email)) {
            setOk("");
            setError("Ingresa un correo válido.");
            return;
        }
        if (code.length !== 6) {
            setOk("");
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

            const role = getRoleFromToken(data.access_token);
            router.push(rutaPorRole(role));
        } catch (err: any) {
            setOk("");
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

    async function enviar(e: FormEvent) {
        e.preventDefault();

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

    const buttonText = cargando
        ? "Verificando…"
        : mostrarPassword
            ? "Iniciar sesión"
            : step === "start"
                ? "Enviar código"
                : "Verificar";

    return (
        <section className={styles.seccion}>
            <div className={styles.loginCard} data-loading={cargando ? "true" : "false"} data-error={error ? "true" : "false"}>
                <div className={styles.cardGrid}>
                    {/* LADO IZQUIERDO */}
                    <aside className={styles.cardSide}>
                        <div className={styles.badge}>
                            <svg className={styles.floatingIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                            </svg>
                            ACCESO SEGURO
                        </div>

                        <h1 className={styles.titulo}>Bienvenido de nuevo</h1>
                        <p className={styles.subtitulo}>Ingresa para continuar a tu panel</p>

                        <div aria-live="polite" className={styles.msgWrap}>
                            {error && <div className={styles.msgError}>{error}</div>}
                            {ok && <div className={styles.msgOk}>{ok}</div>}
                        </div>

                        <p className={styles.sideHint}>Accede según tu rol y gestiona tus reservas sin complicarte.</p>

                        <div className={styles.sideLinks}>
                            <Link className={styles.link} href="/">Volver al inicio</Link>
                            <span className={styles.dot} aria-hidden="true">•</span>
                            <Link className={styles.link} href="/registrarse">Crear cuenta</Link>
                        </div>
                    </aside>

                    {/* LADO DERECHO */}
                    <section className={styles.cardMain}>
                        <form onSubmit={enviar}>
                            {/* Google primero */}
                            <div className={styles.socialButtons}>
                                <button className={styles.socialBtn} type="button" onClick={() => (window.location.href = "/api/auth/google/login")}>
                                    <GoogleMark width={20} height={20} />
                                    Google
                                </button>
                            </div>

                            {/* Divider */}
                            <div className={styles.divider}>
                                <div className={styles.dividerLine} />
                                <span className={styles.dividerText}>o ingresa con correo</span>
                                <div className={styles.dividerLine} />
                            </div>

                            {/* Email */}
                            <div className={styles.inputGroup}>
                                <label className={styles.inputLabel} htmlFor="email">Correo electrónico</label>
                                <div className={styles.fieldWrap}>
                                    <input
                                        id="email"
                                        type="email"
                                        className={styles.inputField}
                                        placeholder="tu@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                    <IconMail className={styles.inputIcon} width={20} height={20} />
                                </div>
                            </div>

                            {/* Password o Code */}
                            {mostrarPassword ? (
                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel} htmlFor="password">Contraseña</label>
                                    <div className={styles.fieldWrap}>
                                        <input
                                            id="password"
                                            type={verPassword ? "text" : "password"}
                                            className={styles.inputField}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <IconLock className={styles.inputIcon} width={20} height={20} />
                                        <button
                                            type="button"
                                            className={styles.passwordToggle}
                                            onClick={() => setVerPassword((v) => !v)}
                                            aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                        >
                                            <IconEye off={verPassword} width={20} height={20} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel} htmlFor="code">
                                        {step === "start" ? "Código (se enviará a tu correo)" : "Código de 6 dígitos"}
                                    </label>
                                    <div className={styles.fieldWrap}>
                                        <input
                                            id="code"
                                            type="text"
                                            inputMode="numeric"
                                            pattern="\d{6}"
                                            maxLength={6}
                                            className={styles.inputField}
                                            placeholder={step === "start" ? "Pulsa “Enviar código”" : "123456"}
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                            required={step === "code"}
                                            disabled={step === "start"}
                                        />
                                        <IconLock className={styles.inputIcon} width={20} height={20} />
                                    </div>
                                </div>
                            )}

                            {/* Remember / OTP links */}
                            {mostrarPassword ? (
                                <div className={styles.rememberRow}>
                                    <label className={styles.checkboxWrapper}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkboxInput}
                                            checked={remember}
                                            onChange={(e) => setRemember(e.target.checked)}
                                        />
                                        <span className={styles.checkboxLabel}>Recordarme</span>
                                    </label>

                                    <Link className={styles.link} href="/recuperar">¿Olvidaste tu contraseña?</Link>
                                </div>
                            ) : (
                                <div className={styles.rememberRow}>
                                    {step === "code" ? (
                                        <div className={styles.otpLinks}>
                                            <button type="button" className={styles.linkBtn} onClick={() => void reenviarCodigo()} disabled={cargando}>
                                                Reenviar código
                                            </button>
                                            <button type="button" className={styles.linkBtn} onClick={cambiarCorreo} disabled={cargando}>
                                                Cambiar correo
                                            </button>
                                        </div>
                                    ) : (
                                        <span className={styles.helperText}>Te enviaremos un código a tu correo.</span>
                                    )}

                                    <button
                                        type="button"
                                        className={styles.linkBtn}
                                        onClick={() => {
                                            setMostrarPassword(true);
                                            setStep("start");
                                            setCode("");
                                            setOk("");
                                            setError("");
                                        }}
                                    >
                                        Usar contraseña
                                    </button>
                                </div>
                            )}

                            {/* CTA */}
                            <button type="submit" className={styles.loginBtn} disabled={cargando}>
                                <span className={styles.btnContent}>
                                    {cargando && <span className={styles.spinner} aria-hidden="true" />}
                                    {buttonText}
                                </span>
                            </button>

                            {/* Switch method */}
                            <div className={styles.methodSwitch}>
                                <button
                                    type="button"
                                    className={styles.linkBtn}
                                    onClick={() => {
                                        setMostrarPassword((v) => !v);
                                        setVerPassword(false);
                                        setStep("start");
                                        setCode("");
                                        setPassword("");
                                        setOk("");
                                        setError("");
                                    }}
                                    disabled={cargando}
                                >
                                    {mostrarPassword ? "Ingresar con código" : "Ingresar con contraseña"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            </div>
        </section>
    );
}
