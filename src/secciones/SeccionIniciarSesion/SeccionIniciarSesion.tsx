"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./SeccionIniciarSesion.module.css";
import { apiUrl } from "@/lib/api";
import { getRoleFromToken, rutaPorRole, setToken } from "@/lib/auth";
import Link from "next/link";

type LoginResp = { access_token: string; token_type: string };

export default function SeccionIniciarSesion() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");

    async function enviar(e: React.FormEvent) {
        e.preventDefault();
        setError("");
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
            setToken(data.access_token);

            const role = getRoleFromToken(data.access_token);
            router.push(rutaPorRole(role));
        } catch (err: any) {
            setError(err?.message || "No se pudo iniciar sesión");
        } finally {
            setCargando(false);
        }
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

                        <div className={styles.acciones}>
                            <button className={`boton botonPrimario ${styles.btnPrincipal}`} disabled={cargando} type="submit">
                                {cargando ? "Ingresando…" : "Ingresar"}
                            </button>

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
