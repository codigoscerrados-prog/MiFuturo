import { Suspense } from "react";
import BusquedaPageClient from "./BusquedaPageClient";

const fallback = (
    <main style={{ marginTop: "65px" }}>
        <div className="contenedor">
            <p>Cargando búsqueda...</p>
        </div>
    </main>
);

export default function BusquedaPage() {
    return (
        <Suspense fallback={fallback}>
            <BusquedaPageClient />
        </Suspense>
    );
}
