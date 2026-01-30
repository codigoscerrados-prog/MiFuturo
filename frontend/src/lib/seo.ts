import type { Metadata } from "next";

export const SEO_DOMAIN = "https://lateralverde.com";
export const OG_IMAGE = "/og-default.png";

function canonicalUrl(path: string) {
    if (!path) path = "/";
    if (!path.startsWith("/")) path = `/${path}`;
    return new URL(path, SEO_DOMAIN).toString();
}

function absoluteImage(image?: string) {
    const target = image || OG_IMAGE;
    try {
        if (/^https?:\/\//i.test(target)) return target;
        return new URL(target, SEO_DOMAIN).toString();
    } catch {
        return target;
    }
}

type BuildPageMetadataArgs = {
    title: string;
    description: string;
    path?: string;
    image?: string;
    robots?: Metadata["robots"];
};

export function buildPageMetadata({
    title,
    description,
    path = "/",
    image,
    robots = { index: true, follow: true },
}: BuildPageMetadataArgs): Metadata {
    const canonical = canonicalUrl(path);
    const imageUrl = absoluteImage(image);

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url: canonical,
            siteName: "Lateral Verde",
            locale: "es_PE",
            type: "website",
            images: [
                {
                    url: imageUrl,
                    alt: title,
                    width: 1200,
                    height: 630,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [imageUrl],
        },
        alternates: {
            canonical,
        },
        robots,
    };
}
