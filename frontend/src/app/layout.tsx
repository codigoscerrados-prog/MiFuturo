import type { Metadata } from "next";
import "@/estilos/globales.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.min.css";

import BarraNavegacion from "@/componentes/BarraNavegacion/BarraNavegacion";
import PiePagina from "@/componentes/PiePagina/PiePagina";
import CookieConsent from "@/componentes/CookieConsent/CookieConsent";

const DOMAIN = "https://lateralverde.pe";
const OG_IMAGE = "/og-default.png";
const globalStructuredData = JSON.stringify([
    {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "LateralVerde",
        url: DOMAIN,
        logo: `${DOMAIN}/logo_principal.svg`,
        contactPoint: [
            {
                "@type": "ContactPoint",
                telephone: "+51922023667",
                contactType: "customer support",
                areaServed: "PE",
                availableLanguage: "es",
            },
        ],
    },
    {
        "@context": "https://schema.org",
        "@type": "WebSite",
        url: DOMAIN,
        name: "LateralVerde",
        potentialAction: {
            "@type": "SearchAction",
            target: `${DOMAIN}/buscar?q={query}`,
            "query-input": "required name=query",
        },
    },
]);

export const metadata: Metadata = {
    metadataBase: new URL(DOMAIN),
    title: {
        default: "LateralVerde | Busca y reserva canchas sintéticas en Perú",
        template: "%s | LateralVerde",
    },
    description:
        "LateralVerde es el buscador y gestor de canchas sintéticas en Perú. Encuentra complejos, compara precios y reserva en segundos.",
    openGraph: {
        title: "LateralVerde | Encuentra canchas sintéticas y reserva en Perú",
        description:
            "Busca cancha por distrito, compara horarios y reserva en minutos. LateralVerde conecta jugadores y propietarios confiables.",
        url: DOMAIN,
        siteName: "LateralVerde",
        locale: "es_PE",
        type: "website",
        images: [
            {
                url: OG_IMAGE,
                width: 1200,
                height: 630,
                alt: "Reserva canchas sintéticas en LateralVerde",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "LateralVerde | Reserva canchas sintéticas en Perú",
        description: "Encuentra canchas cercanas, compara precios y confirma tu reserva con confianza.",
        images: [OG_IMAGE],
    },
    alternates: {
        canonical: DOMAIN,
    },
    icons: {
        icon: "/favicon.svg",
        shortcut: "/favicon.svg",
        apple: "/favicon.svg",
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es">
            <body>
                <BarraNavegacion />
                {children}
                <PiePagina />
                <CookieConsent />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: globalStructuredData }}
                />
            </body>
        </html>
    );
}
