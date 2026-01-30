import { NextResponse } from "next/server";

type CallbackResponse = {
    access_token: string;
    token_type: string;
    needs_profile: boolean;
    next?: string;
};

function sanitizeNext(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
    if (trimmed.includes("://")) return null;
    return trimmed;
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
        return NextResponse.json({ error: "Codigo faltante" }, { status: 400 });
    }

    const exchangeParams = new URLSearchParams({
        code,
        mode: "json",
    });
    if (state) {
        exchangeParams.set("state", state);
    }
    const backendOrigin = (process.env.API_ORIGIN || "http://127.0.0.1:8000").replace(/\/$/, "");
    const exchangeUrl = new URL("/auth/google/callback", backendOrigin);
    exchangeUrl.search = exchangeParams.toString();

    const res = await fetch(exchangeUrl, { cache: "no-store" });
    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        return NextResponse.json({ error: txt || "Error al validar Google" }, { status: res.status });
    }

    const data = (await res.json()) as CallbackResponse & { next?: string };
    const siteUrl =
        process.env.NEXTAUTH_URL ||
        process.env.SITE_URL ||
        process.env.FRONTEND_ORIGIN ||
        process.env.BASE_URL ||
        "http://localhost:3000";
    const redirectBase = siteUrl.replace(/\/$/, "");
    const redirectUrl = new URL("/auth/callback/google", redirectBase);
    redirectUrl.searchParams.set("token", data.access_token);
    redirectUrl.searchParams.set("needs_profile", data.needs_profile ? "1" : "0");
    const safeNext = sanitizeNext(data.next);
    if (safeNext) {
        redirectUrl.searchParams.set("next", safeNext);
    }

    return NextResponse.redirect(redirectUrl);
}
