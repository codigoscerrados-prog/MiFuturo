import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "@/estilos/globales.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.min.css";

import BarraNavegacion from "@/componentes/BarraNavegacion/BarraNavegacion";
import PiePagina from "@/componentes/PiePagina/PiePagina";
import CookieConsent from "@/componentes/CookieConsent/CookieConsent";

const space = Space_Grotesk({
    subsets: ["latin"],
    display: "swap",
});

export const metadata: Metadata = {
    title: "Lateralverde | Reserva canchas y gestiona espacios",
    description: "Lateralverde ayuda a encontrar canchas, gestionar reservas y conectar con complejos deportivos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es">
            <body className={space.className}>
                <BarraNavegacion />
                {children}
                <PiePagina />
                <CookieConsent />
            </body>
        </html>
    );
}
