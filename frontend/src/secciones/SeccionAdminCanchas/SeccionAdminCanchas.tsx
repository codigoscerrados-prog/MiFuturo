"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./SeccionAdminCanchas.module.css";
import { apiFetch, apiUrl } from "@/lib/api";
import { getRoleFromToken, getToken } from "@/lib/auth";

type Complejo = {
    id: number;
    nombre: string;
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

    is_active: boolean;
    owner_id?: number | null;
};

type Cancha = {
    id: number;
    nombre: string;
    tipo: string;
    pasto: string;
    precio_hora: number;
    is_active: boolean;
    owner_id?: number | null;
    complejo_id?: number | null; // ✅ clave
};

type ComplejoCrear = {
    nombre: string;
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

    is_active: boolean;
    owner_id?: number | null;
};

type CanchaCrear = {
    nombre: string;
    tipo: string;
    pasto: string;
    precio_hora: number;
    is_active: boolean;
    owner_id?: number | null;
    complejo_id: number | null; // ✅ se elige en UI
};

const DEPARTAMENTOS = ["Lima", "Callao"] as const;

const PROVINCIAS_POR_DEP: Record<string, string[]> = {
    Lima: ["Lima"],
    Callao: ["Callao"],
};

const DISTRITOS_POR_PROV: Record<string, string[]> = {
    Lima: ["Los Olivos", "Comas", "Independencia", "San Martín de Porres", "Puente Piedra", "Carabayllo", "Cercado de Lima"],
    Callao: ["Callao", "Bellavista", "La Perla", "Ventanilla", "Mi Perú"],
};

function numOrNull(v: string) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

