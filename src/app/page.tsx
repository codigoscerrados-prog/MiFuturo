"use client";

import { useState } from "react";



import SeccionHero from "@/secciones/SeccionHero/SeccionHero";
import BusquedaDeCancha, { type FiltrosBusqueda } from "@/secciones/BusquedaDeCancha/BusquedaDeCancha";

import SeccionBeneficios from "@/secciones/SeccionConfianza/SeccionConfianza";
//import SeccionDestacadas from "@/secciones/SeccionDestacadas/SeccionDestacadas";
import SeccionLlamadoAccion from "@/secciones/SeccionLlamadoAccion/SeccionLlamadoAccion";

const FILTROS_INICIALES: FiltrosBusqueda = {
    departamento: "Lima",
    provincia: "Lima",
    distrito: "",
    tipo: "Cualquiera",
    precioMax: 120,
};

export default function Home() {
    const [filtros, setFiltros] = useState<FiltrosBusqueda>(FILTROS_INICIALES);
    const [mostrando, setMostrando] = useState(false);

    return (
        <>
            

            <main>
                <SeccionHero
                    onBuscar={(f) => {
                        setFiltros(f);
                        setMostrando(true);
                    }}
                />
                <p></p>
                <BusquedaDeCancha filtros={filtros} mostrando={mostrando} />
                <p></p>
                <SeccionBeneficios />
                {/* <SeccionDestacadas /> */}
                <p></p>
                <SeccionLlamadoAccion />
                <p></p>
            </main>

            
        </>
    );
}
