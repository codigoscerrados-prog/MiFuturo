import LegalPage, { LegalSection } from "@/componentes/LegalPage/LegalPage";

const sections: LegalSection[] = [
  {
    title: "1. Compromiso de privacidad",
    content: (
      <>
        <p>
          En Lateralverde cuidamos tu privacidad. Usamos tus datos para operar la Plataforma, mejorar tu experiencia y mantener la seguridad del servicio, aplicando medidas razonables para protegerlos. La base legal peruana exige que el tratamiento de datos se realice con deber de información y, cuando corresponda, con consentimiento.
        </p>
      </>
    ),
  },
  {
    title: "2. Responsable del tratamiento",
    content: (
      <>
        <p>
          Responsable: [Razón Social / Nombre]
        </p>
        <p>
          RUC: [●]
        </p>
        <p>
          Correo: [correo soporte/privacidad]
        </p>
      </>
    ),
  },
  {
    title: "3. Datos que recopilamos",
    content: (
      <>
        <p>Según tu uso, podemos recopilar:</p>
        <ul>
          <li>Identificación y contacto: nombre, correo, teléfono.</li>
          <li>Cuenta: usuario, rol, preferencias.</li>
          <li>Reservas: cancha elegida, fecha/hora, estado, mensajes.</li>
          <li>Contenido: fotos (perfil o complejo), descripciones.</li>
          <li>Datos técnicos: IP, dispositivo, logs de seguridad.</li>
          <li>Ubicación (opcional): si autorizas GPS para mostrar canchas cercanas.</li>
        </ul>
      </>
    ),
  },
  {
    title: "4. Finalidades",
    content: (
      <>
        <p>Usamos tus datos para:</p>
        <ul>
          <li>Crear y administrar tu cuenta.</li>
          <li>Gestionar solicitudes y confirmaciones de reservas.</li>
          <li>Atención al cliente y soporte.</li>
          <li>Prevenir fraude y mejorar seguridad.</li>
          <li>Analítica interna (solo si aceptas cookies no esenciales, ver Política de Cookies).</li>
        </ul>
      </>
    ),
  },
  {
    title: "5. Compartición de datos",
    content: (
      <>
        <p>Podemos compartir datos:</p>
        <ul>
          <li>Con Propietarios cuando sea necesario para gestionar una reserva (p.ej., nombre/teléfono si lo requiere el proceso).</li>
          <li>Con proveedores tecnológicos (hosting, base de datos, mensajería) bajo obligaciones de confidencialidad.</li>
          <li>Por requerimiento legal o autoridad competente.</li>
        </ul>
      </>
    ),
  },
  {
    title: "6. Conservación",
    content: (
      <>
        <p>
          Conservamos datos mientras exista tu cuenta o sean necesarios para:
        </p>
        <p>prestar el servicio,</p>
        <p>cumplir obligaciones legales,</p>
        <p>resolver disputas o incidencias.</p>
      </>
    ),
  },
  {
    title: "7. Derechos del titular",
    content: (
      <>
        <p>
          Puedes solicitar: acceso, rectificación, cancelación/eliminación y oposición (según corresponda). Escríbenos a [correo privacidad] con:
        </p>
        <p>asunto “Derechos de Datos Personales”</p>
        <p>tu nombre, correo asociado, y solicitud concreta.</p>
      </>
    ),
  },
  {
    title: "8. Seguridad",
    content: (
      <>
        <p>
          Aplicamos medidas técnicas y organizativas razonables (control de acceso, registros, buenas prácticas) para reducir riesgos de acceso no autorizado.
        </p>
      </>
    ),
  },
  {
    title: "9. Cambios",
    content: (
      <>
        <p>Si actualizamos esta política, publicaremos la nueva versión con fecha.</p>
      </>
    ),
  },
];

export const metadata = {
  title: "Lateralverde | Política de Privacidad",
  description: "Cómo tratamos tus datos personales en Lateralverde.",
};

export default function PagePrivacidad() {
  return (
    <LegalPage
      title="Política de Privacidad — Lateralverde"
      description="Conoce cómo recogemos, usamos y protegemos tus datos en Lateralverde."
      updated="27/01/2026"
      sections={sections}
    />
  );
}
