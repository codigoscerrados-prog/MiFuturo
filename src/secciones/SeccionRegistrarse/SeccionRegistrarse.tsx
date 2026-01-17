"use client";

import { useMemo, useState } from "react";
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

export default function SeccionRegistrarse() {
    const router = useRouter();

    const [role, setRole] = useState<"usuario" | "propietario">("usuario");
    const [first_name, setFirst] = useState("");
    const [last_name, setLast] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [business_name, setBusiness] = useState("");
    const [password, setPass] = useState("");
    const [password2, setPass2] = useState("");

    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");

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
            router.push(rutaPorRole(r));
        } catch (err: any) {
            setError(err?.message || "No se pudo registrar");
        } finally {
            setCargando(false);
        }
    }

    return (
        <section className={styles.seccion}>
            <div className={`contenedor ${styles.grid}`}>
                <header className={styles.cabecera}>
                    <p className={styles.badge}>Registro rápido • Roles • Preparado para PRO</p>
                    <h1 className={styles.titulo}>Crear cuenta</h1>
                    <p className={styles.subtitulo}>
                        Crea tu cuenta como <strong>usuario</strong> o <strong>propietario</strong>. Luego te redirigimos al panel correcto.
                    </p>

                    <div className={styles.linksTop}>
                        <span className={styles.muted}>¿Ya tienes cuenta?</span>
                        <Link className={styles.link} href="/iniciar-sesion">Iniciar sesión</Link>
                    </div>
                </header>

                <section className={`tarjeta ${styles.panel}`}>
                    <form onSubmit={enviar} className={styles.form}>
                        {error && <div className={styles.error}>{error}</div>}

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
