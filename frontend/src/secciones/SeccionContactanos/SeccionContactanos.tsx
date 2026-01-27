"use client";

import { FormEvent, useMemo, useState } from "react";
import styles from "./SeccionContactanos.module.css";

const MOTIVOS = {
  ayuda: "Centro de ayuda",
  contacto: "Contacto general",
  problema: "Reportar un problema",
} as const;

interface Props {
  motivoQuery?: keyof typeof MOTIVOS;
}

export default function SeccionContactanos({ motivoQuery }: Props) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  const motivoLabel = MOTIVOS[motivoQuery ?? "contacto"];
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "51999999999";

  const whatsappUrl = useMemo(() => {
    const texto = [
      `Hola, soy ${nombre || "-"}`,
      `Correo: ${correo || "-"}`,
      `Motivo: ${motivoLabel}`,
      "",
      `Mensaje: ${mensaje || "-"}`,
    ].join("\n");

    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(texto)}`;
  }, [nombre, correo, mensaje, motivoLabel, whatsappNumber]);

  function enviar(event: FormEvent) {
    event.preventDefault();
    if (!nombre.trim() || !correo.trim() || !mensaje.trim()) return;

    setEnviando(true);
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    setTimeout(() => {
      setEnviando(false);
      setNombre("");
      setCorreo("");
      setMensaje("");
    }, 300);
  }

  return (
    <section className={styles.seccion}>
      <div className={`contenedor ${styles.contenido}`}>
        <header className={styles.cabecera}>
          <div>
            <p className={styles.badge}>Soporte inmediato • WhatsApp directo • Respuesta humana</p>
            <h1 className={styles.titulo}>{motivoLabel}</h1>
            <p className={styles.subtitulo}>
              Completa los datos y se abrirá WhatsApp con tu mensaje prellenado en segundos. Ideal para seguir con tu
              consulta sin escribirlo todo.
            </p>
          </div>

          <a
            className={`boton botonNeon ${styles.botonDirecto}`}
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            Escribir por WhatsApp
          </a>
        </header>

        <div className={styles.grid}>
          <section className={`tarjeta ${styles.panel}`}>
            <div className={styles.panelTop}>
              <div>
                <h2 className={styles.panelTitulo}>Formulario</h2>
                <p className={styles.panelSub}>Nombre, correo y tu mensaje. El resto lo abrimos por WhatsApp.</p>
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
                    onChange={(event) => setNombre(event.target.value)}
                    placeholder="Tu nombre"
                    required
                  />
                </label>

                <label className={styles.campo}>
                  <span className={styles.label}>Correo *</span>
                  <input
                    className={styles.input}
                    value={correo}
                    onChange={(event) => setCorreo(event.target.value)}
                    placeholder="tu@email.com"
                    type="email"
                    required
                  />
                </label>

                <label className={styles.campoFull}>
                  <span className={styles.label}>Mensaje *</span>
                  <textarea
                    className={styles.textarea}
                    value={mensaje}
                    onChange={(event) => setMensaje(event.target.value)}
                    placeholder="Cuéntanos qué necesitas..."
                    required
                    minLength={10}
                  />
                </label>
              </div>

              <div className={styles.acciones}>
                <button className={`boton botonPrimario ${styles.btnPrincipal}`} type="submit" disabled={enviando}>
                  {enviando ? "Abriendo WhatsApp..." : "Enviar por WhatsApp"}
                </button>
              </div>

              <p className={styles.aviso}>
                * Al enviar, WhatsApp se abrirá con el texto listo. Solo presiona <strong>Enviar</strong>.
              </p>
            </form>
          </section>

          <aside className={`tarjeta ${styles.info}`}>
            <h3 className={styles.infoTitulo}>Canales rápidos</h3>

            <div className={styles.infoBloque}>
              <span className={styles.infoLabel}>WhatsApp</span>
              <span className={styles.infoValor}>+51 999 999 999</span>
              <span className={styles.infoLabel}>Correo electrónico</span>
              <span className={styles.infoValor}>soporte@lateralverde.pe</span>
            </div>

            <div className={styles.linea} />

            <div className={styles.infoBloque}>
              <span className={styles.infoLabel}>Horario</span>
              <span className={styles.infoValor}>Lun–Dom • 8:00am – 11:00pm</span>
              <span className={styles.infoHint}>Ajusta tu consulta a cualquier horario.</span>
            </div>

            <div className={styles.linea} />

            <div className={styles.infoBloque}>
              <span className={styles.infoLabel}>Tip</span>
              <span className={styles.infoValor}>Indica tu distrito y la cancha ideal para darte una respuesta más rápida.</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
