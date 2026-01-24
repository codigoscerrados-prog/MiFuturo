import { Suspense } from "react";
import GoogleCallbackClient from "./GoogleCallbackClient";

const fallback = (
    <section style={{ padding: "24px" }}>
        <h1>Procesando acceso...</h1>
        <p>Redirigiendo...</p>
    </section>
);

export default function GoogleCallbackPage() {
    return (
        <Suspense fallback={fallback}>
            <GoogleCallbackClient />
        </Suspense>
    );
}
