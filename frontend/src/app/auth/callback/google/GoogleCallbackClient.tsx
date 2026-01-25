"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getRoleFromToken, rutaPorRole, setToken } from "@/lib/auth";

export default function GoogleCallbackClient() {
    const router = useRouter();
    const params = useSearchParams();
    const [error, setError] = useState("");

    useEffect(() => {
        const run = async () => {
            const token = params.get("token");
            const next = params.get("next");
            const needsProfile = params.get("needs_profile");

            if (!token) {
                setError("No se recibio el token de Google.");
                return;
            }

            setToken(token);

            const role = getRoleFromToken(token);
            const target = next || rutaPorRole(role);
            router.replace(target);
        };

        void run();
    }, [params, router]);

    return (
        <section style={{ padding: "24px" }}>
            <h1>Procesando acceso...</h1>
            {error ? <p>{error}</p> : <p>Redirigiendo...</p>}
        </section>
    );
}
