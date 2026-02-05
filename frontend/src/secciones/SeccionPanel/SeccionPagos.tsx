"use client";

import { useEffect, useState } from "react";
import styles from "./SeccionPagos.module.css";
import { apiFetch, apiUrl } from "@/lib/api";

type PagoRow = {
    id: number;
    cancha: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    precio: number;
    metodo?: string | null;
    referencia?: string | null;
};

type PagosPage = {
    items: any[];
    total: number;
    page: number;
    page_size: number;
};

function formatDateLabel(value?: string | null) {
    if (!value) return "-";
    const d = new Date(value);
    return d.toLocaleDateString("es-PE");
}

function formatTimeLabel(value?: string | null) {
    if (!value) return "-";
    const d = new Date(value);
    return d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

function formatMoney(value: number) {
    if (!Number.isFinite(value)) return "S/ 0.00";
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);
}

export default function SeccionPagos({ token }: { token: string }) {
    const [rows, setRows] = useState<PagoRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDateStart, setFilterDateStart] = useState("");
    const [filterDateEnd, setFilterDateEnd] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [total, setTotal] = useState(0);

    function buildQuery(includePaging = true) {
        const params = new URLSearchParams();
        const term = searchTerm.trim();
        if (term) params.set("search", term);
        if (filterDateStart) params.set("fecha_inicio", filterDateStart);
        if (filterDateEnd) params.set("fecha_fin", filterDateEnd);
        if (includePaging) {
            params.set("page", String(page));
            params.set("page_size", String(pageSize));
        }
        const qs = params.toString();
        return qs ? `?${qs}` : "";
    }

    async function handleExport(format: "excel" | "pdf") {
        const extension = format === "excel" ? "xlsx" : "pdf";
        const url = apiUrl(`/panel/pagos/export.${extension}${buildQuery(false)}`);
        try {
            setError(null);
            const res = await fetch(url, {
                headers: {
                    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
                },
            });
            if (!res.ok) {
                const msg = await res.text().catch(() => "");
                throw new Error(msg || `No se pudo exportar (${res.status}).`);
            }

            const blob = await res.blob();
            const disposition = res.headers.get("content-disposition") || "";
            const match = disposition.match(/filename="?([^"]+)"?/i);
            const filename = match?.[1] || `pagos_culqi.${extension}`;

            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(link.href);
        } catch (e: any) {
            setError(e?.message || "No se pudo exportar el archivo.");
        }
    }

    useEffect(() => {
        setPage(1);
    }, [searchTerm, filterDateStart, filterDateEnd]);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);
        apiFetch<PagosPage | any[]>(`/panel/pagos${buildQuery(true)}`, { token })
            .then((data) => {
                if (!active) return;
                const array = Array.isArray(data) ? data : (data as PagosPage).items || [];
                if (!Array.isArray(data)) {
                    const pageData = data as PagosPage;
                    setTotal(Number(pageData.total || 0));
                    setPage(Number(pageData.page || 1));
                } else {
                    setTotal(array.length);
                }
                const normalized = array.map((item) => {
                    const start = (item as any).start_at || (item as any).fecha_inicio || null;
                    const end = (item as any).end_at || (item as any).fecha_fin || null;
                    const precioRaw = Number((item as any).total_amount ?? 0);
                    return {
                        id: item.id,
                        cancha:
                            (item as any).cancha_nombre ||
                            (item as any).cancha?.nombre ||
                            String((item as any).cancha_id || "-"),
                        fecha: formatDateLabel(start),
                        hora_inicio: formatTimeLabel(start),
                        hora_fin: formatTimeLabel(end),
                        precio: Number.isFinite(precioRaw) ? precioRaw : 0,
                        metodo: (item as any).payment_method || null,
                        referencia: (item as any).payment_ref || null,
                    };
                });
                setRows(normalized);
            })
            .catch((e: any) => {
                if (!active) return;
                setError(e?.message || "No se pudo cargar pagos.");
            })
            .finally(() => {
                if (!active) return;
                setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [token, searchTerm, filterDateStart, filterDateEnd, page, pageSize]);

    return (
        <section className={styles.seccion}>
            <div className={styles.head}>
                <h2 className={styles.titulo}>Pagos Culqi</h2>
                <p className={styles.subtitulo}>Pagos recibidos por reservas online.</p>
            </div>

            {error ? <div className={styles.alertError}>{error}</div> : null}

            <div className={styles.filters}>
                <label className={styles.filterField}>
                    <span>Buscar</span>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="cancha o referencia"
                    />
                </label>
                <label className={styles.filterField}>
                    <span>Desde</span>
                    <input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} />
                </label>
                <label className={styles.filterField}>
                    <span>Hasta</span>
                    <input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} />
                </label>
                <button type="button" className={styles.btnGhost} onClick={() => {
                    setSearchTerm("");
                    setFilterDateStart("");
                    setFilterDateEnd("");
                    setPage(1);
                }}>
                    Limpiar
                </button>
            </div>

            <div className={styles.exports}>
                <button type="button" className={styles.btn} onClick={() => handleExport("excel")}>
                    Exportar Excel
                </button>
                <button type="button" className={styles.btnGhost} onClick={() => handleExport("pdf")}>
                    Exportar PDF
                </button>
            </div>

            <div className={styles.pagination}>
                <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                >
                    Anterior
                </button>
                <span className={styles.pageInfo}>
                    Página {page} de {Math.max(1, Math.ceil(total / pageSize))}
                </span>
                <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= Math.ceil(total / pageSize)}
                >
                    Siguiente
                </button>
            </div>

            {loading ? (
                <p>Cargando...</p>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Cancha</th>
                                <th>Fecha</th>
                                <th>Hora inicio</th>
                                <th>Hora fin</th>
                                <th>Monto</th>
                                <th>Método</th>
                                <th>Referencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className={styles.empty}>
                                        No hay pagos registrados.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row, idx) => (
                                    <tr key={`${row.id}-${idx}`}>
                                        <td>{idx + 1}</td>
                                        <td>{row.cancha}</td>
                                        <td>{row.fecha}</td>
                                        <td>{row.hora_inicio}</td>
                                        <td>{row.hora_fin}</td>
                                        <td>{formatMoney(row.precio)}</td>
                                        <td>{row.metodo || "-"}</td>
                                        <td>{row.referencia || "-"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
