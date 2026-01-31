/** @type {import('next').NextConfig} */

const API_HOSTPORT = process.env.API_HOSTPORT;
const PUBLIC_API_ORIGIN =
    process.env.API_ORIGIN ||
    process.env.NEXT_PUBLIC_API_ORIGIN ||
    "http://127.0.0.1:8000";
const API_ORIGIN = API_HOSTPORT ? `http://${API_HOSTPORT}` : PUBLIC_API_ORIGIN;

const u = new URL(PUBLIC_API_ORIGIN);
const proto = u.protocol.replace(":", "");

function backendPattern(pathname) {
    return {
        protocol: proto,
        hostname: u.hostname,
        ...(u.port ? { port: u.port } : {}),
        pathname,
    };
}

function s3Pattern(hostname, pathname = "/**") {
    return {
        protocol: "https",
        hostname,
        pathname,
    };
}

const nextConfig = {
    images: {
        remotePatterns: [
            backendPattern("/static/**"),
            backendPattern("/uploads/**"),
            s3Pattern("mifuturo-saas-dev.s3.amazonaws.com"),
            s3Pattern("mifuturo-saas-dev.s3.us-east-1.amazonaws.com"),
            s3Pattern("mifuturo-saas-prod.s3.amazonaws.com"),
            s3Pattern("mifuturo-saas-prod.s3.us-east-1.amazonaws.com"),
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
