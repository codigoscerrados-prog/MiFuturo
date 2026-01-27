import SeccionContactanos from "@/secciones/SeccionContactanos/SeccionContactanos";

interface PageProps {
    searchParams?: {
        motivo?: "ayuda" | "contacto" | "problema";
    };
}

export default function PageContactanos({ searchParams }: PageProps) {
    return (
        <main className="fondoSeccion fondoA espaciadoSeccion">
            <SeccionContactanos motivoQuery={searchParams?.motivo} />
        </main>
    );
}
