"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import styles from "./page.module.css";
import { AUTH_PAGE_BODY_CLASS } from "@/lib/ui";

function isValidEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function RecuperarPage() {
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");
    const [step, setStep] = useState<"request" | "reset">("request");
    const [touched, setTouched] = useState(false);
    const [ok, setOk] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (typeof document === "undefined") return;
        document.body.classList.add(AUTH_PAGE_BODY_CLASS);
        return () => {
            document.body.classList.remove(AUTH_PAGE_BODY_CLASS);
        };
    }, []);

    const puede = useMemo(() => {
        if (!isValidEmail(email)) return false;
        if (step === "request") return true;
        if (code.trim().length !== 6) return false;
        if (password.length < 6) return false;
        if (password !== password2) return false;
        return true;
    }, [email, step, code, password, password2]);

    function enviar(e: FormEvent) {
        e.preventDefault();
        setTouched(true);
        setOk("");
        setError("");

        if (!isValidEmail(email)) {
            setError("Ingresa un correo valido.");
            return;
        }

        if (step === "request") {
            // Placeholder until backend is defined.
            setOk("Si el correo existe, enviaremos instrucciones para restablecer tu contrasena.");
            return;
        }

        if (code.trim().length !== 6) {
            setError("Ingresa el codigo de 6 digitos.");
            return;
        }
        if (password.length < 6) {
            setError("La contrasena debe tener al menos 6 caracteres.");
            return;
        }
        if (password !== password2) {
            setError("Las contrasenas no coinciden.");
            return;
        }

        // Placeholder until backend is defined.
        setOk("Tu contrasena fue actualizada. Ya puedes iniciar sesion.");
    }

    return (
        <section className={styles.seccion}>
            <div className={styles.card}>
                <div className={styles.brandRow}>
                    <BrandLogo href="/" variant="compact" size="lg" />
                    <span className={styles.badge}>RECUPERACION</span>
                </div>

                <h1 className={styles.titulo}>Recuperar contrasena</h1>
                <p className={styles.subtitulo}>
                    {step === "request"
                        ? "Ingresa tu correo y te enviaremos los pasos para recuperar el acceso."
                        : "Ingresa el codigo y define una nueva contrasena."}
                </p>

                {error && <div className={styles.msgError}>{error}</div>}
                {ok && <div className={styles.msgOk}>{ok}</div>}

                <form onSubmit={enviar} className={styles.form}>
                    <label className={styles.campo}>
                        <span className={styles.label}>Correo electronico</span>
                        <input
                            type="email"
                            className={styles.input}
                            placeholder="tu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => setTouched(true)}
                            required
                        />
                        {touched && !puede && (
                            <span className={styles.helper}>Ingresa un correo valido.</span>
                        )}
                    </label>

                    {step === "reset" && (
                        <>
                            <label className={styles.campo}>
                                <span className={styles.label}>Codigo de 6 digitos</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="\\d{6}"
                                    maxLength={6}
                                    className={styles.input}
                                    placeholder="123456"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\\D/g, "").slice(0, 6))}
                                />
                            </label>

                            <label className={styles.campo}>
                                <span className={styles.label}>Nueva contrasena</span>
                                <input
                                    type="password"
                                    className={styles.input}
                                    placeholder="Minimo 6 caracteres"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </label>

                            <label className={styles.campo}>
                                <span className={styles.label}>Confirmar contrasena</span>
                                <input
                                    type="password"
                                    className={styles.input}
                                    placeholder="Repite tu contrasena"
                                    value={password2}
                                    onChange={(e) => setPassword2(e.target.value)}
                                />
                            </label>
                        </>
                    )}

                    <button type="submit" className={styles.btn} disabled={!puede}>
                        {step === "request" ? "Enviar instrucciones" : "Actualizar contrasena"}
                    </button>
                </form>

                <div className={styles.switchRow}>
                    {step === "request" ? (
                        <button
                            type="button"
                            className={styles.linkBtn}
                            onClick={() => {
                                setStep("reset");
                                setOk("");
                                setError("");
                            }}
                        >
                            Ya tengo un codigo
                        </button>
                    ) : (
                        <button
                            type="button"
                            className={styles.linkBtn}
                            onClick={() => {
                                setStep("request");
                                setCode("");
                                setPassword("");
                                setPassword2("");
                                setOk("");
                                setError("");
                            }}
                        >
                            Volver a solicitar codigo
                        </button>
                    )}
                </div>

                <div className={styles.footer}>
                    <span className={styles.muted}>Ya recordaste tu contrasena?</span>
                    <Link className={styles.link} href="/iniciar-sesion">
                        Volver a iniciar sesion
                    </Link>
                </div>
            </div>
        </section>
    );
}
