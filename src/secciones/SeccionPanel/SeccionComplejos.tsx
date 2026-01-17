"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./SeccionComplejos.module.css";
import { apiFetch, apiUrl } from "@/lib/api";

type PerfilMe = {
    id: number;
    username?: string | null;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
};

type Complejo = {
    id: number;
    nombre: string;
    direccion: string;
    distrito: string;
    ciudad: string;

    latitud?: number | null;
    longitud?: number | null;

    owner_phone?: string | null;
    descripcion?: string | null;

    techada: boolean;
    iluminacion: boolean;
    vestuarios: boolean;
    estacionamiento: boolean;
    cafeteria: boolean;

    foto_url?: string | null;

    is_active: boolean;
};

const LS_COMPLEJO_ID = "panel_complejo_id";

function getStoredComplejoId(): string | null {
    try {
        if (typeof window === "undefined") return null;
        return window.localStorage.getItem(LS_COMPLEJO_ID);
    } catch {
        return null;
    }
}

function setStoredComplejoId(id: string) {
    try {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(LS_COMPLEJO_ID, id);
    } catch {
        // ignore
    }
}

function fileBaseFromApiUrl(): string | null {
    try {
        const u = new URL(apiUrl("/"));
        u.pathname = u.pathname.replace(/\/api\/?$/, "");
        u.search = "";
        u.hash = "";
        return u.toString().replace(/\/$/, "");
    } catch {
        return null;
    }
}

function publicImgUrl(url?: string | null) {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;

    const envOrigin = (process.env.NEXT_PUBLIC_API_ORIGIN || "").replace(/\/$/, "");
    if (envOrigin) return `${envOrigin}${url.startsWith("/") ? "" : "/"}${url}`;

    const base = fileBaseFromApiUrl();
    if (base) return `${base}${url.startsWith("/") ? "" : "/"}${url}`;

    try {
        return apiUrl(url);
    } catch {
        return url;
    }
}

const emptyForm = {
    nombre: "",
    direccion: "",
    distrito: "",
    ciudad: "Lima",
    ubicacion_lat: "",
    ubicacion_lng: "",
    telefono: "",
    descripcion: "",
    techada: false,
    iluminacion: true,
    vestuarios: false,
    estacionamiento: false,
    cafeteria: false,
    is_active: true,
    foto_url: null as string | null,
};

