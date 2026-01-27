import LegalPage, { LegalSection } from "@/componentes/LegalPage/LegalPage";

const sections: LegalSection[] = [
  {
    title: "1. Alcance",
    content: (
      <>
        <p>Esta política aplica a pagos realizados a Lateralverde por:</p>
        <p>suscripciones/planes (si aplica),</p>
        <p>servicios digitales ofrecidos por la Plataforma.</p>
        <p>(Si el pago se realiza directamente al establecimiento por otros medios, el reembolso dependerá del establecimiento.)</p>
      </>
    ),
  },
  {
    title: "2. Requisito: contactar primero a soporte",
    content: (
      <>
        <p>
          Para solicitar un reembolso, el usuario debe contactar primero con soporte por WhatsApp o correo y proporcionar:
        </p>
        <p>Nombre y correo de la cuenta</p>
        <p>Comprobante/ID de pago</p>
        <p>Motivo y evidencia (capturas, detalles)</p>
        <p>Canales:</p>
        <p>WhatsApp: [número]</p>
        <p>Correo: [correo soporte]</p>
      </>
    ),
  },
  {
    title: "3. Motivos válidos de reembolso (ejemplos)",
    content: (
      <>
        <ul>
          <li>Cobro duplicado</li>
          <li>Cobro por error técnico comprobable</li>
          <li>Servicio no entregado por falla atribuible a la Plataforma (debidamente sustentado)</li>
        </ul>
      </>
    ),
  },
  {
    title: "4. Motivos no válidos (ejemplos)",
    content: (
      <>
        <ul>
          <li>Cambio de opinión luego de haber usado el servicio</li>
          <li>Incumplimientos o decisiones del establecimiento tercero (cuando Lateralverde no controla el servicio)</li>
          <li>Solicitudes sin evidencia mínima o fuera de plazo</li>
        </ul>
      </>
    ),
  },
  {
    title: "5. Evaluación y plazo",
    content: (
      <>
        <p>
          Revisaremos tu caso y responderemos en un plazo razonable.
        </p>
        <p>
          Si corresponde, el reembolso se realizará al mismo medio de pago cuando sea posible o por el canal acordado.
        </p>
      </>
    ),
  },
];

export const metadata = {
  title: "Lateralverde | Política de Reembolsos",
  description: "Condiciones bajo las cuales Lateralverde evalúa reembolsos.",
};

export default function PageReembolsos() {
  return (
    <LegalPage
      title="Política de Reembolsos — Lateralverde"
      description="Cómo solicitas y obtienes reembolsos por pagos en la plataforma."
      updated="27/01/2026"
      sections={sections}
    />
  );
}
