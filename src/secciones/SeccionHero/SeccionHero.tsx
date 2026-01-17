"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./SeccionHero.module.css";
import { apiFetch } from "@/lib/api";
import type { FiltrosBusqueda, TipoCancha } from "@/secciones/BusquedaDeCancha/BusquedaDeCancha";

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

type DeptOpt = { id: string; name: string };
type ProvOpt = { id: string; name: string; department_id: string };
type DistOpt = {
    id: string;
    name: string | null;
    province_id: string | null;
    department_id: string | null;
};

const BANNER = {
    badge: "Reserva simple • filtros claros • confirmación rápida",
    titulo: "Encuentra tu cancha",
    subtitulo: "Filtra por departamento, provincia, distrito, tipo y precio. Resultados aparecen abajo.",
    imagen: "/banner.avif",
};

export default function SeccionHero({ onBuscar }: { onBuscar: (f: FiltrosBusqueda) => void }) {
    const [tipo, setTipo] = useState<TipoCancha | "Cualquiera">("Cualquiera");
    const [precioMax, setPrecioMax] = useState<number>(120);

    const [departamentos, setDepartamentos] = useState<DeptOpt[]>([]);
    const [provincias, setProvincias] = useState<ProvOpt[]>([]);
    const [distritos, setDistritos] = useState<DistOpt[]>([]);

    const [departamentoId, setDepartamentoId] = useState<string>("");
    const [provinciaId, setProvinciaId] = useState<string>("");
    const [distritoId, setDistritoId] = useState<string>("");

    const banner = BANNER;
    const progreso = `${((clamp(precioMax, 30, 250) - 30) / (250 - 30)) * 100}%`;

    const departamentoLimaId = useMemo(() => {
        const lima = departamentos.find((d) => d.name.toLowerCase().trim() === "lima");
        return lima?.id || "";
    }, [departamentos]);

    const departamentoNombre = useMemo(() => {
        const found = departamentos.find((d) => d.id === departamentoId);
        return found?.name || "Lima";
    }, [departamentos, departamentoId]);

    const provinciaNombre = useMemo(() => {
        const found = provincias.find((p) => p.id === provinciaId);
        return found?.name || "Lima";
    }, [provincias, provinciaId]);

    const distritoNombre = useMemo(() => {
        const found = distritos.find((d) => d.id === distritoId);
        return found?.name || found?.id || "";
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
        if (!departamentos.length) return;
        if (departamentoId) return;
        setDepartamentoId(departamentoLimaId || departamentos[0].id);
    }, [departamentos, departamentoId, departamentoLimaId]);

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
                const data = await apiFetch<ProvOpt[]>(
                    `/ubigeo/provincias?department_id=${departamentoId}`
                );
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
        const lima = provincias.find((p) => p.name.toLowerCase().trim() === "lima");
        setProvinciaId(lima?.id || provincias[0].id);
    }, [provincias, provinciaId]);

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
                const data = await apiFetch<DistOpt[]>(
                    `/ubigeo/distritos?province_id=${provinciaId}`
                );
                if (activo) setDistritos(Array.isArray(data) ? data : []);
            } catch {
                if (activo) setDistritos([]);
            }
        })();
        return () => {
            activo = false;
        };
    }, [provinciaId]);

    function enviarBusqueda(e: React.FormEvent) {
        e.preventDefault();

        const filtros: FiltrosBusqueda = {
            departamento: departamentoNombre || "Lima",
            provincia: provinciaNombre || "Lima",
            distrito: distritoNombre || "",
            tipo,
            precioMax: clamp(precioMax, 30, 250),
        };

        onBuscar(filtros);
        document.getElementById("busqueda-de-cancha")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    return (
        <section className={styles.hero}>
            <div className={`contenedor ${styles.banner}`}>
                <Image
                    key={banner.imagen}
                    src={banner.imagen}
                    alt=""
                    fill
                    priority
                    className={styles.bannerImg}
                    sizes="(max-width: 900px) 100vw, 1160px"
                />
                <div className={styles.capa} />

                <div className={styles.bannerContenido}>
                    <div className={styles.texto}>
                        <p className={styles.badge}>{banner.badge}</p>

                        <h1 className={styles.titulo}>
                            {banner.titulo} <span className={styles.degradado}>en segundos</span>
                        </h1>

                        <p className={styles.descripcion}>{banner.subtitulo}</p>
                    </div>

                    {/* Buscador siempre visible */}
                    <div className={styles.panel}>
                        <form onSubmit={enviarBusqueda} className={styles.form}>
                            <div className={styles.formTop}>
                                <div>
                                    <h3 className={styles.formTitulo}>Buscar canchas</h3>
                                    <p className={styles.formSub}>Aplica filtros y encuentra opciones.</p>
                                </div>
                                <div className={styles.sello}>BETA</div>
                            </div>

                            <div className={styles.filas}>
                                <label className={styles.campo}>
                                    <span className={styles.label}>Departamento</span>
                                    <select
                                        className={styles.select}
                                        value={departamentoId}
                                        onChange={(e) => setDepartamentoId(e.target.value)}
                                    >
                                        <option value="">
                                            {departamentos.length ? "Selecciona..." : "Cargando..."}
                                        </option>
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
                                        <option value="">
                                            {departamentoId ? "Selecciona..." : "Elige un departamento"}
                                        </option>
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
                                        <option value="">
                                            {provinciaId ? "Todos" : "Elige una provincia"}
                                        </option>
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
                                        <option value="Fútbol 5">Fútbol 5</option>
                                        <option value="Fútbol 7">Fútbol 7</option>
                                        <option value="Fútbol 11">Fútbol 11</option>
                                    </select>
                                </label>

                                <div className={styles.campo}>
                                    <div className={styles.filaLabel}>
                                        <span className={styles.label}>Precio máximo</span>
                                        <span className={styles.precio}>S/ {clamp(precioMax, 30, 250)} / hora</span>
                                    </div>

                                    <input
                                        className={styles.range}
                                        type="range"
                                        min={30}
                                        max={250}
                                        value={precioMax}
                                        style={{ ["--progreso" as any]: progreso }}
                                        onChange={(e) => setPrecioMax(Number(e.target.value))}
                                    />

                                    <div className={styles.rangeHints}>
                                        <span>S/ 30</span>
                                        <span>S/ 250</span>
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
                                        setDepartamentoId(departamentoLimaId || "");
                                        setProvinciaId("");
                                        setDistritoId("");
                                        setTipo("Cualquiera");
                                        setPrecioMax(120);
                                    }}
                                >
                                    Limpiar
                                </button>
                            </div>

                            {/* Mini CTA */}
                            <div className={styles.ctaInferior} aria-hidden={false}>
                                <span>💡 Tip: usa filtros para encontrar la mejor cancha al mejor precio.</span>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}

