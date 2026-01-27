import LegalPage, { LegalSection } from "@/componentes/LegalPage/LegalPage";

const sections: LegalSection[] = [
  {
    title: "1. Identificación",
    content: (
      <>
        <p>
          Lateralverde (en adelante, “Lateralverde” o “la Plataforma”) es un servicio digital operado por [Razón social / Nombre], con RUC [●], domicilio en [●], y correo de contacto [correo soporte].
        </p>
      </>
    ),
  },
  {
    title: "2. Objeto del servicio",
    content: (
      <>
        <p>
          Lateralverde ofrece una plataforma para:
        </p>
        <p>
          Buscar canchas / complejos deportivos.
        </p>
        <p>
          Solicitar y gestionar reservas (según disponibilidad y condiciones del establecimiento).
        </p>
        <p>
          Brindar herramientas de administración para Propietarios (gestión de canchas, horarios, reservas, información pública).
        </p>
        <p>
          Lateralverde no es propietario de la mayoría de canchas publicadas (salvo que se indique expresamente) y actúa como intermediario tecnológico.
        </p>
      </>
    ),
  },
  {
    title: "3. Usuarios y roles",
    content: (
      <>
        <p>
          En la Plataforma pueden existir, entre otros:
        </p>
        <ul>
          <li>Usuarios/Jugadores: buscan canchas y solicitan reservas.</li>
          <li>Propietarios/Administradores de complejos: publican información y gestionan reservas.</li>
          <li>Administrador de Plataforma: gestiona moderación, soporte y seguridad.</li>
        </ul>
      </>
    ),
  },
  {
    title: "4. Registro, acceso y veracidad",
    content: (
      <>
        <p>
          Al crear una cuenta o usar el servicio, te comprometes a:
        </p>
        <p>
          Proporcionar información veraz y actualizada.
        </p>
        <p>
          Mantener la confidencialidad de tus credenciales.
        </p>
        <p>
          Notificar a soporte si sospechas uso no autorizado.
        </p>
      </>
    ),
  },
  {
    title: "5. Reglas de uso",
    content: (
      <>
        <p>Está prohibido:</p>
        <ul>
          <li>Publicar contenido falso, engañoso o que infrinja derechos de terceros.</li>
          <li>Suplantar identidades o manipular reservas de mala fe.</li>
          <li>Intentar vulnerar la seguridad, hacer scraping abusivo o afectar la operación del servicio.</li>
        </ul>
        <p>Lateralverde podrá restringir o suspender cuentas ante indicios razonables de incumplimiento.</p>
      </>
    ),
  },
  {
    title: "6. Publicaciones y contenido del Propietario",
    content: (
      <>
        <p>El Propietario es responsable por:</p>
        <p>Precios, horarios, disponibilidad, reglas del local, fotos y descripciones.</p>
        <p>Contar con permisos necesarios para publicar imágenes y marcas.</p>
        <p>Mantener información actualizada y coherente con la realidad del servicio.</p>
        <p>Lateralverde puede moderar, ocultar o retirar contenido si infringe estos Términos o la ley.</p>
      </>
    ),
  },
  {
    title: "7. Reservas, disponibilidad y confirmación",
    content: (
      <>
        <p>La reserva puede ser “solicitada” y quedar pendiente de confirmación del complejo (según el flujo que uses).</p>
        <p>La disponibilidad final depende del establecimiento y puede variar por mantenimiento, clima, eventos u otros factores.</p>
        <p>Lateralverde no garantiza que toda solicitud termine en reserva confirmada. (Ver “Aviso de responsabilidad”.)</p>
      </>
    ),
  },
  {
    title: "8. Planes, pagos y servicios (si aplica)",
    content: (
      <>
        <p>Si la Plataforma ofrece planes (p.ej., Free/Pro/Empresarial):</p>
        <p>Los beneficios y límites del plan se mostrarán dentro del panel.</p>
        <p>Los precios, vigencia, renovaciones o cambios se comunicarán por la web/app y/o correo.</p>
      </>
    ),
  },
  {
    title: "9. Cancelaciones y reembolsos (si aplica)",
    content: (
      <>
        <p>Los reembolsos se rigen por la Política de Reembolsos publicada en la Plataforma. (Link en el footer.)</p>
      </>
    ),
  },
  {
    title: "10. Propiedad intelectual",
    content: (
      <>
        <p>La marca Lateralverde, el diseño, software y contenidos propios están protegidos. Se prohíbe copiar o explotar comercialmente sin autorización.</p>
      </>
    ),
  },
  {
    title: "11. Limitación de responsabilidad",
    content: (
      <>
        <p>Lateralverde brinda el servicio “tal cual” y “según disponibilidad”. No se responsabiliza por:</p>
        <ul>
          <li>La calidad del servicio prestado por terceros (complejos/canchas).</li>
          <li>Cancelaciones, cambios de horario, condiciones climáticas, decisiones del establecimiento.</li>
          <li>Pérdidas indirectas derivadas del uso de la Plataforma.</li>
        </ul>
      </>
    ),
  },
  {
    title: "12. Protección de datos",
    content: (
      <>
        <p>El tratamiento de datos personales se rige por la Política de Privacidad y la normativa aplicable (Ley N.° 29733 y reglamento vigente).</p>
      </>
    ),
  },
  {
    title: "13. Cambios en los términos",
    content: (
      <>
        <p>Lateralverde puede actualizar estos Términos. La versión vigente se publicará en la web con su fecha de actualización.</p>
      </>
    ),
  },
  {
    title: "14. Ley aplicable y jurisdicción",
    content: (
      <>
        <p>Estos términos se rigen por las leyes de la República del Perú. Cualquier controversia se someterá a los jueces y tribunales de [Lima u otra ciudad], salvo norma imperativa distinta.</p>
      </>
    ),
  },
];

export const metadata = {
  title: "Lateralverde | Términos y Condiciones",
  description: "Términos y condiciones del servicio Lateralverde.",
};

export default function PageTerminos() {
  return (
    <LegalPage
      title="Términos y Condiciones — Lateralverde"
      description="Lee las condiciones que aplican al uso de la plataforma Lateralverde."
      updated="27/01/2026"
      sections={sections}
    />
  );
}
