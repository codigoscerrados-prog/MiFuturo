"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./SeccionPerfil.module.css";
import { apiFetch } from "@/lib/api";

type PerfilMe = {
    id: number;
    username?: string | null;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
};

type PerfilPlan = {
    plan_id?: number | null;     // (ideal) 1 = FREE, 2 = PRO
    plan_name?: string | null;   // "FREE" / "PRO"
    status?: string | null;
};

function cn(...arr: Array<string | false | null | undefined>) {
    return arr.filter(Boolean).join(" ");
}

function initials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "U";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase();
}

type SeccionPerfilProps = {
    token: string;
    role?: string;
    perfil?: PerfilMe | null;
    onPerfilUpdated?: (p: PerfilMe | null) => void;
    onLogout?: () => void;
};

export default function SeccionPerfil(props: SeccionPerfilProps) {
    const { token, onPerfilUpdated } = props;

    const [me, setMe] = useState<PerfilMe | null>(null);
    const [plan, setPlan] = useState<PerfilPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [phoneEditEnabled, setPhoneEditEnabled] = useState(false);
    const [phoneDraft, setPhoneDraft] = useState("");
    const [passwordDraft, setPasswordDraft] = useState("");
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [savingPhone, setSavingPhone] = useState(false);

    // Upload avatar
    const fileRef = useRef<HTMLInputElement | null>(null);
    const [uploading, setUploading] = useState(false);

    const nombreCompleto = useMemo(() => {
        const n = [me?.first_name, me?.last_name].filter(Boolean).join(" ").trim();
        return n || me?.username || "Usuario";
    }, [me]);

    const email = useMemo(() => (me?.email || "").trim(), [me]);

    const isPro = useMemo(() => {
        const pid = plan?.plan_id ?? null;
        if (pid === 2) return true;
        const name = (plan?.plan_name || "").toLowerCase();
        if (name.includes("pro")) return true;
        return false;
    }, [plan]);

    const planLabel = useMemo(() => {
        if (isPro) return "PRO";
        return "FREE";
    }, [isPro]);

    const planChipClass = useMemo(() => {
        return cn(
            styles.planChip,
            isPro ? styles.planChipPro : styles.planChipFree
        );
    }, [isPro]);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [meData, planData] = await Promise.all([
                apiFetch<PerfilMe>("/perfil/me", { token }),
                apiFetch<PerfilPlan>("/perfil/plan", { token }).catch(() => null),
            ]);
            setMe(meData);
            setPlan(planData);
        } catch (e: any) {
            setError(e?.message || "No se pudo cargar el perfil.");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    useEffect(() => {
        if (phoneEditEnabled) return;
        setPhoneDraft(me?.phone || "");
    }, [me, phoneEditEnabled]);

    async function onPickAvatar(file?: File | null) {
        if (!file) return;
        const fd = new FormData();
        fd.append("archivo", file);

        try {
            setUploading(true);
            // ✅ sin isFormData: apiFetch detecta FormData o tu backend lo aceptará sin Content-Type manual
            await apiFetch("/perfil/me/avatar", { token, method: "POST", body: fd });
            await cargar();
        } catch (e: any) {
            setError(e?.message || "No se pudo subir el avatar.");
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    }

    async function solicitarEdicionTelefono() {
        if (!passwordDraft.trim()) {
            setError("Ingresa tu contraseña para editar.");
            return;
        }

        try {
            setVerifying(true);
            setError(null);
            await apiFetch("/auth/verify-password", {
                token,
                method: "POST",
                body: JSON.stringify({ password: passwordDraft }),
            });
            setPhoneEditEnabled(true);
            setShowPasswordPrompt(false);
            setPasswordDraft("");
            setPhoneDraft(me?.phone || "");
        } catch (e: any) {
            setError(e?.message || "Contraseña incorrecta.");
        } finally {
            setVerifying(false);
        }
    }

    async function guardarTelefono() {
        if (!me) return;
        try {
            setSavingPhone(true);
            setError(null);
            const actualizado = await apiFetch<PerfilMe>("/perfil/me", {
                token,
                method: "PUT",
                body: JSON.stringify({
                    first_name: me.first_name || "",
                    last_name: me.last_name || "",
                    phone: phoneDraft.trim() || null,
                }),
            });
            setMe(actualizado);
            setPhoneEditEnabled(false);
            if (typeof onPerfilUpdated === "function") onPerfilUpdated(actualizado);
        } catch (e: any) {
            setError(e?.message || "No se pudo guardar el teléfono.");
        } finally {
            setSavingPhone(false);
        }
    }

    function cancelarEdicionTelefono() {
        setPhoneEditEnabled(false);
        setPhoneDraft(me?.phone || "");
    }

    return (
        <section className={styles.seccion}>
            <div className={styles.header}>
                <div>
                    <p className={styles.kicker}>Perfil</p>
                    <h1 className={styles.titulo}>Mi cuenta</h1>
                    <p className={styles.muted}>
                        Revisa tu información y confirma con qué cuenta estás logueada
                    </p>
                </div>
            </div>

            {error ? <div className={styles.alertError}>{error}</div> : null}

            {loading ? (
                <div className={styles.skeleton} />
            ) : (
                <div className={styles.gridPerfil}>
                    {/* Avatar card */}
                    <div className={cn(styles.tarjeta, styles.stack)}>
                        <div className={styles.avatarCard}>
                            <div className={styles.avatarWrap}>
                                {me?.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={me.avatar_url} alt="Avatar" className={styles.avatar} />
                                ) : (
                                    <div className={styles.avatarFallback}>
                                        {initials(nombreCompleto)}
                                    </div>
                                )}
                            </div>

                            <div className={styles.avatarMeta}>
                                <p className={styles.nombre}>{nombreCompleto}</p>

                                {/* ✅ EMAIL visible para confirmar cuenta */}
                                <p className={styles.mutedSmall}>
                                    <strong>Correo:</strong>{" "}
                                    {email ? email : <span className={styles.mutedTiny}>— sin email —</span>}
                                </p>

                                <p className={styles.mutedTiny}>
                                    ID: {me?.id ?? "—"} {me?.username ? `- @${me.username}` : ""}
                                </p>
                            </div>
                        </div>

                        <div className={styles.divisor} />

                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className={styles.file}
                            onChange={(e) => onPickAvatar(e.target.files?.[0] || null)}
                        />

                        <button
                            type="button"
                            className={cn(styles.btnPrimary, styles.btnFull)}
                            disabled={uploading}
                            onClick={() => fileRef.current?.click()}
                        >
                            {uploading ? "Subiendo..." : "Cambiar foto"}
                        </button>

                        <p className={styles.mutedTiny}>
                            Tip: esto ayuda a identificar tu cuenta (y verificar si estás en PRO).
                        </p>
                    </div>

                    {/* Datos */}
                    <div className={cn(styles.tarjeta, styles.stack)}>
                        <div className={styles.between}>
                            <div>
                                <h3 className={styles.subtitulo}>Datos de tu cuenta</h3>
                                <p className={styles.mutedSmall}>
                                    Si el plan no coincide con tu cuenta PRO, revisa el correo arriba.
                                </p>
                            </div>

                            {!phoneEditEnabled && !showPasswordPrompt ? (
                                <button
                                    type="button"
                                    className={styles.btnGhost}
                                    onClick={() => {
                                        setShowPasswordPrompt(true);
                                        setError(null);
                                    }}
                                >
                                    Editar teléfono
                                </button>
                            ) : null}
                        </div>

                        <div className={styles.formGrid}>
                            <div className={styles.campo}>
                                <label className={styles.label}>Nombre</label>
                                <input className={styles.input} value={me?.first_name || ""} readOnly />
                            </div>

                            <div className={styles.campo}>
                                <label className={styles.label}>Apellido</label>
                                <input className={styles.input} value={me?.last_name || ""} readOnly />
                            </div>

                            <div className={styles.campo}>
                                <label className={styles.label}>Correo</label>
                                <input className={styles.input} value={email} readOnly />
                            </div>

                            <div className={styles.campo}>
                                <label className={styles.label}>Teléfono</label>
                                <input
                                    className={styles.input}
                                    value={phoneEditEnabled ? phoneDraft : (me?.phone || "")}
                                    onChange={(e) => setPhoneDraft(e.target.value)}
                                    readOnly={!phoneEditEnabled}
                                />
                            </div>
                        </div>

                        {showPasswordPrompt ? (
                            <div className={styles.campo}>
                                <label className={styles.label}>Contraseña</label>
                                <input
                                    className={styles.input}
                                    type="password"
                                    value={passwordDraft}
                                    onChange={(e) => setPasswordDraft(e.target.value)}
                                    placeholder="Ingresa tu contraseña"
                                />

                                <div className={styles.headerBtns}>
                                    <button
                                        type="button"
                                        className={styles.btnPrimary}
                                        onClick={solicitarEdicionTelefono}
                                        disabled={verifying}
                                    >
                                        {verifying ? "Verificando..." : "Verificar"}
                                    </button>

                                    <button
                                        type="button"
                                        className={styles.btnGhost}
                                        onClick={() => {
                                            setShowPasswordPrompt(false);
                                            setPasswordDraft("");
                                        }}
                                        disabled={verifying}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {phoneEditEnabled ? (
                            <div className={styles.headerBtns}>
                                <button
                                    type="button"
                                    className={styles.btnPrimary}
                                    onClick={guardarTelefono}
                                    disabled={savingPhone}
                                >
                                    {savingPhone ? "Guardando..." : "Guardar teléfono"}
                                </button>

                                <button
                                    type="button"
                                    className={styles.btnGhost}
                                    onClick={cancelarEdicionTelefono}
                                    disabled={savingPhone}
                                >
                                    Cancelar
                                </button>
                            </div>
                        ) : null}

                        <div className={styles.divisor} />

                        <div className={styles.hintBox}>
                            <p className={styles.hintTitle}>Más visibilidad, más confianza, más reservas</p>
                            <p className={styles.mutedSmall}>
                                Gracias por confiar en <strong>nuestra plataforma</strong> para gestionar <strong>tu complejo</strong>. Estamos felices de ayudarte a <strong>organizar reservas</strong>, <strong>mostrar tu cancha</strong> y <strong>conectar con más equipos</strong> cada día.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
