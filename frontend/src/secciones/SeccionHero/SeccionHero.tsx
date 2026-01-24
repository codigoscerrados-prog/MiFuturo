"use client";

import Image from "next/image";
import styles from "./SeccionHero.module.css";
import BuscadorCanchas from "@/secciones/BusquedaDeCancha/BuscadorCanchas";
import type { FiltrosBusqueda } from "@/secciones/BusquedaDeCancha/BusquedaDeCancha";

const FILTROS_BASE: FiltrosBusqueda = {
    departamento: "Lima",
    provincia: "Lima",
    distrito: "",
    tipo: "Cualquiera",
    precioMax: 120,
};

const BANNER = {
    badge: "Reserva simple - filtros claros - confirmacion rapida",
    titulo: "Encuentra tu cancha",
    subtitulo: "Filtra por departamento, provincia, distrito, tipo y precio. Resultados en segundos.",
    imagen: "/banner.avif",
};

export default function SeccionHero({
    onBuscar,
    mostrarBuscador = true,
}: {
    onBuscar?: (f: FiltrosBusqueda) => void;
    mostrarBuscador?: boolean;
}) {
    const banner = mostrarBuscador ? BANNER : { ...BANNER, subtitulo: "Explora complejos y canchas destacadas." };

    return (
        <section className={styles.hero}>
            <div className={styles.banner}>
                <Image
                    key={banner.imagen}
                    src={banner.imagen}
                    alt=""
                    fill
                    priority
                    className={styles.bannerImg}
                    sizes="(max-width: 900px) 100vw, 1400px"
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

                    {mostrarBuscador && onBuscar && (
                        <div className={styles.buscadorWrap}>
                            <BuscadorCanchas filtros={FILTROS_BASE} onBuscar={onBuscar} />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
