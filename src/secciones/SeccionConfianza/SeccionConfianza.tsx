import Link from "next/link";
import styles from "./SeccionConfianza.module.css";

function IconoEscudo({ className = "" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3l8 4v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4z" />
            <path d="M9 12l2 2 4-5" />
        </svg>
    );
}

function IconoReloj({ className = "" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 8v5l3 2" />
            <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
    );
}

function IconoSoporte({ className = "" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12a8 8 0 0 1 16 0" />
            <path d="M4 12v4a2 2 0 0 0 2 2h2v-6H6a2 2 0 0 0-2 2z" />
            <path d="M20 12v4a2 2 0 0 1-2 2h-2v-6h2a2 2 0 0 1 2 2z" />
            <path d="M12 20h4" />
        </svg>
    );
}

function IconoVerificado({ className = "" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2l2.2 2.7 3.4.5-1.7 3 1 3.3-3.3-.9-2.6 2.3-2.6-2.3-3.3.9 1-3.3-1.7-3 3.4-.5L12 2z" />
            <path d="M9 12l2 2 4-5" />
        </svg>
    );
}

const ITEMS = [
    {
        titulo: "Reserva segura",
        texto: "Tu solicitud queda registrada y recibes confirmación clara del estado de la reserva.",
        Icono: IconoEscudo,
    },
    {
        titulo: "Confirmación rápida",
        texto: "Ahorra tiempo: filtra, elige y pasa a reservar sin llamadas largas ni idas y vueltas.",
        Icono: IconoReloj,
    },
    {
        titulo: "Soporte fácil",
        texto: "¿Dudas o cambios? Te ayudamos por canales directos (como WhatsApp o contacto).",
        Icono: IconoSoporte,
    },
    {
        titulo: "Canchas verificables",
        texto: "Mostramos datos útiles (amenidades, ubicación, precio) para decidir con confianza.",
        Icono: IconoVerificado,
    },
];

export default function SeccionConfianza() {
    return (
        <section id="confianza" className={styles.seccion}>
            <div className={`contenedor ${styles.contenido}`}>
                <div className={styles.cabecera}>
                    <div>
                        <h2 className={styles.titulo}>¿Por qué confiar?</h2>
                        <p className={styles.subtitulo}>
                            Una experiencia clara, rápida y sin sorpresas: desde la búsqueda hasta la reserva.
                        </p>
                    </div>

                    <div className={styles.ctas}>
                        <a className={`boton botonNeon ${styles.botonCta}`} href="#busqueda-de-cancha">
                            Ver canchas
                        </a>
                        <Link className={`boton botonPrimario ${styles.botonCta}`} href="/contactanos">
                            Hablar con soporte
                        </Link>
                    </div>
                </div>

                <div className={styles.grid}>
                    {ITEMS.map(({ titulo, texto, Icono }) => (
                        <article key={titulo} className={`tarjeta ${styles.card}`}>
                            <div className={styles.iconoWrap}>
                                <Icono className={styles.icono} />
                            </div>
                            <h3 className={styles.cardTitulo}>{titulo}</h3>
                            <p className={styles.cardTexto}>{texto}</p>
                        </article>
                    ))}
                </div>

                <div className={styles.banda}>
                    <div className={styles.bandaItem}>
                        <span className={styles.bandaTitulo}>Transparencia</span>
                        <span className={styles.bandaTexto}>precios y características visibles</span>
                    </div>
                    <div className={styles.bandaItem}>
                        <span className={styles.bandaTitulo}>Rapidez</span>
                        <span className={styles.bandaTexto}>búsqueda + filtros desde el inicio</span>
                    </div>
                    <div className={styles.bandaItem}>
                        <span className={styles.bandaTitulo}>Confianza</span>
                        <span className={styles.bandaTexto}>decisiones con info útil</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
