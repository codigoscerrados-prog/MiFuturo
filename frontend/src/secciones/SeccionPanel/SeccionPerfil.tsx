"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./SeccionPerfil.module.css";
import { apiFetch } from "@/lib/api";

type PerfilMe = {
    id: number;
    username?: string | null;
    role?: string | null;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    business_name?: string | null;
    player_position?: string | null;
    jersey_number?: number | null;
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
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState({
        first_name: "",
        last_name: "",
        phone: "",
        business_name: "",
        player_position: "",
        jersey_number: "",
    });

    // Upload avatar
    const fileRef = useRef<HTMLInputElement | null>(null);
    const [uploading, setUploading] = useState(false);

    const nombreCompleto = useMemo(() => {
        const n = [me?.first_name, me?.last_name].filter(Boolean).join(" ").trim();
        return n || me?.username || "Usuario";
    }, [me]);

    const email = useMemo(() => (me?.email || "").trim(), [me]);
    const role = useMemo(() => props.role || me?.role || "usuario", [props.role, me]);

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
        if (editMode) return;
        setDraft({
            first_name: me?.first_name || "",
            last_name: me?.last_name || "",
            phone: me?.phone || "",
            business_name: me?.business_name || "",
            player_position: me?.player_position || "",
            jersey_number: me?.jersey_number != null ? String(me.jersey_number) : "",
        });
    }, [me, editMode]);

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

    async function guardarPerfil() {
        if (!me) return;

        const jerseyText = draft.jersey_number.trim();
        const jerseyNumber = jerseyText ? Number(jerseyText) : null;
        if (jerseyText && !Number.isFinite(jerseyNumber)) {
            setError("Dorsal inválido.");
            return;
        }
        if (jerseyNumber != null && (jerseyNumber < 0 || jerseyNumber > 99)) {
            setError("Dorsal debe estar entre 0 y 99.");
            return;
        }

        try {
            setSaving(true);
            setError(null);
            const actualizado = await apiFetch<PerfilMe>("/perfil/me", {
                token,
                method: "PUT",
                body: JSON.stringify({
                    first_name: draft.first_name.trim(),
                    last_name: draft.last_name.trim(),
                    phone: draft.phone.trim() || null,
                    business_name: draft.business_name.trim() || null,
                    player_position: draft.player_position.trim() || null,
                    jersey_number: jerseyNumber,
                }),
            });
            setMe(actualizado);
            setEditMode(false);
            if (typeof onPerfilUpdated === "function") onPerfilUpdated(actualizado);
        } catch (e: any) {
            setError(e?.message || "No se pudo guardar el perfil.");
        } finally {
            setSaving(false);
        }
    }

    function cancelarEdicion() {
        setEditMode(false);
        setDraft({
            first_name: me?.first_name || "",
            last_name: me?.last_name || "",
            phone: me?.phone || "",
            business_name: me?.business_name || "",
            player_position: me?.player_position || "",
            jersey_number: me?.jersey_number != null ? String(me.jersey_number) : "",
        });
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

                                {!editMode ? (
                                    <button
                                        type="button"
                                        className={styles.btnGhost}
                                        onClick={() => {
                                            setEditMode(true);
                                            setError(null);
                                        }}
                                    >
                                        Editar
                                    </button>
                                ) : null}
                            </div>

                        <div className={styles.formGrid}>
                            <div className={styles.campo}>
                                <label className={styles.label}>Nombre</label>
                                <input
                                    className={styles.input}
                                    value={editMode ? draft.first_name : (me?.first_name || "")}
                                    onChange={(e) => setDraft({ ...draft, first_name: e.target.value })}
                                    readOnly={!editMode}
                                />
                            </div>

                            <div className={styles.campo}>
                                <label className={styles.label}>Apellido</label>
                                <input
                                    className={styles.input}
                                    value={editMode ? draft.last_name : (me?.last_name || "")}
                                    onChange={(e) => setDraft({ ...draft, last_name: e.target.value })}
                                    readOnly={!editMode}
                                />
                            </div>

                            <div className={styles.campo}>
                                <label className={styles.label}>Correo</label>
                                <input className={styles.input} value={email} readOnly />
                            </div>

                            <div className={styles.campo}>
                                <label className={styles.label}>Teléfono</label>
                                <input
                                    className={styles.input}
                                    value={editMode ? draft.phone : (me?.phone || "")}
                                    onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                                    readOnly={!editMode}
                                />
                            </div>

                            {role === "propietario" ? (
                                <div className={styles.campo}>
                                    <label className={styles.label}>Negocio</label>
                                    <input
                                        className={styles.input}
                                        value={editMode ? draft.business_name : (me?.business_name || "")}
                                        onChange={(e) => setDraft({ ...draft, business_name: e.target.value })}
                                        readOnly={!editMode}
                                    />
                                </div>
                            ) : null}

                            {role === "usuario" ? (
                                <div className={styles.campo}>
                                    <label className={styles.label}>Posición</label>
                                    <input
                                        className={styles.input}
                                        value={editMode ? draft.player_position : (me?.player_position || "")}
                                        onChange={(e) => setDraft({ ...draft, player_position: e.target.value })}
                                        readOnly={!editMode}
                                    />
                                </div>
                            ) : null}

                            {role === "usuario" ? (
                                <div className={styles.campo}>
                                    <label className={styles.label}>Dorsal</label>
                                    <input
                                        className={styles.input}
                                        type="number"
                                        min={0}
                                        max={99}
                                        value={editMode ? draft.jersey_number : (me?.jersey_number ?? "")}
                                        onChange={(e) => setDraft({ ...draft, jersey_number: e.target.value })}
                                        readOnly={!editMode}
                                    />
                                </div>
                            ) : null}
                        </div>

                        {editMode ? (
                            <div className={styles.headerBtns}>
                                <button
                                    type="button"
                                    className={styles.btnPrimary}
                                    onClick={guardarPerfil}
                                    disabled={saving}
                                >
                                    {saving ? "Guardando..." : "Guardar"}
                                </button>

                                <button
                                    type="button"
                                    className={styles.btnGhost}
                                    onClick={cancelarEdicion}
                                    disabled={saving}
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
