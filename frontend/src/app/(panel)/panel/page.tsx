import SeccionPanel from "@/secciones/SeccionPanel/SeccionPanel";

export const metadata = {
    robots: {
        index: false,
        follow: false,
    },
};

export default function PanelPage() {
    return (
        <main className="fondoSeccion fondoA espaciadoSeccion" style={{ marginTop: "0", padding: 0 }}>
            <SeccionPanel />
        </main>
    );
}
