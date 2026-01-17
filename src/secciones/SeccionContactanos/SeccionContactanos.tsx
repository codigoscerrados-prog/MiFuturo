"use client";

import { useMemo, useState } from "react";
import styles from "./SeccionContactanos.module.css";

const WHATSAPP = "51922023667"; // 51 + 922023667

export default function SeccionContactanos() {
    const [nombre, setNombre] = useState("");
    const [telefono, setTelefono] = useState("");
    const [correo, setCorreo] = useState("");
    const [motivo, setMotivo] = useState("Reservar una cancha");
    const [mensaje, setMensaje] = useState("");
    const [enviando, setEnviando] = useState(false);

    const whatsappUrl = useMemo(() => {
        const texto = [
            "Hola 👋, quiero contactarte desde CanchasPro.",
            "",
            `- Nombre: ${nombre || "-"}`,
            `- Teléfono: ${telefono || "-"}`,
            `- Correo: ${correo || "-"}`,
            `- Motivo: ${motivo || "-"}`,
            "",
            `Mensaje: ${mensaje || "-"}`,
        ].join("\n");

        return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
    }, [nombre, telefono, correo, motivo, mensaje]);

    function enviar(e: React.FormEvent) {
        e.preventDefault();

        // mini validación
        if (!nombre.trim() || !telefono.trim() || !mensaje.trim()) return;

        setEnviando(true);

        // abre WhatsApp con el mensaje armado
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");

        // opcional: limpiar (si quieres que quede lleno, comenta esto)
        setTimeout(() => {
            setNombre("");
            setTelefono("");
            setCorreo("");
            setMotivo("Reservar una cancha");
            setMensaje("");
            setEnviando(false);
        }, 300);
    }

    return (
        <section className={styles.seccion}>
            <div className={`contenedor ${styles.contenido}`}>
                <header className={styles.cabecera}>
                    <div>
                        <p className={styles.badge}>Soporte rápido • WhatsApp directo • Respuesta humana</p>
                        <h1 className={styles.titulo}>Contáctanos</h1>
                        <p className={styles.subtitulo}>
                            Envíanos tu consulta y se abrirá WhatsApp con los datos listos para enviar.
                        </p>
                    </div>

                    <a className={`boton botonNeon ${styles.botonDirecto}`} href={whatsappUrl} target="_blank" rel="noreferrer">
                        Escribir por WhatsApp
                    </a>
                </header>

                <div className={styles.grid}>
                    {/* Form */}
                    <section className={`tarjeta ${styles.panel}`}>
                        <div className={styles.panelTop}>
                            <div>
                                <h2 className={styles.panelTitulo}>Formulario</h2>
                                <p className={styles.panelSub}>Completa los campos y abre WhatsApp para enviar.</p>
                            </div>
                            <span className={styles.sello}>ONLINE</span>
                        </div>

                        <form onSubmit={enviar} className={styles.form}>
                            <div className={styles.filas}>
                                <label className={styles.campo}>
                                    <span className={styles.label}>Nombre *</span>
                                    <input
                                        className={styles.input}
                                        value={nombre}
                                        onChange={(e) => setNombre(e.target.value)}
                                        placeholder="Tu nombre"
                                        required
                                    />
                                </label>

                                <label className={styles.campo}>
                                    <span className={styles.label}>Teléfono *</span>
                                    <input
                                        className={styles.input}
                                        value={telefono}
                                        onChange={(e) => setTelefono(e.target.value)}
                                        placeholder="Ej: 999 888 777"
                                        inputMode="tel"
                                        required
                                    />
                                </label>

                                <label className={styles.campo}>
                                    <span className={styles.label}>Correo (opcional)</span>
                                    <input
                                        className={styles.input}
                                        value={correo}
                                        onChange={(e) => setCorreo(e.target.value)}
                                        placeholder="tucorreo@email.com"
                                        inputMode="email"
                                        type="email"
                                    />
                                </label>

                                <label className={styles.campo}>
                                    <span className={styles.label}>Motivo</span>
                                    <select className={styles.select} value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                                        <option>Reservar una cancha</option>
                                        <option>Publicar mi cancha</option>
                                        <option>Organizar un torneo</option>
                                        <option>Soporte / Problema</option>
                                        <option>Otro</option>
                                    </select>
                                </label>

                                <label className={styles.campoFull}>
                                    <span className={styles.label}>Mensaje *</span>
                                    <textarea
                                        className={styles.textarea}
                                        value={mensaje}
                                        onChange={(e) => setMensaje(e.target.value)}
                                        placeholder="Cuéntanos qué necesitas..."
                                        required
                                    />
                                </label>
                            </div>

                            <div className={styles.acciones}>
                                <button className={`boton botonPrimario ${styles.btnPrincipal}`} type="submit" disabled={enviando}>
                                    {enviando ? "Abriendo WhatsApp..." : "Enviar por WhatsApp"}
                                </button>

                                
                            </div>

                            <p className={styles.aviso}>
                                * Al enviar, se abrirá WhatsApp con el texto listo. Solo presiona <strong>Enviar</strong>.
                            </p>
                        </form>
                    </section>

                    {/* Info */}
                    <aside className={`tarjeta ${styles.info}`}>
                        <h3 className={styles.infoTitulo}>Canales</h3>

                        <div className={styles.infoBloque}>
                            <span className={styles.infoLabel}>WhatsApp</span>
                            <span className={styles.infoValor}>+51 922 023 667</span>
                            <span className={styles.infoLabel}>Correo elecetronico</span>
                            <span className={styles.infoValor}>jfloresmarconi@gmail.com</span>
                        </div>

                        <div className={styles.linea} />

                        <div className={styles.infoBloque}>
                            <span className={styles.infoLabel}>Horario</span>
                            <span className={styles.infoValor}>Lun–Dom • 8:00am – 11:00pm</span>
                            <span className={styles.infoHint}>* Puedes ajustar esto luego.</span>
                        </div>

                        <div className={styles.linea} />

                        <div className={styles.infoBloque}>
                            <span className={styles.infoLabel}>Tip</span>
                            <span className={styles.infoValor}>
                                Si estás en “Cerca de mí”, dinos tu distrito y el horario ideal.
                            </span>
                        </div>
                    </aside>
                </div>
            </div>
        </section>
    );
}
