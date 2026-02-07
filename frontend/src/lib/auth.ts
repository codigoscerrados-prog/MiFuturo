const TOKEN_KEY = "token";

// Evento para que la UI (Navbar, etc.) se entere cuando cambia el login.
export const AUTH_CHANGED_EVENT = "pc_auth_changed";

function notifyAuthChanged() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

function isHttps() {
    if (typeof location === "undefined") return false;
    return location.protocol === "https:";
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
    if (typeof document === "undefined") return;
    const parts = [
        `${name}=${encodeURIComponent(value)}`,
        `Max-Age=${maxAgeSeconds}`,
        "Path=/",
        "SameSite=Lax",
    ];
    if (isHttps()) parts.push("Secure");
    document.cookie = parts.join("; ");
}

function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const cookies = document.cookie ? document.cookie.split("; ") : [];
    for (const c of cookies) {
        const idx = c.indexOf("=");
        const k = idx >= 0 ? c.slice(0, idx) : c;
        if (k === name) {
            const v = idx >= 0 ? c.slice(idx + 1) : "";
            try {
                return decodeURIComponent(v);
            } catch {
                return v;
            }
        }
    }
    return null;
}

function deleteCookie(name: string) {
    if (typeof document === "undefined") return;
    const parts = [`${name}=`, "Max-Age=0", "Path=/", "SameSite=Lax"];
    if (isHttps()) parts.push("Secure");
    document.cookie = parts.join("; ");
}

export function getToken(): string | null {
    if (typeof window === "undefined") return null;

    // Preferimos localStorage (más rápido) y si no, cookie (para middleware).
    try {
        const ls = localStorage.getItem(TOKEN_KEY);
        if (ls) return ls;
    } catch {
        // ignore
    }

    return getCookie(TOKEN_KEY);
}

export function setToken(token: string) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(TOKEN_KEY, token);
    } catch {
        // ignore
    }
    // 7 días
    setCookie(TOKEN_KEY, token, 60 * 60 * 24 * 7);
    notifyAuthChanged();
}

export function clearToken() {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(TOKEN_KEY);
    } catch {
        // ignore
    }
    deleteCookie(TOKEN_KEY);
    notifyAuthChanged();
}

function atobSafe(input: string) {
    // Browser / Edge
    if (typeof atob === "function") return atob(input);
    // Node
    const B = (globalThis as any).Buffer;
    if (!B) throw new Error("No atob/Buffer available");
    return B.from(input, "base64").toString("binary");
}

function base64UrlToJson(b64url: string) {
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const str = atobSafe(b64 + pad);
    return JSON.parse(str);
}

export function getRoleFromToken(token: string | null): string | null {
    if (!token) return null;
    try {
        const payload = token.split(".")[1];
        const data = base64UrlToJson(payload);
        return data?.role ?? null;
    } catch {
        return null;
    }
}

export function getUserIdFromToken(token: string | null): number | null {
    if (!token) return null;
    try {
        const payload = token.split(".")[1];
        const data = base64UrlToJson(payload);
        const sub = data?.sub;
        const n = typeof sub === "string" || typeof sub === "number" ? Number(sub) : NaN;
        return Number.isFinite(n) ? n : null;
    } catch {
        return null;
    }
}

export function getTokenExp(token: string | null): number | null {
    if (!token) return null;
    try {
        const payload = token.split(".")[1];
        const data = base64UrlToJson(payload);
        const exp = data?.exp;
        const n = typeof exp === "string" || typeof exp === "number" ? Number(exp) : NaN;
        return Number.isFinite(n) ? n : null;
    } catch {
        return null;
    }
}

export function isTokenExpired(token: string | null): boolean {
    const exp = getTokenExp(token);
    if (!exp) return false;
    const now = Math.floor(Date.now() / 1000);
    return exp <= now;
}

export function rutaPorRole(role: string | null): string {
    if (role === "admin") return "/admin/canchas";
    if (role === "propietario") return "/panel";
    if (role === "usuario") return "/panel";
    return "/";
}