export default function SeccionAdminCanchas() {
    const [token, setToken] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);

    const [complejos, setComplejos] = useState<Complejo[]>([]);
    const [canchas, setCanchas] = useState<Cancha[]>([]);

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string>("");

    const [modalCancha, setModalCancha] = useState(false);
    const [modalComplejo, setModalComplejo] = useState(false);

    const [guardandoCancha, setGuardandoCancha] = useState(false);
    const [guardandoComplejo, setGuardandoComplejo] = useState(false);

    // ✅ nuevo: cuál complejo está expandido
    const [complejoSeleccionadoId, setComplejoSeleccionadoId] = useState<number | null>(null);

    // ✅ nuevo: imágenes seleccionadas para subir al crear cancha
    const [archivosImagen, setArchivosImagen] = useState<File[]>([]);
    const [subiendoImagenes, setSubiendoImagenes] = useState(false);

    const [formComplejo, setFormComplejo] = useState({
        nombre: "",
        descripcion: "",
        direccion: "",
        departamento: "Lima",
        provincia: "Lima",
        distrito: "Los Olivos",
        latitud: "",
        longitud: "",
        techada: false,
        iluminacion: true,
        vestuarios: false,
        estacionamiento: false,
        cafeteria: false,
        is_active: true,
        owner_id: "" as any,
    });

    const [formCancha, setFormCancha] = useState<CanchaCrear>({
        nombre: "",
        tipo: "Fútbol 7",
        pasto: "Sintético",
        precio_hora: 80,
        is_active: true,
        owner_id: null,
        complejo_id: null,
    });

    useEffect(() => {
        const t = getToken();
        setToken(t);
        setRole(getRoleFromToken(t));
    }, []);

    async function cargarComplejos() {
        if (!token) return;
        try {
            const data = await apiFetch<Complejo[]>("/admin/complejos", { token });
            setComplejos(data);
        } catch (e: any) {
            setError(e?.message || "No se pudo cargar complejos");
        }
    }

    async function cargarCanchas() {
        if (!token) return;
        setCargando(true);
        setError("");
        try {
            const data = await apiFetch<Cancha[]>("/admin/canchas", { token });
            setCanchas(data);
        } catch (e: any) {
            setError(e?.message || "No se pudo cargar canchas");
        } finally {
            setCargando(false);
        }
    }

    async function recargarTodo() {
        await Promise.all([cargarComplejos(), cargarCanchas()]);
    }

    useEffect(() => {
        if (!token) return;
        recargarTodo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const complejoPorId = useMemo(() => {
        const m = new Map<number, Complejo>();
        for (const c of complejos) m.set(c.id, c);
        return m;
    }, [complejos]);

    const kpis = useMemo(() => {
        const totalCanchas = canchas.length;
        const totalComplejos = complejos.length;
        const activas = canchas.filter((c) => c.is_active).length;
        const sinComplejo = canchas.filter((c) => c.complejo_id === null || c.complejo_id === undefined).length;
        return { totalCanchas, totalComplejos, activas, sinComplejo };
    }, [canchas, complejos]);

    const complejoSeleccionado = useMemo(() => {
        if (!complejoSeleccionadoId) return null;
        return complejos.find((c) => c.id === complejoSeleccionadoId) || null;
    }, [complejoSeleccionadoId, complejos]);

    const canchasDelComplejo = useMemo(() => {
        if (!complejoSeleccionadoId) return [];
        return canchas
            .filter((c) => c.complejo_id === complejoSeleccionadoId)
            .sort((a, b) => b.id - a.id);
    }, [canchas, complejoSeleccionadoId]);

    function toggleVerCanchas(complejoId: number) {
        setComplejoSeleccionadoId((prev) => (prev === complejoId ? null : complejoId));
    }

    function cerrarModalCancha() {
        setModalCancha(false);
        setArchivosImagen([]);
    }

    async function subirImagenesParaCancha(canchaId: number) {
        if (!token) return;
        if (archivosImagen.length === 0) return;

        setSubiendoImagenes(true);
        try {
            for (const file of archivosImagen) {
                const fd = new FormData();
                fd.append("archivo", file);

                const uploadUrl = apiUrl(`/admin/canchas/${canchaId}/imagenes/upload`);
                const res = await fetch(uploadUrl, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: fd,
                });

                if (!res.ok) {
                    const txt = await res.text().catch(() => "");
                    throw new Error(txt || "No se pudo subir una imagen");
                }
            }
        } finally {
            setSubiendoImagenes(false);
        }
    }

    async function crearComplejo() {
        if (!token) return;
        setGuardandoComplejo(true);
        setError("");

        try {
            const payload: ComplejoCrear = {
                nombre: formComplejo.nombre.trim(),
                descripcion: formComplejo.descripcion.trim() || null,
                direccion: formComplejo.direccion.trim() || null,
                departamento: formComplejo.departamento,
                provincia: formComplejo.provincia,
                distrito: formComplejo.distrito,
                latitud: formComplejo.latitud.trim() ? numOrNull(formComplejo.latitud) : null,
                longitud: formComplejo.longitud.trim() ? numOrNull(formComplejo.longitud) : null,

                techada: !!formComplejo.techada,
                iluminacion: !!formComplejo.iluminacion,
                vestuarios: !!formComplejo.vestuarios,
                estacionamiento: !!formComplejo.estacionamiento,
                cafeteria: !!formComplejo.cafeteria,

                is_active: !!formComplejo.is_active,
                owner_id: formComplejo.owner_id ? Number(formComplejo.owner_id) : null,
            };

            await apiFetch("/admin/complejos", {
                method: "POST",
                body: JSON.stringify(payload),
                token,
            });

            setModalComplejo(false);
            setFormComplejo({
                nombre: "",
                descripcion: "",
                direccion: "",
                departamento: "Lima",
                provincia: "Lima",
                distrito: "Los Olivos",
                latitud: "",
                longitud: "",
                techada: false,
                iluminacion: true,
                vestuarios: false,
                estacionamiento: false,
                cafeteria: false,
                is_active: true,
                owner_id: "" as any,
            });

            await cargarComplejos();
        } catch (e: any) {
            setError(e?.message || "No se pudo crear el complejo");
        } finally {
            setGuardandoComplejo(false);
        }
    }

    async function crearCancha() {
        if (!token) return;
        setGuardandoCancha(true);
        setError("");

        try {
            if (!formCancha.complejo_id) throw new Error("Selecciona un complejo.");

            // ✅ 1) crea la cancha
            const canchaCreada = await apiFetch<Cancha>("/admin/canchas", {
                method: "POST",
                body: JSON.stringify({
                    ...formCancha,
                    nombre: formCancha.nombre.trim(),
                    precio_hora: Number(formCancha.precio_hora || 0),
                    owner_id: formCancha.owner_id ? Number(formCancha.owner_id) : null,
                    complejo_id: Number(formCancha.complejo_id),
                    is_active: !!formCancha.is_active,
                }),
                token,
            });

            // ✅ 2) sube imágenes (si seleccionaste)
            await subirImagenesParaCancha(canchaCreada.id);

            cerrarModalCancha();
            setFormCancha({
                nombre: "",
                tipo: "Fútbol 7",
                pasto: "Sintético",
                precio_hora: 80,
                is_active: true,
                owner_id: null,
                complejo_id: null,
            });

            await cargarCanchas();
        } catch (e: any) {
            setError(e?.message || "No se pudo crear la cancha");
        } finally {
            setGuardandoCancha(false);
        }
    }

    async function toggleEstadoCancha(cancha: Cancha) {
        if (!token) return;
        setError("");
        try {
            await apiFetch(`/admin/canchas/${cancha.id}/${cancha.is_active ? "desactivar" : "activar"}`, { method: "POST", token });
            await cargarCanchas();
        } catch (e: any) {
            setError(e?.message || "No se pudo cambiar el estado");
        }
    }

    async function asignarDuenoComplejo(complejoId: number) {
        if (!token) return;
        const ownerIdStr = prompt("Ingresa el ID del propietario (users.id):");
        if (!ownerIdStr) return;
        const ownerId = Number(ownerIdStr);
        if (!Number.isFinite(ownerId)) return;

        try {
            await apiFetch(`/admin/complejos/${complejoId}/asignar-dueno/${ownerId}`, { method: "POST", token });
            await cargarComplejos();
        } catch (e: any) {
            setError(e?.message || "No se pudo asignar dueño al complejo");
        }
    }

    async function toggleEstadoComplejo(c: Complejo) {
        if (!token) return;
        try {
            await apiFetch(`/admin/complejos/${c.id}`, {
                method: "PATCH",
                token,
                body: JSON.stringify({ is_active: !c.is_active }),
            });
            const ids = canchas.filter((x) => x.complejo_id === c.id).map((x) => x.id);
            if (ids.length) {
                const accion = c.is_active ? "desactivar" : "activar";
                await Promise.all(
                    ids.map((id) => apiFetch(`/admin/canchas/${id}/${accion}`, { method: "POST", token }))
                );
                await cargarCanchas();
            }
            await cargarComplejos();
        } catch (e: any) {
            setError(e?.message || "No se pudo cambiar el estado del complejo");
        }
    }

    // Guards
    if (!token) {
        return (
            <section className={styles.seccion}>
                <div className="contenedor">
                    <div className={`tarjeta ${styles.bloque}`}>
                        <h1 className={styles.titulo}>Admin • Gestión</h1>
                        <p className={styles.subtitulo}>No hay token. Inicia sesión primero.</p>
                    </div>
                </div>
            </section>
        );
    }

    if (role !== "admin") {
        return (
            <section className={styles.seccion}>
                <div className="contenedor">
                    <div className={`tarjeta ${styles.bloque}`}>
                        <h1 className={styles.titulo}>Acceso restringido</h1>
                        <p className={styles.subtitulo}>
                            Tu sesión no es <strong>admin</strong>. (Role: <strong>{role || "—"}</strong>)
                        </p>
                    </div>
                </div>
            </section>
        );
    }

    const provincias = PROVINCIAS_POR_DEP[formComplejo.departamento] || ["Lima"];
    const distritos = DISTRITOS_POR_PROV[formComplejo.provincia] || DISTRITOS_POR_PROV["Lima"];

    return (
        <section className={styles.seccion}>
            <div className={`contenedor ${styles.contenido}`}>
                <header className={styles.cabecera}>
                    <div>
                        <p className={styles.badge}>Panel Admin • Complejos + Canchas</p>
                        <h1 className={styles.titulo}>Gestión</h1>
                        <p className={styles.subtitulo}>Crea complejos y luego canchas dentro del complejo.</p>
                    </div>

                    <div className={styles.accionesTop}>
                        <button className={`boton ${styles.botonSec}`} type="button" onClick={recargarTodo} disabled={cargando}>
                            Recargar
                        </button>
                        <button className={`boton ${styles.botonSec}`} type="button" onClick={() => setModalComplejo(true)}>
                            + Nuevo complejo
                        </button>
                        <button className={`boton botonPrimario ${styles.botonPri}`} type="button" onClick={() => setModalCancha(true)}>
                            + Nueva cancha
                        </button>
                    </div>
                </header>

                <section className={styles.kpis}>
                    <div className={`tarjeta ${styles.kpi}`}>
                        <span className={styles.kpiLabel}>Complejos</span>
                        <span className={styles.kpiValor}>{kpis.totalComplejos}</span>
                    </div>

                    <div className={`tarjeta ${styles.kpi}`}>
                        <span className={styles.kpiLabel}>Canchas</span>
                        <span className={styles.kpiValor}>{kpis.totalCanchas}</span>
                    </div>

                    <div className={`tarjeta ${styles.kpi}`}>
                        <span className={styles.kpiLabel}>Activas</span>
                        <span className={styles.kpiValor}>{kpis.activas}</span>
                    </div>

                    <div className={`tarjeta ${styles.kpi}`}>
                        <span className={styles.kpiLabel}>Canchas sin complejo</span>
                        <span className={styles.kpiValor}>{kpis.sinComplejo}</span>
                    </div>
                </section>

                {error && <div className={styles.error}>{error}</div>}

                {/* ✅ TABLA COMPLEJOS */}
                <section className={`tarjeta ${styles.panel}`} style={{ marginBottom: 12 }}>
                    <div className={styles.panelTitulo}>
                        <h2 className={styles.h2}>Complejos</h2>
                        <p className={styles.p}>Haz click en “Ver canchas” para expandir.</p>
                    </div>

                    {complejos.length === 0 ? (
                        <div className={styles.placeholder}>Aún no tienes complejos. Crea uno con “+ Nuevo complejo”.</div>
                    ) : (
                        <div className={styles.tablaWrap}>
                            <table className={styles.tabla}>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Nombre</th>
                                        <th>Distrito</th>
                                        <th>Provincia</th>
                                        <th>Departamento</th>
                                        <th>Dueño</th>
                                        <th>Estado</th>
                                        <th style={{ width: 340 }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {complejos
                                        .slice()
                                        .sort((a, b) => b.id - a.id)
                                        .map((c) => (
                                            <tr key={c.id}>
                                                <td className={styles.mono}>{c.id}</td>
                                                <td className={styles.nombre}>{c.nombre}</td>
                                                <td>{c.distrito || "—"}</td>
                                                <td>{c.provincia || "—"}</td>
                                                <td>{c.departamento || "—"}</td>
                                                <td className={styles.mono}>{c.owner_id ?? "—"}</td>
                                                <td>
                                                    <span className={`${styles.estado} ${c.is_active ? styles.on : styles.off}`}>
                                                        {c.is_active ? "Activo" : "Inactivo"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className={styles.accionesFila}>
                                                        <button className={`boton ${styles.btnMini}`} type="button" onClick={() => asignarDuenoComplejo(c.id)}>
                                                            Asignar dueño
                                                        </button>

                                                        <button
                                                            className={`boton ${c.is_active ? styles.btnOff : "botonNeon"} ${styles.btnMini}`}
                                                            type="button"
                                                            onClick={() => toggleEstadoComplejo(c)}
                                                        >
                                                            {c.is_active ? "Desactivar" : "Activar"}
                                                        </button>

                                                        <button className={`boton ${styles.btnMini}`} type="button" onClick={() => toggleVerCanchas(c.id)}>
                                                            {complejoSeleccionadoId === c.id ? "Ocultar canchas" : "Ver canchas"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* ✅ CANCHAS: solo se muestran al dar click */}
                {complejoSeleccionado && (
                    <section className={`tarjeta ${styles.panel}`} style={{ marginTop: 12 }}>
                        <div className={styles.panelTitulo}>
                            <h2 className={styles.h2}>Canchas de: {complejoSeleccionado.nombre}</h2>
                            <p className={styles.p}>
                                {complejoSeleccionado.distrito || "—"} • Dueño: {complejoSeleccionado.owner_id ?? "—"}
                            </p>
                        </div>

                        {cargando ? (
                            <div className={styles.placeholder}>Cargando canchas…</div>
                        ) : canchasDelComplejo.length === 0 ? (
                            <div className={styles.placeholder}>
                                Este complejo aún no tiene canchas. Crea una cancha y elige este complejo en el dropdown.
                            </div>
                        ) : (
                            <div className={styles.tablaWrap}>
                                <table className={styles.tabla}>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Cancha</th>
                                            <th>Tipo</th>
                                            <th>Pasto</th>
                                            <th>Precio</th>
                                            <th>Estado</th>
                                            <th style={{ width: 220 }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {canchasDelComplejo.map((c) => (
                                            <tr key={c.id}>
                                                <td className={styles.mono}>{c.id}</td>
                                                <td className={styles.nombre}>{c.nombre}</td>
                                                <td>{c.tipo}</td>
                                                <td>{c.pasto}</td>
                                                <td className={styles.mono}>S/ {Number(c.precio_hora).toFixed(0)}</td>
                                                <td>
                                                    <span className={`${styles.estado} ${c.is_active ? styles.on : styles.off}`}>
                                                        {c.is_active ? "Activa" : "Inactiva"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className={styles.accionesFila}>
                                                        <button
                                                            className={`boton ${c.is_active ? styles.btnOff : "botonNeon"} ${styles.btnMini}`}
                                                            type="button"
                                                            onClick={() => toggleEstadoCancha(c)}
                                                        >
                                                            {c.is_active ? "Desactivar" : "Activar"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}
            </div>

            {/* MODAL NUEVO COMPLEJO */}
            {modalComplejo && (
                <div className={styles.modalFondo} role="dialog" aria-modal="true">
                    <div className={`tarjeta ${styles.modal}`}>
                        <div className={styles.modalTop}>
                            <div>
                                <h2 className={styles.modalTitulo}>Nuevo complejo</h2>
                                <p className={styles.modalSub}>Ubicación + amenities (una vez).</p>
                            </div>
                            <button className={`boton ${styles.btnCerrar}`} onClick={() => setModalComplejo(false)} type="button">
                                ✕
                            </button>
                        </div>

                        <div className={styles.formGrid}>
                            <Campo label="Nombre del complejo *">
                                <input className={styles.input} value={formComplejo.nombre} onChange={(e) => setFormComplejo({ ...formComplejo, nombre: e.target.value })} />
                            </Campo>

                            <Campo label="Dirección">
                                <input className={styles.input} value={formComplejo.direccion} onChange={(e) => setFormComplejo({ ...formComplejo, direccion: e.target.value })} />
                            </Campo>

                            <Campo label="Descripción">
                                <input className={styles.input} value={formComplejo.descripcion} onChange={(e) => setFormComplejo({ ...formComplejo, descripcion: e.target.value })} />
                            </Campo>

                            <Campo label="Owner ID (opcional)">
                                <input className={styles.input} type="number" value={formComplejo.owner_id ?? ""} onChange={(e) => setFormComplejo({ ...formComplejo, owner_id: e.target.value })} />
                            </Campo>

                            <Campo label="Departamento">
                                <select
                                    className={styles.select}
                                    value={formComplejo.departamento}
                                    onChange={(e) => {
                                        const dep = e.target.value;
                                        const prov = (PROVINCIAS_POR_DEP[dep] || ["Lima"])[0];
                                        const dist = (DISTRITOS_POR_PROV[prov] || DISTRITOS_POR_PROV["Lima"])[0];
                                        setFormComplejo({ ...formComplejo, departamento: dep, provincia: prov, distrito: dist });
                                    }}
                                >
                                    {DEPARTAMENTOS.map((d) => (
                                        <option key={d}>{d}</option>
                                    ))}
                                </select>
                            </Campo>

                            <Campo label="Provincia">
                                <select
                                    className={styles.select}
                                    value={formComplejo.provincia}
                                    onChange={(e) => {
                                        const prov = e.target.value;
                                        const dist = (DISTRITOS_POR_PROV[prov] || DISTRITOS_POR_PROV["Lima"])[0];
                                        setFormComplejo({ ...formComplejo, provincia: prov, distrito: dist });
                                    }}
                                >
                                    {provincias.map((p) => (
                                        <option key={p}>{p}</option>
                                    ))}
                                </select>
                            </Campo>

                            <Campo label="Distrito">
                                <select className={styles.select} value={formComplejo.distrito} onChange={(e) => setFormComplejo({ ...formComplejo, distrito: e.target.value })}>
                                    {distritos.map((d) => (
                                        <option key={d}>{d}</option>
                                    ))}
                                </select>
                            </Campo>

                            <Campo label="Latitud (opcional)">
                                <input className={styles.input} value={formComplejo.latitud} onChange={(e) => setFormComplejo({ ...formComplejo, latitud: e.target.value })} placeholder="-12.00" />
                            </Campo>

                            <Campo label="Longitud (opcional)">
                                <input className={styles.input} value={formComplejo.longitud} onChange={(e) => setFormComplejo({ ...formComplejo, longitud: e.target.value })} placeholder="-77.08" />
                            </Campo>

                            <div className={styles.switches}>
                                {[
                                    ["is_active", "Activo"],
                                    ["techada", "Techada"],
                                    ["iluminacion", "Iluminación"],
                                    ["vestuarios", "Vestuarios"],
                                    ["estacionamiento", "Estacionamiento"],
                                    ["cafeteria", "Cafetería"],
                                ].map(([k, label]) => (
                                    <label key={k} className={styles.switch}>
                                        <input
                                            type="checkbox"
                                            checked={!!(formComplejo as any)[k]}
                                            onChange={(e) => setFormComplejo({ ...formComplejo, [k]: e.target.checked } as any)}
                                        />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className={styles.modalAcciones}>
                            <button className={`boton ${styles.botonSec}`} type="button" onClick={() => setModalComplejo(false)}>
                                Cancelar
                            </button>
                            <button className={`boton botonPrimario ${styles.botonPri}`} type="button" disabled={guardandoComplejo || !formComplejo.nombre.trim()} onClick={crearComplejo}>
                                {guardandoComplejo ? "Guardando…" : "Crear complejo"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL NUEVA CANCHA */}
            {modalCancha && (
                <div className={styles.modalFondo} role="dialog" aria-modal="true">
                    <div className={`tarjeta ${styles.modal}`}>
                        <div className={styles.modalTop}>
                            <div>
                                <h2 className={styles.modalTitulo}>Nueva cancha</h2>
                                <p className={styles.modalSub}>Selecciona el complejo, agrega imágenes opcionalmente y guarda.</p>
                            </div>
                            <button className={`boton ${styles.btnCerrar}`} onClick={cerrarModalCancha} type="button">
                                ✕
                            </button>
                        </div>

                        <div className={styles.formGrid}>
                            <Campo label="Complejo *">
                                <select
                                    className={styles.select}
                                    value={formCancha.complejo_id ?? ""}
                                    onChange={(e) => setFormCancha({ ...formCancha, complejo_id: e.target.value ? Number(e.target.value) : null })}
                                >
                                    <option value="">Selecciona un complejo…</option>
                                    {complejos.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            #{c.id} • {c.nombre} ({c.distrito || "—"})
                                        </option>
                                    ))}
                                </select>
                            </Campo>

                            <Campo label="Nombre *">
                                <input className={styles.input} value={formCancha.nombre} onChange={(e) => setFormCancha({ ...formCancha, nombre: e.target.value })} />
                            </Campo>

                            <Campo label="Tipo">
                                <select className={styles.select} value={formCancha.tipo} onChange={(e) => setFormCancha({ ...formCancha, tipo: e.target.value })}>
                                    <option>Fútbol 5</option>
                                    <option>Fútbol 7</option>
                                    <option>Fútbol 11</option>
                                </select>
                            </Campo>

                            <Campo label="Pasto">
                                <select className={styles.select} value={formCancha.pasto} onChange={(e) => setFormCancha({ ...formCancha, pasto: e.target.value })}>
                                    <option>Sintético</option>
                                    <option>Híbrido</option>
                                </select>
                            </Campo>

                            <Campo label="Precio por hora (S/)">
                                <input className={styles.input} type="number" value={formCancha.precio_hora} onChange={(e) => setFormCancha({ ...formCancha, precio_hora: Number(e.target.value) })} />
                            </Campo>

                            <Campo label="Owner ID (opcional)">
                                <input className={styles.input} type="number" value={formCancha.owner_id ?? ""} onChange={(e) => setFormCancha({ ...formCancha, owner_id: e.target.value ? Number(e.target.value) : null })} />
                            </Campo>

                            {/* ✅ IMÁGENES */}
                            <Campo label="Imágenes (opcional)">
                                <input
                                    className={styles.input}
                                    type="file"
                                    multiple
                                    accept="image/png,image/jpeg,image/webp,image/avif"
                                    onChange={(e) => setArchivosImagen(Array.from(e.target.files || []))}
                                />
                                {archivosImagen.length > 0 && (
                                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                                        <strong>{archivosImagen.length}</strong> imagen(es) lista(s):{" "}
                                        {archivosImagen.slice(0, 3).map((f) => f.name).join(", ")}
                                        {archivosImagen.length > 3 ? "…" : ""}
                                        <div style={{ marginTop: 6 }}>
                                            <button type="button" className={`boton ${styles.btnMini}`} onClick={() => setArchivosImagen([])}>
                                                Quitar imágenes
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </Campo>

                            <div className={styles.switches}>
                                <label className={styles.switch}>
                                    <input type="checkbox" checked={!!formCancha.is_active} onChange={(e) => setFormCancha({ ...formCancha, is_active: e.target.checked })} />
                                    <span>Activa</span>
                                </label>
                            </div>
                        </div>

                        <div className={styles.modalAcciones}>
                            <button className={`boton ${styles.botonSec}`} type="button" onClick={cerrarModalCancha}>
                                Cancelar
                            </button>
                            <button
                                className={`boton botonPrimario ${styles.botonPri}`}
                                type="button"
                                disabled={
                                    guardandoCancha ||
                                    subiendoImagenes ||
                                    !formCancha.nombre.trim() ||
                                    !formCancha.complejo_id
                                }
                                onClick={crearCancha}
                            >
                                {guardandoCancha || subiendoImagenes ? "Guardando…" : "Crear cancha"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className={styles.campo}>
            <span className={styles.label}>{label}</span>
            {children}
        </label>
    );
}
