import styles from "./SeccionDestacadas.module.css";

const canchas = [
    { nombre: "Sintético Marconi", zona: "Lima Norte", precio: "S/ 80 / hora" },
    { nombre: "Arena Norte", zona: "Los Olivos", precio: "S/ 75 / hora" },
    { nombre: "Cancha La 10", zona: "Comas", precio: "S/ 90 / hora" },
];

export default function SeccionDestacadas() {
    return (
        <section id="canchas" className={styles.seccion}>
            <div className="contenedor">
                <div className={styles.cabecera}>
                    <h2 className={styles.titulo}>Canchas destacadas</h2>
                    <button className="boton">Ver todas</button>
                </div>

                <div className={styles.grid}>
                    {canchas.map((c) => (
                        <article key={c.nombre} className={`tarjeta ${styles.card}`}>
                            <div className={styles.etiqueta}>Disponible</div>
                            <h3 className={styles.nombre}>{c.nombre}</h3>
                            <p className={styles.meta}>{c.zona} • {c.precio}</p>
                            <div className={styles.acciones}>
                                <button className="boton botonPrimario">Reservar</button>
                                <button className="boton">Detalles</button>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
