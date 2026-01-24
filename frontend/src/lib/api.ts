// src/lib/api.ts

function normalizeOrigin(origin: string) {
    return origin.replace(/\/+$/, "");
}

function normalizePrefix(prefix: string) {
    if (!prefix) return "";
    if (!prefix.startsWith("/")) prefix = `/${prefix}`;
    return prefix.replace(/\/+$/, "");
}

/**
 * ✅ Por defecto: misma-origen usando proxy Next (/api)
 * - NEXT_PUBLIC_API_ORIGIN = ""  (o no definir)
 * - NEXT_PUBLIC_API_PREFIX = "/api" (por defecto)
 */
export function apiUrl(path: string) {
    const origin = normalizeOrigin(process.env.NEXT_PUBLIC_API_ORIGIN || "");
    const envPrefix = process.env.NEXT_PUBLIC_API_PREFIX;
    const defaultPrefix = origin ? "" : "/api";
    const prefix = normalizePrefix(envPrefix !== undefined ? envPrefix : defaultPrefix);

    if (!path.startsWith("/")) path = `/${path}`;
    const finalPath = `${prefix}${path}`;

    return `${origin}${finalPath}`;
}

function normalizeMediaPath(path: string) {
    let normalized = path.startsWith("/") ? path : `/${path}`;
    normalized = normalized.replace(/^\/api\/?/, "/");
    normalized = normalized.replace(/^\/+/, "/");
    return `/api${normalized}`;
}

type MediaUrlOptions = {
    forceProxy?: boolean;
};

export function mediaUrl(value?: string | null, fallback?: string | null, options?: MediaUrlOptions): string | null {
    const trimmed = (value || "").trim();
    if (!trimmed) return fallback ?? null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith("//")) return `https:${trimmed}`;
    const shouldProxy =
        options?.forceProxy ??
        /^(\/uploads\/|uploads\/|\/static\/|static\/|\/media\/|media\/|\/files\/|files\/)/i.test(trimmed);
    if (!shouldProxy) {
        return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    }
    return normalizeMediaPath(trimmed);
}

type ApiFetchOpts = {
    token?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: BodyInit | null;
    cache?: RequestCache;
    signal?: AbortSignal | null;
};

export async function apiFetch<T>(path: string, opts: ApiFetchOpts = {}): Promise<T> {
    const { token, method = "GET", headers = {}, body = null, cache = "no-store" } = opts;

    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

    const finalHeaders: Record<string, string> = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
    };

    if (body && !isFormData && !finalHeaders["Content-Type"]) {
        finalHeaders["Content-Type"] = "application/json";
    }

    const res = await fetch(apiUrl(path), {
        method,
        headers: finalHeaders,
        body,
        cache,
        signal: signal ?? undefined,
    });


    if (!res.ok) {
        let msg = `Error ${res.status}`;
        try {
            const data = await res.json();
            const detail = data?.detail;
            if (typeof detail === "string") {
                msg = detail;
            } else if (detail != null) {
                msg = JSON.stringify(detail);
            } else if (typeof data?.message === "string") {
                msg = data.message;
            }
        } catch { }
        throw new Error(msg);
    }

    // si es 204 no hay json
    if (res.status === 204) return null as T;

    return (await res.json()) as T;
}
