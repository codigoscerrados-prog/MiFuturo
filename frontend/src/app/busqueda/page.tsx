import { Suspense } from "react";
import BusquedaPageClient from "./BusquedaPageClient";
import { buildPageMetadata, SEO_DOMAIN } from "@/lib/seo";
import styles from "./page.module.css";

const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
        {
            "@type": "ListItem",
            position: 1,
            name: "Inicio",
            item: `${SEO_DOMAIN}/`,
        },
        {
            "@type": "ListItem",
            position: 2,
            name: "Buscar canchas",
            item: `${SEO_DOMAIN}/busqueda`,
        },
    ],
});

export const metadata = buildPageMetadata({
    title: "Buscar canchas sintéticas cerca de ti",
    description: "Filtra canchas por distrito, horario, precio y disponibilidad para reservar tu cancha sintética en Perú.",
    path: "/busqueda",
});

const fallback = (
    <main className={styles.page}>
        <div className="contenedor">
            <p>Cargando búsqueda...</p>
        </div>
    </main>
);

export default function BusquedaPage() {
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbSchema }} />
            <Suspense fallback={fallback}>
                <BusquedaPageClient />
            </Suspense>
        </>
    );
}
