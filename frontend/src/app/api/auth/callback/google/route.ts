import { NextResponse } from "next/server";

type CallbackResponse = {
    access_token: string;
    token_type: string;
    needs_profile: boolean;
    next?: string;
};

export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
        return NextResponse.json({ error: "Codigo faltante" }, { status: 400 });
    }

    const backendOrigin = (process.env.NEXT_PUBLIC_API_ORIGIN || "http://127.0.0.1:8000").replace(/\/$/, "");
    const exchangeParams = new URLSearchParams({
        code,
        mode: "json",
    });
    if (state) {
        exchangeParams.set("state", state);
    }
    const exchangeUrl = `${backendOrigin}/auth/google/callback?${exchangeParams.toString()}`;

    const res = await fetch(exchangeUrl, { cache: "no-store" });
    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        return NextResponse.json({ error: txt || "Error al validar Google" }, { status: res.status });
    }

    const data = (await res.json()) as CallbackResponse & { next?: string };
    const redirectUrl = new URL("/auth/callback/google", url.origin);
    redirectUrl.searchParams.set("token", data.access_token);
    redirectUrl.searchParams.set("needs_profile", data.needs_profile ? "1" : "0");
    if (data.next) {
        redirectUrl.searchParams.set("next", data.next);
    }

    return NextResponse.redirect(redirectUrl);
}
