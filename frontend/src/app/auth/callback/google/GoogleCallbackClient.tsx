"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getRoleFromToken, rutaPorRole, setToken } from "@/lib/auth";

function sanitizeNext(value: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
    if (trimmed.includes("://")) return null;
    return trimmed;
}

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
            const safeNext = sanitizeNext(next);
            const target = safeNext || rutaPorRole(role);
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
