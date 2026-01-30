import { NextRequest, NextResponse } from "next/server";

function base64UrlToJson(b64url: string) {
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const bin = atob(b64 + pad);

    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text);
}

function getRoleFromJwt(token: string): string | null {
    try {
        const payload = token.split(".")[1];
        const data = base64UrlToJson(payload);
        return data?.role ?? null;
    } catch {
        return null;
    }
}

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.cookies.get("token")?.value;

    // Si no hay token, mandamos a login.
    if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = "/iniciar-sesion";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
    }

    // /admin/* solo para admin
    if (pathname.startsWith("/admin")) {
        const role = getRoleFromJwt(token);
        if (role !== "admin") {
            const url = req.nextUrl.clone();
            url.pathname = "/panel";
            url.search = "";
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/panel/:path*"],
};
