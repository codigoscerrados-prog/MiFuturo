import Link from "next/link";

export default function PageRegistrarse() {
    return (
        <main className="fondoSeccion fondoA espaciadoSeccion">
            <div className="container-xl py-2">
                <div className="row g-3">
                    <div className="col-12 col-lg-6">
                        <div className="card border-0 shadow-sm rounded-4 h-100 p-3">
                            <p className="text-uppercase fw-bold text-secondary small mb-2">Para usuarios</p>
                            <h2 className="h4 fw-bold">Crear cuenta de usuario</h2>
                            <p className="text-body-secondary mb-3">Reserva canchas y organiza tus partidos en minutos.</p>
                            <Link className="btn btn-primary rounded-pill px-4" href="/registrarse/usuario">
                                Registrar usuario
                            </Link>
                        </div>
                    </div>
                    <div className="col-12 col-lg-6">
                        <div className="card border-0 shadow-sm rounded-4 h-100 p-3">
                            <p className="text-uppercase fw-bold text-secondary small mb-2">Para propietarios</p>
                            <h2 className="h4 fw-bold">Registrar complejo</h2>
                            <p className="text-body-secondary mb-3">Publica tu complejo y recibe reservas desde el panel.</p>
                            <Link className="btn btn-primary rounded-pill px-4" href="/registrarse/propietario">
                                Registrar propietario
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
