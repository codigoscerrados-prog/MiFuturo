import LegalPage, { LegalSection } from "@/componentes/LegalPage/LegalPage";

const sections: LegalSection[] = [
  {
    title: "Aviso de responsabilidad",
    content: (
      <>
        <p>
          Lateralverde es una plataforma tecnológica que facilita la búsqueda y la gestión de solicitudes de reserva.
        </p>
        <p>Por ello, el usuario acepta que:</p>
      </>
    ),
  },
  {
    title: "Disponibilidad",
    content: (
      <>
        <p>La confirmación final de una reserva depende del complejo/cancha y su disponibilidad real.</p>
      </>
    ),
  },
  {
    title: "Terceros",
    content: (
      <>
        <p>
          Los complejos y propietarios son terceros independientes; Lateralverde no controla ni garantiza la calidad del servicio, seguridad del local, reglas internas, ni cambios operativos.
        </p>
      </>
    ),
  },
  {
    title: "Información pública",
    content: (
      <>
        <p>Precios, horarios, fotos y descripciones son proporcionados por los propietarios y pueden cambiar.</p>
      </>
    ),
  },
  {
    title: "Incidencias",
    content: (
      <>
        <p>
          Ante conflictos, cancelaciones o reprogramaciones, Lateralverde podrá apoyar como canal de comunicación, pero no asume responsabilidad por decisiones del establecimiento.
        </p>
      </>
    ),
  },
];

export const metadata = {
  title: "Lateralverde | Aviso de Responsabilidad",
  description: "Descubre las limitaciones de responsabilidad de Lateralverde frente a complejos y terceros.",
};

export default function PageAvisoResponsabilidad() {
  return (
    <LegalPage
      title="Aviso de Responsabilidad — reservas, disponibilidad y terceros"
      description="Comprende qué garantías ofrece (y no ofrece) Lateralverde al gestionar reservas."
      updated="27/01/2026"
      sections={sections}
    />
  );
}
