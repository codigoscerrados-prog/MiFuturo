"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import styles from "./BuscadorCanchas.module.css";
import type { FiltrosBusqueda, TipoCancha } from "./BusquedaDeCancha";

type DeptOpt = { id: string; name: string };
type ProvOpt = { id: string; name: string; department_id: string };
type DistOpt = {
    id: string;
    name: string | null;
    province_id: string | null;
    department_id: string | null;
};

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function normalizar(v: string) {
    return v.toLowerCase().trim();
}

export default function BuscadorCanchas({
    filtros,
    onBuscar,
}: {
    filtros: FiltrosBusqueda;
    onBuscar: (f: FiltrosBusqueda) => void;
}) {
    const PRECIO_MIN = 30;
    const PRECIO_MAX = 300;

    const [tipo, setTipo] = useState<TipoCancha | "Cualquiera">(filtros.tipo || "Cualquiera");
    const [precioMax, setPrecioMax] = useState<number>(filtros.precioMax || PRECIO_MAX);

    const [departamentos, setDepartamentos] = useState<DeptOpt[]>([]);
    const [provincias, setProvincias] = useState<ProvOpt[]>([]);
    const [distritos, setDistritos] = useState<DistOpt[]>([]);

    const [departamentoId, setDepartamentoId] = useState<string>("");
    const [provinciaId, setProvinciaId] = useState<string>("");
    const [distritoId, setDistritoId] = useState<string>("");

    const progreso = `${((clamp(precioMax, PRECIO_MIN, PRECIO_MAX) - PRECIO_MIN) / (PRECIO_MAX - PRECIO_MIN)) * 100}%`;

    const departamentoLimaId = useMemo(() => {
        const lima = departamentos.find((d) => normalizar(d.name) === "lima");
        return lima?.id || "";
    }, [departamentos]);

    const departamentoNombre = useMemo(() => {
        const found = departamentos.find((d) => d.id === departamentoId);
        return found?.name || "Cualquiera";
    }, [departamentos, departamentoId]);

    const provinciaNombre = useMemo(() => {
        const found = provincias.find((p) => p.id === provinciaId);
        return found?.name || "Cualquiera";
    }, [provincias, provinciaId]);

    const distritoNombre = useMemo(() => {
        const found = distritos.find((d) => d.id === distritoId);
        return found?.name || found?.id || "Cualquiera";
    }, [distritos, distritoId]);

    useEffect(() => {
        let activo = true;
        (async () => {
            try {
                const data = await apiFetch<DeptOpt[]>("/ubigeo/departamentos");
                if (activo) setDepartamentos(Array.isArray(data) ? data : []);
            } catch {
                if (activo) setDepartamentos([]);
            }
        })();
        return () => {
            activo = false;
        };
    }, []);

    useEffect(() => {
        setTipo(filtros.tipo || "Cualquiera");
        setPrecioMax(filtros.precioMax || PRECIO_MAX);
    }, [filtros.tipo, filtros.precioMax]);

    useEffect(() => {
        if (!departamentos.length) return;
        const target = normalizar(filtros.departamento || "");
        const match = departamentos.find((d) => normalizar(d.name) === target);
        setDepartamentoId(match?.id || "");
    }, [departamentos, filtros.departamento]);

    useEffect(() => {
        if (!departamentoId) {
            setProvincias([]);
            setProvinciaId("");
            setDistritos([]);
            setDistritoId("");
            return;
        }

        setProvinciaId("");
        setDistritos([]);
        setDistritoId("");

        let activo = true;
        (async () => {
            try {
                const data = await apiFetch<ProvOpt[]>(`/ubigeo/provincias?department_id=${departamentoId}`);
                if (activo) setProvincias(Array.isArray(data) ? data : []);
            } catch {
                if (activo) setProvincias([]);
            }
        })();
        return () => {
            activo = false;
        };
    }, [departamentoId]);

    useEffect(() => {
        if (!provincias.length) return;
        if (provinciaId && provincias.some((p) => p.id === provinciaId)) return;
        const target = normalizar(filtros.provincia || "");
        const match = provincias.find((p) => normalizar(p.name) === target);
        setProvinciaId(match?.id || "");
    }, [provincias, provinciaId, filtros.provincia]);

    useEffect(() => {
        if (!provinciaId) {
            setDistritos([]);
            setDistritoId("");
            return;
        }

        setDistritoId("");

        let activo = true;
        (async () => {
            try {
                const data = await apiFetch<DistOpt[]>(`/ubigeo/distritos?province_id=${provinciaId}`);
                if (activo) setDistritos(Array.isArray(data) ? data : []);
            } catch {
                if (activo) setDistritos([]);
            }
        })();
        return () => {
            activo = false;
        };
    }, [provinciaId]);

    useEffect(() => {
        if (!distritos.length) return;
        if (!filtros.distrito) return;
        const target = normalizar(filtros.distrito);
        const match = distritos.find((d) => normalizar(d.name || "") === target);
        if (match) setDistritoId(match.id);
    }, [distritos, filtros.distrito]);

    function enviarBusqueda(e: FormEvent) {
        e.preventDefault();

        const payload: FiltrosBusqueda = {
            departamento: departamentoNombre || "Cualquiera",
            provincia: provinciaNombre || "Cualquiera",
            distrito: distritoNombre || "Cualquiera",
            tipo,
            precioMax: clamp(precioMax, PRECIO_MIN, PRECIO_MAX),
        };

        onBuscar(payload);
        document.getElementById("busqueda-de-cancha")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    return (
        <section className={styles.seccion}>
            <form onSubmit={enviarBusqueda} className={styles.form}>
                <div className={styles.top}>
                    <div>
                        <p className={styles.kicker}>Busqueda</p>
                        <h2 className={styles.titulo}>Encuentra tu cancha ideal</h2>
                        <p className={styles.subtitulo}>Ajusta los filtros y compara opciones en segundos.</p>
                    </div>
                    
                </div>

                <div className={styles.grid}>
                    <label className={styles.campo}>
                        <span className={styles.label}>Departamento</span>
                        <select className={styles.select} value={departamentoId} onChange={(e) => setDepartamentoId(e.target.value)}>
                            <option value="">{departamentos.length ? "Selecciona..." : "Cargando..."}</option>
                            {departamentos.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.campo}>
                        <span className={styles.label}>Provincia</span>
                        <select
                            className={styles.select}
                            value={provinciaId}
                            onChange={(e) => setProvinciaId(e.target.value)}
                            disabled={!departamentoId}
                        >
                            <option value="">{departamentoId ? "Selecciona..." : "Elige un departamento"}</option>
                            {provincias.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.campo}>
                        <span className={styles.label}>Distrito</span>
                        <select
                            className={styles.select}
                            value={distritoId}
                            onChange={(e) => setDistritoId(e.target.value)}
                            disabled={!provinciaId}
                        >
                            <option value="">{provinciaId ? "Todos" : "Elige una provincia"}</option>
                            {distritos.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name ?? d.id}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.campo}>
                        <span className={styles.label}>Tipo</span>
                        <select className={styles.select} value={tipo} onChange={(e) => setTipo(e.target.value as any)}>
                            <option value="Cualquiera">Cualquiera</option>
                            <option value={"F\u00fatbol 5"}>Futbol 5</option>
                            <option value={"F\u00fatbol 7"}>Futbol 7</option>
                            <option value={"F\u00fatbol 11"}>Futbol 11</option>
                        </select>
                    </label>

                    <div className={styles.campo}>
                        <div className={styles.filaLabel}>
                            <span className={styles.label}>Precio maximo</span>
                            <span className={styles.precio}>S/ {clamp(precioMax, PRECIO_MIN, PRECIO_MAX)} / hora</span>
                        </div>

                        <input
                            className={styles.range}
                            type="range"
                            min={PRECIO_MIN}
                            max={PRECIO_MAX}
                            value={precioMax}
                            style={{ ["--progreso" as any]: progreso }}
                            onChange={(e) => setPrecioMax(Number(e.target.value))}
                        />

                        <div className={styles.rangeHints}>
                            <span>S/ {PRECIO_MIN}</span>
                            <span>S/ {PRECIO_MAX}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.acciones}>
                    <button type="submit" className={`boton botonPrimario ${styles.btnPrincipal}`}>
                        Buscar ahora
                    </button>
                    <button
                        type="button"
                        className={`boton botonNeon ${styles.btnSec}`}
                        onClick={() => {
                            setDepartamentoId("");
                            setProvinciaId("");
                            setDistritoId("");
                            setTipo("Cualquiera");
                            setPrecioMax(PRECIO_MAX);
                        }}
                    >
                        Limpiar
                    </button>
                </div>
            </form>
        </section>
    );
}
