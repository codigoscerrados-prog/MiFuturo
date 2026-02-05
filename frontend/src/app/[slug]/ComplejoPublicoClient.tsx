"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import styles from "./page.module.css";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { SEO_DOMAIN } from "@/lib/seo";
import { publicImgUrl } from "@/lib/publicImage";
import ReservaWhatsappModal from "@/components/ReservaWhatsappModal";

const MapaComplejos = dynamic(() => import("@/secciones/BusquedaDeCancha/MapaComplejos"), { ssr: false }) as any;

type ComplejoImagen = {
    id: number;
    url: string;
    orden: number;
    is_cover: boolean;
};

type Cancha = {
    id: number;
    nombre: string;
    tipo: string;
    pasto: string;
    precio_hora: number;
    imagen_principal?: string | null;
};

type ComplejoPerfil = {
    id: number;
    nombre: string;
    slug: string;
    descripcion?: string | null;
    direccion?: string | null;
    distrito?: string | null;
    provincia?: string | null;
    departamento?: string | null;
    latitud?: number | null;
    longitud?: number | null;
    techada: boolean;
    iluminacion: boolean;
    vestuarios: boolean;
    estacionamiento: boolean;
    cafeteria: boolean;
    foto_url?: string | null;
    owner_phone?: string | null;
    culqi_enabled?: boolean | null;
    culqi_pk?: string | null;
    imagenes: ComplejoImagen[];
    canchas: Cancha[];
    caracteristicas: string[];
    likes_count: number;
    liked_by_me: boolean;
    is_owner: boolean;
};

type LikeResp = {
    likes_count: number;
    liked_by_me: boolean;
};

function normalizarTelefono(raw: string | null | undefined) {
    const t = (raw || "").trim();
    if (!t) return null;

    const digits = t.replace(/[^\d]/g, "");
    if (!digits) return null;

    if (digits.length === 9 && digits.startsWith("9")) return `51${digits}`;
    if (digits.length >= 10) return digits;

    return null;
}

function sanitizeHtml(value?: string | null) {
    if (!value) return "";
    let html = value;
    html = html.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script>/gi, "");
    html = html.replace(/\son\w+="[^"]*"/gi, "");
    html = html.replace(/\son\w+='[^']*'/gi, "");
    html = html.replace(/\son\w+=\S+/gi, "");
    html = html.replace(/javascript:/gi, "");
    return html;
}