export default function SeccionComplejos({ token }: { token: string }) {
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);

    const [complejos, setComplejos] = useState<Complejo[]>([]);
    const [seleccionadoId, setSeleccionadoId] = useState<string>(() => getStoredComplejoId() || "");

    const [form, setForm] = useState({ ...emptyForm });
    const [fotoFile, setFotoFile] = useState<File | null>(null);

    const fotoPreview = useMemo(() => {
        if (!fotoFile) return null;
        return URL.createObjectURL(fotoFile);
    }, [fotoFile]);

    useEffect(() => {
        return () => {
            if (fotoPreview) URL.revokeObjectURL(fotoPreview);
        };
    }, [fotoPreview]);

    const seleccionado = useMemo(() => {
        if (!seleccionadoId || seleccionadoId === "new") return null;
        return complejos.find((c) => String(c.id) === String(seleccionadoId)) || null;
    }, [complejos, seleccionadoId]);

    const activasCount = useMemo(() => complejos.filter((c) => c.is_active).length, [complejos]);

    async function fetchAll() {
        const list = await apiFetch<Complejo[]>("/panel/complejos", { token });
        const arr = Array.isArray(list) ? list : [];
        setComplejos(arr);

        const stored = getStoredComplejoId();
        const isValidId = (id?: string | null) =>
            !!id && arr.some((c) => String(c.id) === String(id));

        let nextId = "";
        if (arr.length) {
            if (isValidId(seleccionadoId)) nextId = String(seleccionadoId);
            else if (isValidId(stored)) nextId = String(stored);
            else nextId = String(arr[0].id);
        }

        if (nextId && nextId !== String(seleccionadoId)) {
            setSeleccionadoId(nextId);
        }
        if (nextId) setStoredComplejoId(nextId);
    }

    useEffect(() => {
        (async () => {
            try {
                setError(null);
                setCargando(true);
                await fetchAll();
            } catch (e: any) {
                setError(e?.message || "No se pudo cargar complejos.");
            } finally {
                setCargando(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setOk(null);
        setError(null);
        setFotoFile(null);

        if (seleccionadoId === "new") {
            setForm({ ...emptyForm });
            return;
        }

        if (!seleccionado) return;

        setForm({
            nombre: seleccionado.nombre || "",
            direccion: seleccionado.direccion || "",
            distrito: seleccionado.distrito || "",
            ciudad: seleccionado.ciudad || "Lima",
            ubicacion_lat: seleccionado.latitud != null ? String(seleccionado.latitud) : "",
            ubicacion_lng: seleccionado.longitud != null ? String(seleccionado.longitud) : "",
            telefono: seleccionado.owner_phone || "",
            descripcion: seleccionado.descripcion || "",
            techada: !!seleccionado.techada,
            iluminacion: !!seleccionado.iluminacion,
            vestuarios: !!seleccionado.vestuarios,
            estacionamiento: !!seleccionado.estacionamiento,
            cafeteria: !!seleccionado.cafeteria,
            is_active: !!seleccionado.is_active,
            foto_url: seleccionado.foto_url || null,
        });
    }, [seleccionadoId, seleccionado]);

    async function guardar() {
        try {
            setGuardando(true);
            setOk(null);
            setError(null);

            const payload: any = {
                nombre: form.nombre.trim(),
                direccion: form.direccion.trim(),
                distrito: form.distrito.trim(),
                ciudad: form.ciudad.trim() || "Lima",
                latitud: form.ubicacion_lat ? Number(form.ubicacion_lat) : null,
                longitud: form.ubicacion_lng ? Number(form.ubicacion_lng) : null,
                telefono: form.telefono.trim() || null,
                descripcion: form.descripcion.trim() || null,
                techada: !!form.techada,
                iluminacion: !!form.iluminacion,
                vestuarios: !!form.vestuarios,
                estacionamiento: !!form.estacionamiento,
                cafeteria: !!form.cafeteria,
                is_active: !!form.is_active,
            };

            let actualizado: Complejo;

            if (seleccionadoId === "new") {
                actualizado = await apiFetch<Complejo>("/panel/complejos", {
                    token,
                    method: "POST",
                    body: JSON.stringify(payload),
                });
            } else {
                actualizado = await apiFetch<Complejo>(`/panel/complejos/${seleccionadoId}`, {
                    token,
                    method: "PUT",
                    body: JSON.stringify(payload),
                });
            }

            // subir foto si hay
            if (fotoFile) {
                const fd = new FormData();
                fd.append("archivo", fotoFile);

                await apiFetch(`/panel/complejos/${actualizado.id}/foto`, {
                    token,
                    method: "POST",
                    body: fd,
                });
            }

            setOk(seleccionadoId === "new" ? "Complejo creado ✅" : "Complejo actualizado ✅");

            // refrescar lista
            await fetchAll();

            setSeleccionadoId(String(actualizado.id));
            setStoredComplejoId(String(actualizado.id));
        } catch (e: any) {
            setError(e?.message || "No se pudo guardar el complejo.");
        } finally {
            setGuardando(false);
        }
    }

    const fotoActual = fotoPreview || publicImgUrl(form.foto_url);

    return (
        <section className={styles.seccion}>
            <div className={styles.header}>
                <div>
                    <p className={styles.kicker}>Panel propietario</p>
                    <h2 className={styles.titulo}>Mi complejo</h2>
                    <p className={styles.muted}>Edita datos, ubicación y características. (La foto se sube con Guardar)</p>
                </div>

                <div className={styles.headerBtns}>
                    <div className={styles.pill}>
                        <span className={styles.pulseDot} />
                        <span className={styles.pillText}>
                            {activasCount}/{complejos.length} activas
                        </span>
                    </div>

                    
                </div>
            </div>

            {error ? <div className={styles.alertError}>{error}</div> : null}
            {ok ? <div className={styles.alertOk}>{ok}</div> : null}

            <div className={`tarjeta ${styles.tarjeta}`}>
                <div className={styles.topRow}>
                    <div className={styles.campo}>
                        <label className={styles.label}>Complejo</label>
                        <select
                            className="input"
                            value={seleccionadoId || ""}
                            onChange={(e) => {
                                const v = e.target.value;
                                setSeleccionadoId(v);
                                if (v !== "new") setStoredComplejoId(v);
                            }}
                            disabled={cargando}
                        >
                            {complejos.map((c) => (
                                <option key={c.id} value={String(c.id)}>
                                    #{c.id} • {c.nombre}
                                </option>
                            ))}
                            <option value="new">+ Crear nuevo complejo</option>
                        </select>
                    </div>
                </div>

                {cargando ? (
                    <div className={styles.loadingBox}>Cargando…</div>
                ) : (
                    <div className={styles.complejoLayout}>
                        {/* Foto */}
                        <aside className={styles.fotoCard}>
                            <div className={styles.fotoHeader}>
                                <div>
                                    <p className={styles.fotoTitle}>Foto principal</p>
                                    <p className={styles.fotoHint}>Se usa en el listado y la ficha</p>
                                </div>
                                <span className={form.is_active ? styles.badgeOk : styles.badgeOff}>
                                    {form.is_active ? "Activa" : "Inactiva"}
                                </span>
                            </div>

                            <div className={styles.fotoPreview}>
                                {fotoActual ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img className={styles.fotoImg} src={fotoActual} alt="Foto complejo" />
                                ) : (
                                    <div className={styles.fotoPlaceholder}>
                                        <p className={styles.fotoPlaceholderTitle}>Sin foto</p>
                                        <p className={styles.fotoPlaceholderText}>Sube una imagen para mejorar el perfil del complejo.</p>
                                    </div>
                                )}
                            </div>

                            <label className={styles.fileLabel}>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className={styles.file}
                                    onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
                                />
                                Elegir foto
                            </label>

                            <p className={styles.mutedTiny}>PNG/JPG/WEBP • ideal 1200x800</p>
                        </aside>

                        {/* Form */}
                        <div className={styles.stack}>
                            <div className={styles.formGrid}>
                                <div className={styles.campo}>
                                    <label className={styles.label}>Nombre</label>
                                    <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                                </div>


                                <div className={styles.campo}>
                                    <label className={styles.label}>Dirección</label>
                                    <input className="input" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
                                </div>

                                <div className={styles.campo}>
                                    <label className={styles.label}>Distrito</label>
                                    <input className="input" value={form.distrito} onChange={(e) => setForm({ ...form, distrito: e.target.value })} />
                                </div>

                                <div className={styles.campo}>
                                    <label className={styles.label}>Ciudad</label>
                                    <input className="input" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
                                </div>
                            </div>

                            <div className={styles.formGrid2}>
                                <div className={styles.campo}>
                                    <label className={styles.label}>Latitud</label>
                                    <input className="input" value={form.ubicacion_lat} onChange={(e) => setForm({ ...form, ubicacion_lat: e.target.value })} placeholder="-12.0" />
                                </div>
                                <div className={styles.campo}>
                                    <label className={styles.label}>Longitud</label>
                                    <input className="input" value={form.ubicacion_lng} onChange={(e) => setForm({ ...form, ubicacion_lng: e.target.value })} placeholder="-77.0" />
                                </div>
                            </div>

                            <div className={styles.campo}>
                                <label className={styles.label}>Descripción</label>
                                <textarea className={styles.textarea} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={4} />
                            </div>

                            <div className={styles.checks}>
                                <label className={styles.check}>
                                    <input type="checkbox" checked={form.techada} onChange={(e) => setForm({ ...form, techada: e.target.checked })} />
                                    Techada
                                </label>
                                <label className={styles.check}>
                                    <input type="checkbox" checked={form.iluminacion} onChange={(e) => setForm({ ...form, iluminacion: e.target.checked })} />
                                    Iluminación
                                </label>
                                <label className={styles.check}>
                                    <input type="checkbox" checked={form.vestuarios} onChange={(e) => setForm({ ...form, vestuarios: e.target.checked })} />
                                    Vestuarios
                                </label>
                                <label className={styles.check}>
                                    <input type="checkbox" checked={form.estacionamiento} onChange={(e) => setForm({ ...form, estacionamiento: e.target.checked })} />
                                    Estacionamiento
                                </label>
                                <label className={styles.check}>
                                    <input type="checkbox" checked={form.cafeteria} onChange={(e) => setForm({ ...form, cafeteria: e.target.checked })} />
                                    Cafetería
                                </label>
                            </div>

                            <div className={styles.filaBtns}>
                                <button className="boton botonPrimario" onClick={() => void guardar()} disabled={guardando}>
                                    {guardando ? "Guardando..." : (seleccionadoId === "new" ? "Crear complejo" : "Guardar complejo")}
                                </button>
                            </div>

                            <p className={styles.tip}>
                                Tip: verifica los datos de tu complejo.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
