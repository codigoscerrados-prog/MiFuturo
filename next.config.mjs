/** @type {import('next').NextConfig} */

const API_ORIGIN =
    process.env.API_ORIGIN ||
    process.env.NEXT_PUBLIC_API_ORIGIN ||
    "http://127.0.0.1:8000";

const u = new URL(API_ORIGIN);
const proto = u.protocol.replace(":", "");

function backendPattern(pathname) {
    return {
        protocol: proto,
        hostname: u.hostname,
        ...(u.port ? { port: u.port } : {}),
        pathname,
    };
}

const nextConfig = {
    images: {
        remotePatterns: [
            backendPattern("/static/**"),
            backendPattern("/uploads/**"),
            // si usas otra ruta:
            // backendPattern("/media/**"),
        ],
    },

    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: `${API_ORIGIN}/:path*`,
            },
        ];
    },
};

export default nextConfig;
