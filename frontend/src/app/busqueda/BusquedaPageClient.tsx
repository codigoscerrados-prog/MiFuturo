"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import BuscadorCanchas from "@/secciones/BusquedaDeCancha/BuscadorCanchas";
import BusquedaDeCancha, { type FiltrosBusqueda } from "@/secciones/BusquedaDeCancha/BusquedaDeCancha";

const FILTROS_INICIALES: FiltrosBusqueda = {
    departamento: "Cualquiera",
    provincia: "Cualquiera",
    distrito: "Cualquiera",
    tipo: "Cualquiera",
    precioMax: 9999,
};

export default function BusquedaPageClient() {
    const searchParams = useSearchParams();
    const paramsKey = searchParams.toString();

    const filtrosDesdeQuery = useMemo<FiltrosBusqueda>(() => {
        const dep = searchParams.get("departamento") || FILTROS_INICIALES.departamento;
        const prov = searchParams.get("provincia") || FILTROS_INICIALES.provincia;
        const dist = searchParams.get("distrito") || FILTROS_INICIALES.distrito;
        const tipo = (searchParams.get("tipo") || FILTROS_INICIALES.tipo) as FiltrosBusqueda["tipo"];
        const precioRaw = Number(searchParams.get("precioMax"));
        const precioMax = Number.isFinite(precioRaw) ? precioRaw : FILTROS_INICIALES.precioMax;

        return {
            departamento: dep,
            provincia: prov,
            distrito: dist,
            tipo,
            precioMax,
        };
    }, [paramsKey, searchParams]);

    const accion = useMemo(() => {
        const raw = (searchParams.get("accion") || "").toLowerCase();
        if (raw === "detalles" || raw === "reservar") return raw as "detalles" | "reservar";
        return null;
    }, [paramsKey, searchParams]);

    const complejoId = useMemo(() => {
        const raw = searchParams.get("complejo");
        if (!raw) return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
    }, [paramsKey, searchParams]);

    const [filtros, setFiltros] = useState<FiltrosBusqueda>(filtrosDesdeQuery);
    const [mostrando, setMostrando] = useState(true);

    useEffect(() => {
        setFiltros(filtrosDesdeQuery);
        setMostrando(true);
    }, [filtrosDesdeQuery]);

    return (
        <main className={styles.page} style={{ marginTop: "65px" }}>
            <div className="contenedor">
                <BuscadorCanchas
                    filtros={filtros}
                    onBuscar={(f) => {
                        setFiltros(f);
                        setMostrando(true);
                    }}
                />
            </div>

            <BusquedaDeCancha
                filtros={filtros}
                mostrando={mostrando}
                modo="pagina"
                accion={accion}
                complejoId={complejoId}
            />
        </main>
    );
}
