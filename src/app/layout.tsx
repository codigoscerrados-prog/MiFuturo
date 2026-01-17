import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "@/estilos/globales.css";

import BarraNavegacion from "@/componentes/BarraNavegacion/BarraNavegacion";
import PiePagina from "@/componentes/PiePagina/PiePagina";

const space = Space_Grotesk({
    subsets: ["latin"],
    display: "swap",
});

export const metadata: Metadata = {
    title: "ProyectoCanchas",
    description: "Alquiler de canchas sintéticas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es">
            <body className={space.className}>
                <BarraNavegacion />
                {children}
                <PiePagina />
            </body>
        </html>
    );
}
