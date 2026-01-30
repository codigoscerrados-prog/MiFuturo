import { NextResponse } from "next/server";

function sanitizeNext(value: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
    if (trimmed.includes("://")) return null;
    return trimmed;
}

function normalizeRole(value: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim().toLowerCase();
    return trimmed === "usuario" || trimmed === "propietario" ? trimmed : null;
}

export async function GET(request: Request) {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    if (!clientId) {
        return NextResponse.json({ error: "GOOGLE_CLIENT_ID no configurado" }, { status: 500 });
    }

    const url = new URL(request.url);
    const siteUrl =
        process.env.NEXTAUTH_URL ||
        process.env.SITE_URL ||
        process.env.FRONTEND_ORIGIN ||
        process.env.BASE_URL ||
        "http://localhost:3000";
    const normalizedSiteUrl = siteUrl.replace(/\/$/, "");
    const redirectUri = `${normalizedSiteUrl}/api/auth/callback/google`;

    const statePayload: Record<string, string> = {};
    const role = normalizeRole(url.searchParams.get("role"));
    if (role) statePayload.role = role;
    const next = sanitizeNext(url.searchParams.get("next"));
    if (next) statePayload.next = next;

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        prompt: "select_account",
    });

    if (Object.keys(statePayload).length > 0) {
        params.set("state", JSON.stringify(statePayload));
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return NextResponse.redirect(authUrl);
}
