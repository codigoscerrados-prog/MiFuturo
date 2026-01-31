import SeccionRegistrarse from "@/secciones/SeccionRegistrarse/SeccionRegistrarse";

export default function PageRegistrarPropietario() {
    return (
        <main className="paginaBannerRegistro paginaBannerRegistroNoPad">
            <div className="fondoSeccion fondoA espaciadoSeccion">
                <SeccionRegistrarse
                    defaultRole="propietario"
                    mostrarRoles={false}
                    compact
                    badge="Registro de propietario"
                    titulo="Registrar complejo"
                    subtitulo="Publica tu complejo y gestiona reservas desde tu panel."
                />
            </div>
        </main>
    );
}
