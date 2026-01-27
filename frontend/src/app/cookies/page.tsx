import LegalPage, { LegalSection } from "@/componentes/LegalPage/LegalPage";

const sections: LegalSection[] = [
  {
    title: "Política",
    content: (
      <>
        <p>Las cookies son pequeños archivos que se guardan en tu dispositivo para habilitar funciones, recordar preferencias o medir el uso del sitio.</p>
        <p>En Lateralverde usamos:</p>
        <ul>
          <li>Cookies esenciales (necesarias): permiten funciones básicas (sesión, seguridad, recordar tu elección de cookies). Estas normalmente pueden usarse sin pedir “aceptar” porque son necesarias para prestar el servicio.</li>
          <li>Cookies de analítica (opcionales): nos ayudan a entender el uso del sitio (solo se activan si aceptas).</li>
          <li>Cookies de marketing (opcionales): para publicidad personalizada (si algún día las usas, deben estar desactivadas por defecto hasta que acepten).</li>
        </ul>
      </>
    ),
  },
  {
    title: "Tu control",
    content: (
      <>
        <p>
          Al ingresar, verás un aviso para:
        </p>
        <p>Aceptar todas</p>
        <p>Rechazar no esenciales</p>
        <p>(Opcional) Configurar</p>
        <p>Puedes cambiar tu decisión en cualquier momento desde “Preferencias de cookies” en el footer.</p>
      </>
    ),
  },
  {
    title: "¿Es por defecto? ¿Debo sí o sí guardar cookies?",
    content: (
      <>
        <p>Por defecto recomendado: activar solo esenciales y no cargar analítica/marketing hasta que el usuario acepte.</p>
      </>
    ),
  },
  {
    title: "¿Guardar algo?",
    content: (
      <>
        <p>
          Sí: debes guardar la preferencia del usuario (por ejemplo, en una cookie o localStorage) para no preguntar en cada visita. Esa cookie de “consentimiento” se considera esencial porque recuerda la elección.
        </p>
      </>
    ),
  },
];

export const metadata = {
  title: "Lateralverde | Política de Cookies",
  description: "Cómo usamos y gestionamos las cookies en Lateralverde.",
};

export default function PageCookies() {
  return (
    <LegalPage
      title="Política de Cookies — Lateralverde"
      description="Entiende qué cookies usamos y cómo puedes configurar tu consentimiento."
      updated="27/01/2026"
      sections={sections}
    />
  );
}
