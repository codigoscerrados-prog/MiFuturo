import { NextRequest, NextResponse } from "next/server";

const ALLOWED_FORMATS: Record<string, string> = {
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pdf: "application/pdf",
};

export async function GET(req: NextRequest, context: { params: Promise<{ format: string }> }) {
    const params = await context.params;
    const format = params.format?.toLowerCase() ?? "";
    if (!Object.prototype.hasOwnProperty.call(ALLOWED_FORMATS, format)) {
        return NextResponse.json({ detail: "Formato no soportado" }, { status: 400 });
    }

    const token = req.cookies.get("token")?.value || req.headers.get("authorization") || "";
    const url = new URL(`/api/panel/reservas/export.${format}`, req.nextUrl.origin);
    url.search = req.nextUrl.search;

    const headers: Record<string, string> = {};
    if (token) {
        headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    }

    const res = await fetch(url, { headers });
    const body = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || ALLOWED_FORMATS[format];
    const disposition = res.headers.get("content-disposition") || `attachment; filename="reservas.${format}"`;

    return new NextResponse(body, {
        status: res.status,
        headers: {
            "Content-Type": contentType,
            "Content-Disposition": disposition,
        },
    });
}
