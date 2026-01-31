import SeccionRegistrarse from "@/secciones/SeccionRegistrarse/SeccionRegistrarse";

export default function PageRegistrarUsuario() {
    return (
        <main className="paginaBannerRegistro paginaBannerRegistroNoPad">
            <div className="fondoSeccion fondoA espaciadoSeccion">
                <SeccionRegistrarse
                    defaultRole="usuario"
                    mostrarRoles={false}
                    badge="Registro de usuario"
                    titulo="Crear cuenta de usuario"
                    subtitulo="Regístrate para reservar canchas en minutos."
                />
            </div>
        </main>
    );
}
