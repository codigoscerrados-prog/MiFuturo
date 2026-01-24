import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    if (!clientId) {
        return NextResponse.json({ error: "GOOGLE_CLIENT_ID no configurado" }, { status: 500 });
    }

    const siteUrl =
        process.env.NEXTAUTH_URL || process.env.SITE_URL || process.env.FRONTEND_ORIGIN || "http://localhost:3000";
    const redirectUri = `${siteUrl.replace(/\/$/, "")}/api/auth/callback/google`;

    const url = new URL(request.url);
    const statePayload: Record<string, string> = {};
    const role = url.searchParams.get("role");
    if (role) statePayload.role = role;
    const next = url.searchParams.get("next");
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
