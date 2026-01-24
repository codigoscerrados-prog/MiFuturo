"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./SeccionCanchas.module.css";
import { apiFetch } from "@/lib/api";

/** ----------------- Types ----------------- */
type Complejo = {
    id: number;
    nombre: string;
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
    complejo_id?: number | null;
};

/** ----------------- LocalStorage helpers ----------------- */
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

function cn(...arr: Array<string | false | null | undefined>) {
    return arr.filter(Boolean).join(" ");
}

export default function PanelCanchasPropietario({ token }: { token: string }) {
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);

    const [complejos, setComplejos] = useState<Complejo[]>([]);
    const [canchas, setCanchas] = useState<Cancha[]>([]);

    const [guardando, setGuardando] = useState(false);

    const [form, setForm] = useState({
        nombre: "",
        tipo: "Fútbol 7",
        pasto: "Sintético",
        precio_hora: 80,
        is_active: true,
        complejo_id: "" as any,
    });

    const [editId, setEditId] = useState<number | null>(null);
    const [editSaving, setEditSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        nombre: "",
        tipo: "Fútbol 7",
        pasto: "Sintético",
        precio_hora: 80,
        is_active: true,
    });

    const complejoActualNombre = useMemo(() => {
        return complejos.find((c) => String(c.id) === String(form.complejo_id))?.nombre || "—";
    }, [complejos, form.complejo_id]);

    const totalCanchas = canchas.length;
    const activas = useMemo(() => canchas.filter((c) => c.is_active).length, [canchas]);

    async function fetchCanchasByComplejo(complejoId: string | number | null) {
        const id = complejoId ? String(complejoId) : "";
        if (!id) return [];

        try {
            const ks = await apiFetch<Cancha[]>(
                `/panel/canchas?complejo_id=${encodeURIComponent(id)}`,
                { token }
            );
            return Array.isArray(ks) ? ks : [];
        } catch {
            const ksAll = await apiFetch<Cancha[]>("/panel/canchas", { token });
            const all = Array.isArray(ksAll) ? ksAll : [];
            const num = Number(id);
            return all.filter((c) =>
                Number.isFinite(num) ? c.complejo_id === num : String(c.complejo_id) === id
            );
        }
    }

    async function cargar(complejoIdForzado?: string | number) {
        setCargando(true);
        setError(null);
        setOk(null);

        try {
            const cs = await apiFetch<Complejo[]>("/panel/complejos", { token });
            const complejosArr = Array.isArray(cs) ? cs : [];
            setComplejos(complejosArr);

            if (complejosArr.length === 0) {
                setForm((p) => ({ ...p, complejo_id: "" }));
                setCanchas([]);
                setEditId(null);
                return;
            }

            const stored = getStoredComplejoId();
            const storedNum = stored ? Number(stored) : NaN;
            const storedFound = Number.isFinite(storedNum)
                ? complejosArr.find((x) => x.id === storedNum)
                : null;

            const formId = form.complejo_id ? String(form.complejo_id) : "";
            const formFound = formId
                ? complejosArr.find((x) => String(x.id) === formId)
                : null;

            const idFinal =
                complejoIdForzado ??
                (formFound ? formFound.id : (storedFound ? storedFound.id : complejosArr[0].id));

            setForm((p) => ({ ...p, complejo_id: idFinal }));
            setStoredComplejoId(String(idFinal));

            const lista = await fetchCanchasByComplejo(idFinal);
            setCanchas(lista);
            setEditId(null);
        } catch (e: any) {
            setError(e?.message || "No se pudo cargar canchas.");
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    async function crearCancha() {
        setError(null);
        setOk(null);

        if (!form.complejo_id) return setError("Primero crea/selecciona un complejo.");
        if (!form.nombre.trim()) return setError("El nombre de la cancha es obligatorio.");

        setGuardando(true);
        try {
            await apiFetch<Cancha>("/panel/canchas", {
                token,
                method: "POST",
                body: JSON.stringify({
                    nombre: form.nombre.trim(),
                    tipo: form.tipo,
                    pasto: form.pasto,
                    precio_hora: Number(form.precio_hora || 0),
                    is_active: !!form.is_active,
                    complejo_id: Number(form.complejo_id),
                }),
            });

            setOk("Cancha creada ✅");
            setForm((p) => ({ ...p, nombre: "" }));
            await cargar(form.complejo_id);
        } catch (e: any) {
            setError(e?.message || "No se pudo crear la cancha.");
        } finally {
            setGuardando(false);
        }
    }

    function empezarEdicion(c: Cancha) {
        setEditId(c.id);
        setEditForm({
            nombre: c.nombre ?? "",
            tipo: c.tipo ?? "Fútbol 7",
            pasto: c.pasto ?? "Sintético",
            precio_hora: Number(c.precio_hora || 0),
            is_active: !!c.is_active,
        });
        setError(null);
        setOk(null);
    }

    function cancelarEdicion() {
        setEditId(null);
        setOk("Edición cancelada ✅");
    }

    async function guardarEdicion(canchaId: number) {
        setError(null);
        setOk(null);

        if (!editForm.nombre.trim()) return setError("El nombre es obligatorio.");
        const precio = Number(editForm.precio_hora);
        if (!Number.isFinite(precio) || precio <= 0) return setError("Precio inválido.");

        setEditSaving(true);
        try {
            const actualizado = await apiFetch<Cancha>(`/panel/canchas/${canchaId}`, {
                token,
                method: "PUT",
                body: JSON.stringify({
                    nombre: editForm.nombre.trim(),
                    tipo: editForm.tipo,
                    pasto: editForm.pasto,
                    precio_hora: precio,
                    is_active: !!editForm.is_active,
                }),
            });

            setCanchas((prev) =>
                prev.map((x) => (x.id === canchaId ? { ...x, ...actualizado } : x))
            );
            setOk("Cancha actualizada ✅");
            setEditId(null);
        } catch (e: any) {
            setError(e?.message || "No se pudo actualizar la cancha.");
        } finally {
            setEditSaving(false);
        }
    }

    return (
        <div className={styles.shell}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <p className={styles.kicker}>Panel propietario</p>
                    <h1 className={styles.titulo}>Mis canchas</h1>
                    <p className={styles.muted}>
                        Crea y edita canchas por complejo • controla precio, tipo y estado
                    </p>
                </div>

                <div className={styles.headerBtns}>
                    <div className={styles.statPill} title="Resumen">
                        <span className={styles.pillDot} />
                        <span className={styles.pillText}>
                            {cargando ? "Cargando..." : `${activas}/${totalCanchas} activas`}
                        </span>
                    </div>

                    
                </div>
            </div>

            {error ? <div className={styles.alertError}>{error}</div> : null}
            {ok ? <div className={styles.alertOk}>{ok}</div> : null}

            {/* Main */}
            <div className={styles.mainGrid}>
                {/* Card: Crear */}
                <section className={cn(styles.card, styles.cardForm)}>
                    <div className={styles.cardTop}>
                        <div>
                            <h2 className={styles.cardTitle}>Agregar cancha</h2>
                            <p className={styles.cardSubtitle}>
                                Se crea dentro del complejo seleccionado.
                            </p>
                        </div>
                    </div>

                    {complejos.length === 0 ? (
                        <div className={styles.emptyBox}>
                            <p className={styles.emptyTitle}>Primero crea tu complejo.</p>
                            <p className={styles.mutedSmall}>
                                Ve a la pestaña “Mi complejo” y guarda uno para poder registrar canchas.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className={styles.formGrid}>
                                <Campo label="Complejo" styles={styles}>
                                    <select
                                        className={styles.select}
                                        value={String(form.complejo_id || "")}
                                        onChange={async (e) => {
                                            const id = e.target.value;
                                            setForm({ ...form, complejo_id: id });
                                            setStoredComplejoId(id);
                                            await cargar(id);
                                        }}
                                    >
                                        <option value="">Selecciona...</option>
                                        {complejos.map((c) => (
                                            <option key={c.id} value={String(c.id)}>
                                                #{c.id} · {c.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </Campo>

                                <Campo label="Nombre de cancha" styles={styles}>
                                    <input
                                        className={styles.input}
                                        value={form.nombre}
                                        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                        placeholder="Ej: Cancha 1"
                                    />
                                </Campo>

                                <Campo label="Tipo" styles={styles}>
                                    <select
                                        className={styles.select}
                                        value={form.tipo}
                                        onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                                    >
                                        <option>Fútbol 5</option>
                                        <option>Fútbol 7</option>
                                        <option>Fútbol 11</option>
                                    </select>
                                </Campo>

                                <Campo label="Pasto" styles={styles}>
                                    <select
                                        className={styles.select}
                                        value={form.pasto}
                                        onChange={(e) => setForm({ ...form, pasto: e.target.value })}
                                    >
                                        <option>Sintético</option>
                                        <option>Híbrido</option>
                                        <option>Natural</option>
                                    </select>
                                </Campo>

                                <Campo label="Precio por hora (S/)" styles={styles}>
                                    <input
                                        className={styles.input}
                                        type="number"
                                        value={form.precio_hora}
                                        onChange={(e) =>
                                            setForm({ ...form, precio_hora: Number(e.target.value) })
                                        }
                                    />
                                </Campo>

                                <Campo label="Activa" styles={styles}>
                                    <select
                                        className={styles.select}
                                        value={form.is_active ? "1" : "0"}
                                        onChange={(e) =>
                                            setForm({ ...form, is_active: e.target.value === "1" })
                                        }
                                    >
                                        <option value="1">Sí</option>
                                        <option value="0">No</option>
                                    </select>
                                </Campo>
                            </div>

                            <div className={styles.actionsBar}>
                                <button
                                    className={styles.btnPrimary}
                                    onClick={crearCancha}
                                    disabled={guardando}
                                    type="button"
                                >
                                    {guardando ? "Creando..." : "Crear cancha"}
                                </button>
                            </div>

                            <p className={styles.help}>
                                Tip: si una cancha está “No”, no debería mostrarse al público.
                            </p>
                        </>
                    )}
                </section>

                {/* Card: Lista */}
                <section className={cn(styles.card, styles.cardList)}>
                    <div className={styles.cardTop}>
                        <div>
                            <h2 className={styles.cardTitle}>Mis canchas</h2>
                            <p className={styles.cardSubtitle}>
                                Complejo: <strong className={styles.strong}>{complejoActualNombre}</strong>
                            </p>
                        </div>

                        {complejos.length ? (
                            <div className={styles.headerBtns}>
                                <span className={styles.counter}>{totalCanchas}</span>
                                <button
                                    className={styles.btnGhost}
                                    onClick={() => cargar(form.complejo_id)}
                                    type="button"
                                >
                                    Actualizar lista
                                </button>
                            </div>
                        ) : null}
                    </div>

                    <div className={styles.divisor} />

                    {cargando ? (
                        <div className={styles.skeleton} />
                    ) : complejos.length === 0 ? (
                        <div className={styles.emptyBox}>
                            <p className={styles.emptyTitle}>Aún no tienes complejo.</p>
                            <p className={styles.mutedSmall}>
                                Crea uno en “Mi complejo” para poder ver y agregar canchas.
                            </p>
                        </div>
                    ) : canchas.length === 0 ? (
                        <div className={styles.emptyBox}>
                            <p className={styles.emptyTitle}>Aún no registras canchas en este complejo.</p>
                            <p className={styles.mutedSmall}>Crea tu primera cancha en el formulario.</p>
                        </div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Nombre</th>
                                        <th>Tipo</th>
                                        <th>Pasto</th>
                                        <th>Precio/h</th>
                                        <th>Activa</th>
                                        <th className={styles.thRight}>Acciones</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {canchas.map((c) => {
                                        const editing = editId === c.id;

                                        return (
                                            <tr key={c.id}>
                                                <td className={styles.cellMuted}>#{c.id}</td>

                                                <td className={styles.cellStrong}>
                                                    {editing ? (
                                                        <input
                                                            className={styles.tableInput}
                                                            value={editForm.nombre}
                                                            onChange={(e) =>
                                                                setEditForm((p) => ({ ...p, nombre: e.target.value }))
                                                            }
                                                        />
                                                    ) : (
                                                        c.nombre
                                                    )}
                                                </td>

                                                <td>
                                                    {editing ? (
                                                        <select
                                                            className={styles.tableInput}
                                                            value={editForm.tipo}
                                                            onChange={(e) =>
                                                                setEditForm((p) => ({ ...p, tipo: e.target.value }))
                                                            }
                                                        >
                                                            <option>Fútbol 5</option>
                                                            <option>Fútbol 7</option>
                                                            <option>Fútbol 11</option>
                                                        </select>
                                                    ) : (
                                                        c.tipo
                                                    )}
                                                </td>

                                                <td>
                                                    {editing ? (
                                                        <select
                                                            className={styles.tableInput}
                                                            value={editForm.pasto}
                                                            onChange={(e) =>
                                                                setEditForm((p) => ({ ...p, pasto: e.target.value }))
                                                            }
                                                        >
                                                            <option>Sintético</option>
                                                            <option>Híbrido</option>
                                                            <option>Natural</option>
                                                        </select>
                                                    ) : (
                                                        c.pasto
                                                    )}
                                                </td>

                                                <td>
                                                    {editing ? (
                                                        <input
                                                            className={styles.tableInput}
                                                            type="number"
                                                            value={editForm.precio_hora}
                                                            onChange={(e) =>
                                                                setEditForm((p) => ({
                                                                    ...p,
                                                                    precio_hora: Number(e.target.value),
                                                                }))
                                                            }
                                                        />
                                                    ) : (
                                                        <>S/ {Number(c.precio_hora).toFixed(0)}</>
                                                    )}
                                                </td>

                                                <td>
                                                    {editing ? (
                                                        <select
                                                            className={styles.tableInput}
                                                            value={editForm.is_active ? "1" : "0"}
                                                            onChange={(e) =>
                                                                setEditForm((p) => ({
                                                                    ...p,
                                                                    is_active: e.target.value === "1",
                                                                }))
                                                            }
                                                        >
                                                            <option value="1">Sí</option>
                                                            <option value="0">No</option>
                                                        </select>
                                                    ) : (
                                                        <span className={cn(styles.badge, c.is_active ? styles.badgeOk : styles.badgeOff)}>
                                                            {c.is_active ? "Activa" : "Inactiva"}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className={styles.tdRight}>
                                                    {!editing ? (
                                                        <button
                                                            className={styles.btnGhost}
                                                            type="button"
                                                            onClick={() => empezarEdicion(c)}
                                                        >
                                                            Editar
                                                        </button>
                                                    ) : (
                                                        <div className={styles.rowActions}>
                                                            <button
                                                                className={styles.btnPrimary}
                                                                type="button"
                                                                onClick={() => guardarEdicion(c.id)}
                                                                disabled={editSaving}
                                                            >
                                                                {editSaving ? "Guardando..." : "Guardar"}
                                                            </button>

                                                            <button
                                                                className={styles.btnDanger}
                                                                type="button"
                                                                onClick={cancelarEdicion}
                                                                disabled={editSaving}
                                                            >
                                                                Cancelar
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

function Campo({
    label,
    children,
    styles,
}: {
    label: string;
    children: React.ReactNode;
    styles: Record<string, string>;
}) {
    return (
        <label className={styles.field}>
            <span className={styles.label}>{label}</span>
            {children}
        </label>
    );
}