function buildDescDoc(raw?: string | null) {
    const safe = sanitizeHtml(raw);
    return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { margin: 0 !important; padding: 0 !important; height: auto !important; overflow: visible !important; }
      body { min-height: 0 !important; color: #0b162f; }
      img, video { max-width: 100% !important; height: auto !important; }
      * { box-sizing: border-box; }
    </style>
  </head>
  <body>${safe}</body>
</html>`;
}

export default function ComplejoPublicoPage() {
    const params = useParams();
    const slug = Array.isArray(params?.slug) ? params?.slug[0] : (params?.slug as string | undefined);
    const PRECIO_MAX_VISIBLE = 300;

    const [data, setData] = useState<ComplejoPerfil | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [likePending, setLikePending] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState(0);
    const [reserveOpen, setReserveOpen] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [likes, setLikes] = useState(0);
    const [liked, setLiked] = useState(false);
    const descFrameRef = useRef<HTMLIFrameElement | null>(null);
    const descWrapRef = useRef<HTMLDivElement | null>(null);
    const descObserverRef = useRef<ResizeObserver | null>(null);
    const descMutationRef = useRef<MutationObserver | null>(null);

    useEffect(() => {
        if (!slug) return;
        const t = getToken();
        setToken(t);
        setLoading(true);
        setError(null);

        apiFetch<ComplejoPerfil>(`/public/complejos/${slug}`, { token: t || undefined })
            .then((res) => {
                setData(res);
                setLikes(res.likes_count);
                setLiked(res.liked_by_me);
            })
            .catch((e: any) => {
                setError(e?.message || "No se pudo cargar el complejo.");
            })
            .finally(() => setLoading(false));
    }, [slug]);

    const syncDescHeight = () => {
        const iframe = descFrameRef.current;
        const wrap = descWrapRef.current;
        if (!iframe) return;
        try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!doc) return;
            iframe.style.height = "1px";
            const height = doc.documentElement.scrollHeight || doc.body?.scrollHeight || 0;
            if (height) {
                iframe.style.height = `${height}px`;
                if (wrap) wrap.style.height = `${height}px`;
            }
        } catch {
            // ignore
        }
    };

    const syncDescHeightBurst = () => {
        syncDescHeight();
        window.setTimeout(syncDescHeight, 200);
        window.setTimeout(syncDescHeight, 800);
    };

    useEffect(() => {
        if (!data?.descripcion) return;
        const t = window.setTimeout(syncDescHeightBurst, 0);
        const onResize = () => syncDescHeight();
        window.addEventListener("resize", onResize);
        return () => {
            window.clearTimeout(t);
            window.removeEventListener("resize", onResize);
        };
    }, [data?.descripcion]);

    useEffect(() => {
        const iframe = descFrameRef.current;
        if (!data?.descripcion || !iframe) return;
        try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!doc) return;
            descObserverRef.current?.disconnect();
            descMutationRef.current?.disconnect();
            const observer = new ResizeObserver(() => syncDescHeight());
            observer.observe(doc.documentElement);
            descObserverRef.current = observer;
            const mutation = new MutationObserver(() => syncDescHeight());
            if (doc.body) mutation.observe(doc.body, { childList: true, subtree: true, attributes: true });
            descMutationRef.current = mutation;
            syncDescHeightBurst();
            return () => {
                observer.disconnect();
                mutation.disconnect();
            };
        } catch {
            return;
        }
    }, [data?.descripcion]);

    useEffect(() => {
        if (typeof document === "undefined") return;
        document.body.classList.add("lv-nav-hero");
        return () => {
            document.body.classList.remove("lv-nav-hero");
        };
    }, []);

    useEffect(() => {
        const modalOpen = galleryOpen || reserveOpen;
        if (!modalOpen) return;

        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setGalleryOpen(false);
                setReserveOpen(false);
            }
        };

        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [galleryOpen, reserveOpen]);

    const gallery = useMemo(() => {
        if (!data) return [];
        if (data.imagenes && data.imagenes.length > 0) return data.imagenes;
        if (data.foto_url) return [{ id: -1, url: data.foto_url, orden: 0, is_cover: true }];
        return [];
    }, [data]);

    const collage = gallery.slice(0, 4);
    const extraCount = Math.max(0, gallery.length - 4);
    const activeGallery = useMemo(() => {
        if (!gallery.length) return null;
        const idx = Math.min(Math.max(galleryIndex, 0), gallery.length - 1);
        return gallery[idx];
    }, [gallery, galleryIndex]);

    const features = useMemo(() => {
        if (!data) return [];
        if (data.caracteristicas && data.caracteristicas.length > 0) return data.caracteristicas;
        const list: string[] = [];
        if (data.techada) list.push("Techada");
        if (data.iluminacion) list.push("Iluminacion");
        if (data.vestuarios) list.push("Vestuarios");
        if (data.estacionamiento) list.push("Estacionamiento");
        if (data.cafeteria) list.push("Cafeteria");
        return list;
    }, [data]);

    const zona = useMemo(() => {
        if (!data) return "";
        return [data.distrito, data.provincia, data.departamento].filter(Boolean).join(", ");
    }, [data]);

    const precioStats = useMemo(() => {
        if (!data || !data.canchas || data.canchas.length === 0) return { min: 0, max: 0 };
        const precios = data.canchas.map((c) => Number(c.precio_hora || 0));
        return { min: Math.min(...precios), max: Math.max(...precios) };
    }, [data]);

    const structuredData = useMemo(() => {
        if (!data) return null;
        const phoneRaw = normalizarTelefono(data.owner_phone);
        const phone = phoneRaw ? (phoneRaw.startsWith("+") ? phoneRaw : `+${phoneRaw}`) : undefined;
        const zone = [data.distrito, data.provincia, data.departamento].filter(Boolean).join(", ");
        const schema: Record<string, unknown> = {
            "@context": "https://schema.org",
            "@type": "SportsActivityLocation",
            name: data.nombre,
            url: slug ? `${SEO_DOMAIN}/${slug}` : SEO_DOMAIN,
            description: data.descripcion || `Reserva una cancha en ${data.nombre}.`,
            image: publicImgUrl(data.foto_url || data.imagenes?.[0]?.url) || `${SEO_DOMAIN}/og-default.png`,
            address: {
                "@type": "PostalAddress",
                streetAddress: data.direccion || "",
                addressLocality: data.distrito || "",
                addressRegion: data.provincia || "",
                addressCountry: "Perú",
            },
        };
        if (phone) schema.telephone = phone;
        if (data.latitud != null && data.longitud != null) {
            schema.geo = {
                "@type": "GeoCoordinates",
                latitude: data.latitud,
                longitude: data.longitud,
            };
            schema.hasMap = `https://www.google.com/maps/search/?api=1&query=${data.latitud},${data.longitud}`;
        }
        const breadcrumb = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
                {
                    "@type": "ListItem",
                    position: 1,
                    name: "Inicio",
                    item: SEO_DOMAIN,
                },
                {
                    "@type": "ListItem",
                    position: 2,
                    name: "Buscar canchas",
                    item: `${SEO_DOMAIN}/buscar`,
                },
                {
                    "@type": "ListItem",
                    position: 3,
                    name: data.nombre,
                    item: slug ? `${SEO_DOMAIN}/${slug}` : SEO_DOMAIN,
                },
            ],
        };
        return JSON.stringify([schema, breadcrumb]);
    }, [data, slug]);

    async function handleShare() {
        if (!data) return;
        const url = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({ title: data.nombre, url });
                return;
            }
            await navigator.clipboard.writeText(url);
            setToast("Link copiado.");
        } catch {
            setToast("No se pudo compartir el link.");
        }
    }

    async function handleToggleLike() {
        if (!data) return;
        if (!token) {
            setToast("Inicia sesion para dar me gusta.");
            return;
        }
        setLikePending(true);
        const prevLiked = liked;
        const prevLikes = likes;
        setLiked(!prevLiked);
        setLikes(prevLiked ? prevLikes - 1 : prevLikes + 1);

        try {
            const res = await apiFetch<LikeResp>(`/complejos/${data.id}/like`, {
                token,
                method: "POST",
            });
            setLikes(res.likes_count);
            setLiked(res.liked_by_me);
        } catch (e: any) {
            setLiked(prevLiked);
            setLikes(prevLikes);
            setToast(e?.message || "No se pudo actualizar el like.");
        } finally {
            setLikePending(false);
        }
    }

    function abrirReserva() {
        if (!data) return;
        setGalleryOpen(false);
        setReserveOpen(true);
    }

    function cerrarReserva() {
        setReserveOpen(false);
    }

    if (loading) {
        return <div className={styles.page}>Cargando...</div>;
    }

    if (error || !data) {
        return <div className={styles.page}>{error || "Complejo no encontrado."}</div>;
    }

    return (
        <div className={styles.page}>
            {structuredData ? (
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
            ) : null}
            <div className={styles.container}>
                <header className={styles.header}>
                    <div>
                        <p className={styles.kicker}>Perfil público</p>
                        <h1 className={styles.title}>{data.nombre}</h1>
                        {zona ? <p className={styles.subtitle}>{zona}</p> : null}
                    </div>

                    <div className={styles.actionsHint}>
                        <span className={styles.statBadge}>{data.canchas?.length || 0} canchas</span>
                        {precioStats.max ? (
                            <span className={styles.statBadge}>
                                S/ {Math.min(precioStats.min, Math.min(precioStats.max, PRECIO_MAX_VISIBLE)).toFixed(0)} –{" "}
                                {Math.min(precioStats.max, PRECIO_MAX_VISIBLE).toFixed(0)} /h
                            </span>
                        ) : null}
                    </div>
                </header>

                <section className={styles.heroGrid}>
                    <div className={styles.collageSection}>
                        {collage.length > 0 ? (
                            <>
                                <div className={styles.collageGrid}>
                                    {collage.slice(0, 4).map((img, idx) => {
                                        const isLast = idx === 3;
                                        return (
                                            <button
                                                type="button"
                                                key={img.id}
                                                className={styles.collageItem}
                                                onClick={() => {
                                                    setGalleryIndex(idx);
                                                    setGalleryOpen(true);
                                                }}
                                            >
                                                <img src={publicImgUrl(img.url)} alt={data.nombre} />
                                                {isLast && extraCount > 0 ? (
                                                    <span className={styles.collageOverlay}>+{extraCount}</span>
                                                ) : null}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className={styles.viewAllRow}>
                                    <button
                                        type="button"
                                        className={styles.viewAll}
                                        onClick={() => {
                                            setGalleryIndex(0);
                                            setGalleryOpen(true);
                                        }}
                                    >
                                        Ver todas
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.viewAllMobile}
                                        onClick={() => {
                                            setGalleryIndex(0);
                                            setGalleryOpen(true);
                                        }}
                                    >
                                        Ver fotos ({gallery.length})
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className={styles.collageEmpty}>Sin fotos aun</div>
                        )}
                    </div>

                    <aside className={styles.infoPanel}>
                        {features.length > 0 ? (
                            <div className={styles.infoBlock}>
                                <h2 className={styles.sectionTitle}>Caracteristicas</h2>
                                <div className={styles.chips}>
                                    {features.map((f) => (
                                        <span key={f} className={styles.chip}>
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {data.canchas && data.canchas.length > 0 ? (
                            <div className={styles.infoBlock}>
                                <h2 className={styles.sectionTitle}>Canchas</h2>
                                <div className={styles.canchasGrid}>
                                    {data.canchas.map((c) => (
                                        <article key={c.id} className={styles.canchaCard}>
                                            <div className={styles.canchaBody}>
                                                <span className={styles.canchaTag}>{data.nombre}</span>
                                                <h3 className={styles.canchaName}>{c.nombre}</h3>
                                                <p className={styles.canchaMeta}>
                                                    {c.tipo} - {c.pasto}
                                                </p>
                                                <p className={styles.canchaPrice}>S/ {Number(c.precio_hora || 0).toFixed(0)} /h</p>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        <div className={styles.actionBar}>
                            <button type="button" className={styles.actionBtn} onClick={handleShare} title="Compartir">
                                <i className="bi bi-share" aria-hidden="true"></i>
                                Compartir
                            </button>

                            <button
                                type="button"
                                className={`${styles.actionBtn} ${liked ? styles.actionBtnActive : ""}`}
                                onClick={handleToggleLike}
                                disabled={likePending}
                                title="Me gusta"
                            >
                                <i className={`bi ${liked ? "bi-heart-fill" : "bi-heart"}`} aria-hidden="true"></i>
                                Me gusta
                                <span className={styles.likeCount}>{likes}</span>
                            </button>

                            {data.is_owner ? (
                                <Link href={`/panel/complejos/${data.id}/editar`} className={styles.actionBtn}>
                                    <i className="bi bi-pencil-square" aria-hidden="true"></i>
                                    Editar
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                                    onClick={abrirReserva}
                                >
                                    <i className="bi bi-calendar2-plus" aria-hidden="true"></i>
                                    Reservar
                                </button>
                            )}
                        </div>
                    </aside>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Descripcion</h2>
                    {data.descripcion ? (
                        <div className={styles.htmlPreview} ref={descWrapRef}>
                            <iframe
                                className={styles.htmlFrame}
                                sandbox="allow-same-origin allow-forms allow-popups"
                                srcDoc={buildDescDoc(data.descripcion)}
                                ref={descFrameRef}
                                onLoad={syncDescHeightBurst}
                                scrolling="no"
                                title="Descripcion del complejo"
                            />
                        </div>
                    ) : (
                        <p className={styles.sectionText}>Sin descripcion.</p>
                    )}
                </section>

                {null}

                {data.latitud != null && data.longitud != null ? (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Ubicacion</h2>
                        <div className={styles.mapWrap}>
                            <MapaComplejos
                                complejos={[
                                    {
                                        id: data.id,
                                        nombre: data.nombre,
                                        zona,
                                        latitud: data.latitud,
                                        longitud: data.longitud,
                                        techada: data.techada,
                                        iluminacion: data.iluminacion,
                                        vestuarios: data.vestuarios,
                                        estacionamiento: data.estacionamiento,
                                        cafeteria: data.cafeteria,
                                        foto: publicImgUrl(data.foto_url || ""),
                                        precioMin: precioStats.min,
                                        precioMax: precioStats.max,
                                        canchasCount: data.canchas.length,
                                        propietarioPhone: null,
                                    },
                                ]}
                                onDetalles={() => null}
                                onReservar={() => abrirReserva()}
                            />
                        </div>
                    </section>
                ) : null}
            </div>

            <ReservaWhatsappModal
                open={reserveOpen}
                onClose={cerrarReserva}
                complejo={
                    data
                        ? {
                              nombre: data.nombre,
                              distrito: data.distrito ?? null,
                              provincia: data.provincia ?? null,
                              departamento: data.departamento ?? null,
                              verificado: Boolean(data.canchas?.length),
                              propietarioPhone: data.owner_phone ?? null,
                              precioMin: precioStats.min,
                              precioMax: precioStats.max,
                              culqiEnabled: Boolean(data.culqi_enabled),
                              culqiPk: data.culqi_pk ?? null,
                              canchas: data.canchas.map((c) => ({
                                  id: c.id,
                                  nombre: c.nombre,
                                  tipo: c.tipo,
                                  pasto: c.pasto,
                                  precioHora: c.precio_hora,
                              })),
                          }
                        : null
                }
            />

            {galleryOpen ? (
                <div className={styles.modal}>
                    <div className={styles.modalBackdrop} onClick={() => setGalleryOpen(false)} />
                    <div className={styles.modalBody}>
                        <div className={styles.modalHeader}>
                            <h3>Galeria</h3>
                            <button type="button" className={styles.modalClose} onClick={() => setGalleryOpen(false)}>
                                <i className="bi bi-x-lg" aria-hidden="true"></i>
                            </button>
                        </div>
                        {activeGallery ? (
                            <div className={styles.galleryMain}>
                                <img src={publicImgUrl(activeGallery.url)} alt={data.nombre} />
                            </div>
                        ) : null}
                        <div className={styles.galleryThumbs}>
                            {gallery.map((img, idx) => {
                                const active = idx === galleryIndex;
                                return (
                                    <button
                                        type="button"
                                        key={img.id}
                                        className={`${styles.galleryThumb} ${active ? styles.galleryThumbActive : ""}`}
                                        onClick={() => setGalleryIndex(idx)}
                                    >
                                        <img src={publicImgUrl(img.url)} alt={data.nombre} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : null}

            {toast ? (
                <div className={styles.toast} onAnimationEnd={() => setToast(null)}>
                    {toast}
                </div>
            ) : null}
        </div>
    );
}
