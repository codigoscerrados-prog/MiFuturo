"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import styles from "./SeccionHero.module.css";
import type { FiltrosBusqueda, TipoCancha } from "@/secciones/BusquedaDeCancha/BusquedaDeCancha";

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

type ModoBanner = "reserva" | "torneos" | "duenos";

const BANNERS: Record<
    ModoBanner,
    { titulo: string; subtitulo: string; imagen: string; badge: string }
> = {
    reserva: {
        badge: "Reserva simple • filtros claros • confirmación rápida",
        titulo: "Encuentra tu cancha",
        subtitulo: "Filtra por zona, tipo, pasto, precio y características. Resultados aparecen abajo.",
        imagen: "/banner.avif",
    },
    torneos: {
        badge: "Crea campeonatos • fixture • tabla • resultados",
        titulo: "Organiza tu torneo",
        subtitulo: "Arma tu campeonato y comparte el link con equipos y jugadores en segundos.",
        imagen: "/banner.avif",
    },
    duenos: {
        badge: "Llena horarios • gestiona reservas • más clientes",
        titulo: "Publica tu cancha",
        subtitulo: "Recibe reservas con información clara: precio, amenidades, disponibilidad y contacto.",
        imagen: "/banner.avif",
    },
};

export default function SeccionHero({ onBuscar }: { onBuscar: (f: FiltrosBusqueda) => void }) {
    const [modo, setModo] = useState<ModoBanner>("reserva");

    const [zona, setZona] = useState<string>("Cerca de mí");
    const [tipo, setTipo] = useState<TipoCancha | "Cualquiera">("Cualquiera");
    const [pasto, setPasto] = useState<"Sintético" | "Híbrido" | "Cualquiera">("Cualquiera");
    const [precioMax, setPrecioMax] = useState<number>(120);

    const [techada, setTechada] = useState<boolean>(false);
    const [iluminacion, setIluminacion] = useState<boolean>(true);
    const [vestuarios, setVestuarios] = useState<boolean>(false);
    const [estacionamiento, setEstacionamiento] = useState<boolean>(false);
    const [cafeteria, setCafeteria] = useState<boolean>(false);

    const banner = useMemo(() => BANNERS[modo], [modo]);
    const progreso = `${((clamp(precioMax, 30, 250) - 30) / (250 - 30)) * 100}%`;

    function enviarBusqueda(e: React.FormEvent) {
        e.preventDefault();

        const filtros: FiltrosBusqueda = {
            zona,
            tipo,
            pasto,
            precioMax: clamp(precioMax, 30, 250),
            caracteristicas: { techada, iluminacion, vestuarios, estacionamiento, cafeteria },
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
                    {/* Tabs/Botones para alternar banners */}
                    <div className={styles.tabs} role="tablist" aria-label="Cambiar enfoque">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={modo === "reserva"}
                            className={`${styles.tab} ${modo === "reserva" ? styles.tabActivo : ""}`}
                            onClick={() => setModo("reserva")}
                        >
                            Reserva
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={modo === "torneos"}
                            className={`${styles.tab} ${modo === "torneos" ? styles.tabActivo : ""}`}
                            onClick={() => setModo("torneos")}
                        >
                            Torneos
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={modo === "duenos"}
                            className={`${styles.tab} ${modo === "duenos" ? styles.tabActivo : ""}`}
                            onClick={() => setModo("duenos")}
                        >
                            Dueños
                        </button>
                    </div>

                    <div className={styles.texto}>
                        <p className={styles.badge}>{banner.badge}</p>

                        <h1 className={styles.titulo}>
                            {banner.titulo} <span className={styles.degradado}>en segundos</span>
                        </h1>

                        <p className={styles.descripcion}>{banner.subtitulo}</p>
                    </div>

                    {/* Buscador siempre visible (en modo reserva es “la estrella”) */}
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
                                    <span className={styles.label}>Zona</span>
                                    <select className={styles.select} value={zona} onChange={(e) => setZona(e.target.value)}>
                                        <option>Cerca de mí</option>
                                        <option>Los Olivos</option>
                                        <option>Comas</option>
                                        <option>Independencia</option>
                                        <option>San Martín de Porres</option>
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

                                <label className={styles.campo}>
                                    <span className={styles.label}>Pasto</span>
                                    <select className={styles.select} value={pasto} onChange={(e) => setPasto(e.target.value as any)}>
                                        <option value="Cualquiera">Cualquiera</option>
                                        <option value="Sintético">Sintético</option>
                                        <option value="Híbrido">Híbrido</option>
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

                                <div className={styles.features}>
                                    <span className={styles.label}>Características</span>
                                    <div className={styles.chips}>
                                        <Chip checked={techada} onChange={setTechada} text="Techada" />
                                        <Chip checked={iluminacion} onChange={setIluminacion} text="Iluminación" />
                                        <Chip checked={vestuarios} onChange={setVestuarios} text="Vestuarios" />
                                        <Chip checked={estacionamiento} onChange={setEstacionamiento} text="Estacionamiento" />
                                        <Chip checked={cafeteria} onChange={setCafeteria} text="Cafetería" />
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
                                        setZona("Cerca de mí");
                                        setTipo("Cualquiera");
                                        setPasto("Cualquiera");
                                        setPrecioMax(120);
                                        setTechada(false);
                                        setIluminacion(true);
                                        setVestuarios(false);
                                        setEstacionamiento(false);
                                        setCafeteria(false);
                                    }}
                                >
                                    Limpiar
                                </button>
                            </div>

                            {/* Mini CTA contextual según tab */}
                            <div className={styles.ctaInferior} aria-hidden={false}>
                                {modo === "torneos" ? (
                                    <span>💡 Tip: luego podrás crear el fixture y tabla con un link para tus equipos.</span>
                                ) : modo === "duenos" ? (
                                    <span>💡 Tip: publica tu cancha y llena horarios libres con reservas online.</span>
                                ) : (
                                    <span>💡 Tip: usa filtros para encontrar la mejor cancha al mejor precio.</span>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}

function Chip({ checked, onChange, text }: { checked: boolean; onChange: (v: boolean) => void; text: string }) {
    return (
        <button
            type="button"
            className={`${styles.chip} ${checked ? styles.chipOn : ""}`}
            onClick={() => onChange(!checked)}
            aria-pressed={checked}
        >
            {text}
        </button>
    );
}
