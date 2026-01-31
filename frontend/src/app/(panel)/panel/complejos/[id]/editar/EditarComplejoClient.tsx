"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./page.module.css";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { publicImgUrl } from "@/lib/publicImage";

type ComplejoForm = {
    id: number;
    nombre: string;
    slug: string;
    descripcion?: string | null;
    direccion?: string | null;
    distrito?: string | null;
    provincia?: string | null;
    departamento?: string | null;
    latitud?: number | null;
    longitud?: number | null;
    techada: boolean;
    iluminacion: boolean;
    vestuarios: boolean;
    estacionamiento: boolean;
    cafeteria: boolean;
};

type ComplejoImagen = {
    id: number;
    url: string;
    orden: number;
    is_cover: boolean;
};

type ComplejoOut = ComplejoForm;

type ComplejoPerfil = {
    imagenes: ComplejoImagen[];
};

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export default function EditarComplejoClient() {
    const params = useParams();
    const router = useRouter();
    const id = Number(Array.isArray(params?.id) ? params?.id[0] : params?.id);

    const [token, setToken] = useState<string | null>(null);
    const [form, setForm] = useState<ComplejoForm | null>(null);
    const [imagenes, setImagenes] = useState<ComplejoImagen[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const canUploadMore = imagenes.length < 10;

    useEffect(() => {
        const t = getToken();
        setToken(t);
        if (!t || !id) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        apiFetch<ComplejoOut>(`/panel/complejos/${id}`, { token: t })
            .then((res) => {
                setForm(res);
                return apiFetch<ComplejoPerfil>(`/public/complejos/${res.slug}`, { token: t });
            })
            .then((perfil) => {
                setImagenes(perfil.imagenes || []);
            })
            .catch((e: any) => {
                setError(e?.message || "No se pudo cargar el complejo.");
            })
            .finally(() => setLoading(false));
    }, [id]);

    const payload = useMemo(() => {
        if (!form) return null;
        return {
            nombre: form.nombre,
            slug: form.slug,
            descripcion: form.descripcion || null,
            direccion: form.direccion || null,
            distrito: form.distrito || null,
            provincia: form.provincia || null,
            departamento: form.departamento || null,
            latitud: form.latitud ?? null,
            longitud: form.longitud ?? null,
            techada: form.techada,
            iluminacion: form.iluminacion,
            vestuarios: form.vestuarios,
            estacionamiento: form.estacionamiento,
            cafeteria: form.cafeteria,
        };
    }, [form]);

    function updateField<K extends keyof ComplejoForm>(key: K, value: ComplejoForm[K]) {
        setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    }

    async function handleSave() {
        if (!token || !form) return;
        setSaving(true);
        setNotice(null);
        try {
            const updated = await apiFetch<ComplejoOut>(`/complejos/${id}`, {
                token,
                method: "PATCH",
                body: JSON.stringify(payload),
            });
            setForm(updated);
            setNotice("Cambios guardados.");
        } catch (e: any) {
            setError(e?.message || "No se pudo guardar.");
        } finally {
            setSaving(false);
        }
    }

    async function handleUpload(files: FileList | null) {
        if (!token || !files || files.length === 0) return;
        if (!canUploadMore) {
            setNotice("Maximo 10 imagenes.");
            return;
        }
        const total = imagenes.length + files.length;
        if (total > 10) {
            setNotice("Maximo 10 imagenes por complejo.");
            return;
        }

        const oversize = Array.from(files).filter((file) => file.size > MAX_IMAGE_BYTES);
        if (oversize.length) {
            setNotice("Cada imagen debe pesar max 2MB.");
        }
        const validFiles = Array.from(files).filter((file) => file.size <= MAX_IMAGE_BYTES);
        if (validFiles.length === 0) return;

        setUploading(true);
        setNotice(null);
        try {
            const fd = new FormData();
            validFiles.forEach((file) => fd.append("archivos", file));
            const res = await apiFetch<ComplejoImagen[]>(`/complejos/${id}/imagenes`, {
                token,
                method: "POST",
                body: fd,
            });
            setImagenes((prev) => [...prev, ...res]);
        } catch (e: any) {
            setNotice(e?.message || "No se pudieron subir las imagenes.");
        } finally {
            setUploading(false);
        }
    }

    async function handleDeleteImage(imgId: number) {
        if (!token) return;
        try {
            await apiFetch(`/complejos/${id}/imagenes/${imgId}`, { token, method: "DELETE" });
            setImagenes((prev) => prev.filter((img) => img.id !== imgId));
        } catch (e: any) {
            setNotice(e?.message || "No se pudo borrar la imagen.");
        }
    }

    if (loading) {
        return <div className={styles.page}>Cargando...</div>;
    }

    if (!token) {
        return <div className={styles.page}>Necesitas iniciar sesion.</div>;
    }

    if (error || !form) {
        return <div className={styles.page}>{error || "No se encontro el complejo."}</div>;
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <p className={styles.kicker}>Panel propietario</p>
                    <h1 className={styles.title}>Editar complejo</h1>
                </div>
                <div className={styles.headerActions}>
                    <button type="button" className={styles.btnGhost} onClick={() => router.back()}>
                        Volver
                    </button>
                    <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                        {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                </div>
            </div>

            {notice ? <div className={styles.notice}>{notice}</div> : null}

            <div className={styles.grid}>
                <section className={styles.card}>
                    <h2 className={styles.sectionTitle}>Informacion</h2>
                    <div className={styles.formGrid}>
                        <label className={styles.field}>
                            <span className={styles.label}>Nombre</span>
                            <input
                                className={styles.input}
                                value={form.nombre}
                                onChange={(e) => updateField("nombre", e.target.value)}
                            />
                        </label>
                        <label className={styles.field}>
                            <span className={styles.label}>Slug</span>
                            <input
                                className={styles.input}
                                value={form.slug || ""}
                                onChange={(e) => updateField("slug", e.target.value)}
                            />
                        </label>
                        <label className={styles.fieldWide}>
                            <span className={styles.label}>Descripcion</span>
                            <textarea
                                className={styles.textarea}
                                rows={3}
                                value={form.descripcion || ""}
                                onChange={(e) => updateField("descripcion", e.target.value)}
                            />
                        </label>
                        <label className={styles.fieldWide}>
                            <span className={styles.label}>Direccion</span>
                            <input
                                className={styles.input}
                                value={form.direccion || ""}
                                onChange={(e) => updateField("direccion", e.target.value)}
                            />
                        </label>
                        <label className={styles.field}>
                            <span className={styles.label}>Distrito</span>
                            <input
                                className={styles.input}
                                value={form.distrito || ""}
                                onChange={(e) => updateField("distrito", e.target.value)}
                            />
                        </label>
                        <label className={styles.field}>
                            <span className={styles.label}>Provincia</span>
                            <input
                                className={styles.input}
                                value={form.provincia || ""}
                                onChange={(e) => updateField("provincia", e.target.value)}
                            />
                        </label>
                        <label className={styles.field}>
                            <span className={styles.label}>Departamento</span>
                            <input
                                className={styles.input}
                                value={form.departamento || ""}
                                onChange={(e) => updateField("departamento", e.target.value)}
                            />
                        </label>
                        <label className={styles.field}>
                            <span className={styles.label}>Latitud</span>
                            <input
                                className={styles.input}
                                type="number"
                                value={form.latitud ?? ""}
                                onChange={(e) => updateField("latitud", e.target.value ? Number(e.target.value) : null)}
                            />
                        </label>
                        <label className={styles.field}>
                            <span className={styles.label}>Longitud</span>
                            <input
                                className={styles.input}
                                type="number"
                                value={form.longitud ?? ""}
                                onChange={(e) => updateField("longitud", e.target.value ? Number(e.target.value) : null)}
                            />
                        </label>
                    </div>
                </section>

                <section className={styles.card}>
                    <h2 className={styles.sectionTitle}>Caracteristicas</h2>
                    <div className={styles.checkGrid}>
                        <label className={styles.checkItem}>
                            <input
                                type="checkbox"
                                checked={form.techada}
                                onChange={(e) => updateField("techada", e.target.checked)}
                            />
                            Techada
                        </label>
                        <label className={styles.checkItem}>
                            <input
                                type="checkbox"
                                checked={form.iluminacion}
                                onChange={(e) => updateField("iluminacion", e.target.checked)}
                            />
                            Iluminacion
                        </label>
                        <label className={styles.checkItem}>
                            <input
                                type="checkbox"
                                checked={form.vestuarios}
                                onChange={(e) => updateField("vestuarios", e.target.checked)}
                            />
                            Vestuarios
                        </label>
                        <label className={styles.checkItem}>
                            <input
                                type="checkbox"
                                checked={form.estacionamiento}
                                onChange={(e) => updateField("estacionamiento", e.target.checked)}
                            />
                            Estacionamiento
                        </label>
                        <label className={styles.checkItem}>
                            <input
                                type="checkbox"
                                checked={form.cafeteria}
                                onChange={(e) => updateField("cafeteria", e.target.checked)}
                            />
                            Cafeteria
                        </label>
                    </div>
                </section>

                <section className={styles.cardWide}>
                    <div className={styles.sectionRow}>
                        <h2 className={styles.sectionTitle}>Imagenes ({imagenes.length}/10)</h2>
                        <label className={styles.uploadBtn}>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={(e) => handleUpload(e.target.files)}
                                disabled={!canUploadMore || uploading}
                            />
                            {uploading ? "Subiendo..." : "Subir imagenes"}
                        </label>
                    </div>
                    <div className={styles.imagesGrid}>
                        {imagenes.length === 0 ? (
                            <div className={styles.empty}>Aun no hay imagenes.</div>
                        ) : (
                            imagenes.map((img) => (
                                <div key={img.id} className={styles.imageCard}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={publicImgUrl(img.url)} alt="Imagen complejo" />
                                    <button type="button" onClick={() => handleDeleteImage(img.id)}>
                                        <i className="bi bi-trash" aria-hidden="true"></i>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
