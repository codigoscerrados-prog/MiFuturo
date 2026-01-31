"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./SeccionComplejos.module.css";
import { apiFetch, mediaUrl } from "@/lib/api";

/**
 * ✅ Objetivo:
 * - Reemplazar inputs de ciudad/distrito por selects dependientes (Departamento -> Provincia -> Distrito)
 * - Jalar datos desde tu API FastAPI:
 *    GET /ubigeo/departamentos
 *    GET /ubigeo/provincias?department_id=15
 *    GET /ubigeo/distritos?province_id=1501
 * - Guardar en tu tabla de complejos los NOMBRES:
 *    departamento (texto), ciudad (texto = provincia), distrito (texto)
 *   (sin obligarte a cambiar tu BD de complejos ahora)
 */

type PerfilMe = {
  id: number;
  username?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
};

type Complejo = {
  id: number;
  nombre: string;
  slug?: string | null;
  direccion: string;
  departamento: string; // ✅ se guarda como texto
  provincia: string; // ✅ lo usaremos como Provincia (nombre)
  distrito: string; // ✅ se guarda como texto

  latitud?: number | null;
  longitud?: number | null;

  owner_phone?: string | null;
  descripcion?: string | null;

  techada: boolean;
  iluminacion: boolean;
  vestuarios: boolean;
  estacionamiento: boolean;
  cafeteria: boolean;

  foto_url?: string | null;

  is_active: boolean;
};

/** ✅ Tipos para options del Ubigeo (lo que viene del backend) */
type DeptOpt = { id: string; name: string };
type ProvOpt = { id: string; name: string; department_id: string };
type DistOpt = {
  id: string;
  name: string | null;
  province_id: string | null;
  department_id: string | null;
};

type PlanActualOut = {
  plan_id: number;
  plan_codigo?: string | null;
  plan_nombre?: string | null;
  estado?: string | null;
};

const LS_COMPLEJO_ID = "panel_complejo_id";

/** ✅ Lee el complejo seleccionado desde LocalStorage para persistir selección */
function getStoredComplejoId(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(LS_COMPLEJO_ID);
  } catch {
    return null;
  }
}

/** ✅ Guarda el complejo seleccionado en LocalStorage */
function setStoredComplejoId(id: string) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_COMPLEJO_ID, id);
  } catch {
    // ignore
  }
}

function clearStoredComplejoId() {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(LS_COMPLEJO_ID);
  } catch {
    // ignore
  }
}

function resolveLimiteComplejos(plan: PlanActualOut | null) {
  const codigo = (plan?.plan_codigo || "").toLowerCase();
  const nombre = (plan?.plan_nombre || "").toLowerCase();
  if (codigo.includes("pro") || codigo.includes("premium") || nombre.includes("pro") || nombre.includes("premium")) {
    return 2;
  }
  return 1;
}

/** ✅ Convierte una ruta relativa (ej: /uploads/...) en URL pública completa */
function publicImgUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;

  const normalized = url.startsWith("/") ? url : `/${url}`;
  const isBackendPath = normalized.startsWith("/uploads/") || normalized.startsWith("/static/");
  if (isBackendPath) {
    return mediaUrl(normalized, normalized, { forceProxy: true }) || normalized;
  }
  return normalized;
}

/**
 * ✅ Form state:
 * - Guardamos NOMBRES: departamento/ciudad/distrito (esto se envía al backend)
 * - Guardamos IDs: departamento_id/provincia_id/distrito_id (solo para selects)
 */
const emptyForm = {
  nombre: "",
  direccion: "",

  // ✅ NOMBRES (estos se guardan en tu tabla de complejos)
  departamento: "",
  provincia: "", // (ciudad = provincia)
  distrito: "",

  // ✅ IDs (solo para selects; no es obligatorio enviarlos)
  departamento_id: "",
  provincia_id: "",
  distrito_id: "",

  ubicacion_lat: "",
  ubicacion_lng: "",
  telefono: "",
  descripcion: "",
  techada: false,
  iluminacion: true,
  vestuarios: false,
  estacionamiento: false,
  cafeteria: false,
  is_active: true,
  foto_url: null as string | null,
};

export default function SeccionComplejos({ token }: { token: string }) {
  // ✅ estados de UI
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // ✅ lista de complejos del propietario
  const [complejos, setComplejos] = useState<Complejo[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<string>(
    () => getStoredComplejoId() || ""
  );
  const [planActual, setPlanActual] = useState<PlanActualOut | null>(null);

  const limiteComplejos = useMemo(() => resolveLimiteComplejos(planActual), [planActual]);
  const puedeCrear = complejos.length < limiteComplejos;

  // ✅ form + foto
  const [form, setForm] = useState({ ...emptyForm });
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  // ✅ estados Ubigeo (options de selects)
  const [departamentos, setDepartamentos] = useState<DeptOpt[]>([]);
  const [provincias, setProvincias] = useState<ProvOpt[]>([]);
  const [distritos, setDistritos] = useState<DistOpt[]>([]);

  /** ✅ preview temporal de la foto antes de subirla */
  const fotoPreview = useMemo(() => {
    if (!fotoFile) return null;
    return URL.createObjectURL(fotoFile);
  }, [fotoFile]);

  /** ✅ liberar el objectURL cuando cambia o desmonta */
  useEffect(() => {
    return () => {
      if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    };
  }, [fotoPreview]);

  /** ✅ complejo actualmente seleccionado */
  const seleccionado = useMemo(() => {
    if (!seleccionadoId || seleccionadoId === "new") return null;
    return complejos.find((c) => String(c.id) === String(seleccionadoId)) || null;
  }, [complejos, seleccionadoId]);

  /** ✅ contador de complejos activos */
  const activasCount = useMemo(
    () => complejos.filter((c) => c.is_active).length,
    [complejos]
  );

  const publicUrl = useMemo(() => {
    if (!seleccionado?.slug) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return origin ? `${origin}/${seleccionado.slug}` : `/${seleccionado.slug}`;
  }, [seleccionado?.slug]);

  // =========================================================
  // ✅ UBIGEO: Fetch options (depa -> prov -> dist)
  // =========================================================

  /** ✅ trae departamentos (se carga una sola vez al inicio) */
  async function fetchDepartamentos() {
    const data = await apiFetch<DeptOpt[]>("/ubigeo/departamentos", { token });
    setDepartamentos(Array.isArray(data) ? data : []);
  }

  /** ✅ trae provincias según department_id */
  async function fetchProvincias(departmentId: string) {
    const data = await apiFetch<ProvOpt[]>(
      `/ubigeo/provincias?department_id=${departmentId}`,
      { token }
    );
    setProvincias(Array.isArray(data) ? data : []);
  }

  /** ✅ trae distritos según province_id */
  async function fetchDistritos(provinceId: string) {
    const data = await apiFetch<DistOpt[]>(
      `/ubigeo/distritos?province_id=${provinceId}`,
      { token }
    );
    setDistritos(Array.isArray(data) ? data : []);
  }

  async function fetchPlan() {
    try {
      const data = await apiFetch<PlanActualOut>("/perfil/plan", { token });
      setPlanActual(data || null);
    } catch {
      setPlanActual(null);
    }
  }

  // =========================================================
  // ✅ PANEL: Fetch de complejos
  // =========================================================

  /** ✅ carga lista de complejos y resuelve el seleccionado */
  async function fetchAll() {
    const list = await apiFetch<Complejo[]>("/panel/complejos", { token });
    const arr = Array.isArray(list) ? list : [];
    setComplejos(arr);

    // ✅ intenta mantener seleccionado el que ya estaba
    const stored = getStoredComplejoId();
    const isValidId = (id?: string | null) =>
      !!id && arr.some((c) => String(c.id) === String(id));

    const puedeCrearLocal = arr.length < limiteComplejos;
    let nextId = "";
    if (arr.length) {
      if (isValidId(seleccionadoId)) nextId = String(seleccionadoId);
      else if (isValidId(stored)) nextId = String(stored);
      else nextId = String(arr[0].id);
    } else if (puedeCrearLocal) {
      nextId = "new";
    }

    if (nextId !== String(seleccionadoId)) {
      setSeleccionadoId(nextId);
    }
    if (nextId === "new") clearStoredComplejoId();
    else setStoredComplejoId(nextId);
  }

  /** ✅ carga inicial: complejos + departamentos (en paralelo) */
  useEffect(() => {
    (async () => {
      try {
        setError(null);
        setCargando(true);
        await Promise.all([fetchAll(), fetchDepartamentos(), fetchPlan()]);
      } catch (e: any) {
        setError(e?.message || "No se pudo cargar complejos.");
      } finally {
        setCargando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cargando) return;
    const idValido = !!seleccionadoId && seleccionadoId !== "new" && complejos.some((c) => String(c.id) === String(seleccionadoId));
    if (seleccionadoId === "new" && !puedeCrear) {
      const fallback = complejos[0] ? String(complejos[0].id) : "";
      setSeleccionadoId(fallback);
      if (fallback) setStoredComplejoId(fallback);
      else clearStoredComplejoId();
      return;
    }
    if (!idValido && seleccionadoId !== "new") {
      const fallback = complejos[0] ? String(complejos[0].id) : puedeCrear ? "new" : "";
      setSeleccionadoId(fallback);
      if (fallback === "new") clearStoredComplejoId();
      else if (fallback) setStoredComplejoId(fallback);
      else clearStoredComplejoId();
    }
  }, [cargando, complejos, seleccionadoId, puedeCrear]);

  // =========================================================
  // ✅ Cuando cambia el complejo seleccionado: poblar form
  // =========================================================
  useEffect(() => {
    setOk(null);
    setError(null);
    setFotoFile(null);

    // ✅ si crea nuevo
    if (seleccionadoId === "new") {
      setForm({ ...emptyForm });
      setProvincias([]);
      setDistritos([]);
      return;
    }

    if (!seleccionado) return;

    // ✅ llenamos form con valores del backend
    setForm((prev) => ({
      ...prev,
      nombre: seleccionado.nombre || "",
      direccion: seleccionado.direccion || "",
      departamento: seleccionado.departamento || "",
      provincia: seleccionado.provincia || "",
      distrito: seleccionado.distrito || "",
      departamento_id: "", // se resolverá por match de nombre
      provincia_id: "",
      distrito_id: "",
      ubicacion_lat: seleccionado.latitud != null ? String(seleccionado.latitud) : "",
      ubicacion_lng: seleccionado.longitud != null ? String(seleccionado.longitud) : "",
      telefono: seleccionado.owner_phone || "",
      descripcion: seleccionado.descripcion || "",
      techada: !!seleccionado.techada,
      iluminacion: !!seleccionado.iluminacion,
      vestuarios: !!seleccionado.vestuarios,
      estacionamiento: !!seleccionado.estacionamiento,
      cafeteria: !!seleccionado.cafeteria,
      is_active: !!seleccionado.is_active,
      foto_url: seleccionado.foto_url || null,
    }));
  }, [seleccionadoId, seleccionado]);

  // =========================================================
  // ✅ CASCADA UBIGEO (cargar provincias/distritos según IDs)
  // =========================================================

  /** ✅ cuando eliges departamento_id -> recarga provincias y limpia provincia/distrito */
  useEffect(() => {
    (async () => {
      if (!form.departamento_id) {
        setProvincias([]);
        setDistritos([]);
        return;
      }
      try {
        await fetchProvincias(form.departamento_id);
      } catch {
        setProvincias([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.departamento_id]);

  /** ✅ cuando eliges provincia_id -> recarga distritos y limpia distrito */
  useEffect(() => {
    (async () => {
      if (!form.provincia_id) {
        setDistritos([]);
        return;
      }
      try {
        await fetchDistritos(form.provincia_id);
      } catch {
        setDistritos([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.provincia_id]);

  // =========================================================
  // ✅ Match por NOMBRE (para edición de complejos ya guardados)
  //   - Tu backend devuelve departamento/ciudad/distrito como texto.
  //   - Nosotros convertimos esos textos a IDs para preseleccionar selects.
  // =========================================================

  /** ✅ 1) Si tenemos el NOMBRE de departamento, lo convertimos a departamento_id */
  useEffect(() => {
    if (!departamentos.length) return;
    if (form.departamento_id) return;
    if (!form.departamento) return;

    const match = departamentos.find(
      (d) => d.name.toLowerCase().trim() === form.departamento.toLowerCase().trim()
    );
    if (match) {
      setForm((f) => ({ ...f, departamento_id: match.id }));
    }
  }, [departamentos, form.departamento, form.departamento_id]);

  /** ✅ 2) Si tenemos el nombre de ciudad (provincia), lo convertimos a provincia_id */
  useEffect(() => {
    if (!provincias.length) return;
    if (form.provincia_id) return;
    if (!form.provincia) return;

    const match = provincias.find(
      (p) => p.name.toLowerCase().trim() === form.provincia.toLowerCase().trim()
    );
    if (match) {
      setForm((f) => ({ ...f, provincia_id: match.id }));
    }
  }, [provincias, form.provincia, form.provincia_id]);

  /** ✅ 3) Si tenemos el nombre de distrito, lo convertimos a distrito_id */
  useEffect(() => {
    if (!distritos.length) return;
    if (form.distrito_id) return;
    if (!form.distrito) return;

    const match = distritos.find(
      (d) => (d.name || "").toLowerCase().trim() === form.distrito.toLowerCase().trim()
    );
    if (match) {
      setForm((f) => ({ ...f, distrito_id: match.id }));
    }
  }, [distritos, form.distrito, form.distrito_id]);

  // =========================================================
  // ✅ Guardar complejo (POST/PUT)
  // =========================================================
  async function guardar() {
    try {
      setGuardando(true);
      setOk(null);
      setError(null);

      /**
       * ✅ IMPORTANTE:
       * - Ahora enviamos también "departamento"
       * - ciudad = provincia (nombre)
       * - distrito = distrito (nombre)
       */
      const payload: any = {
        nombre: form.nombre.trim(),
        direccion: form.direccion.trim(),

        departamento: form.departamento.trim(), // ✅ NUEVO (antes no lo enviabas)
        provincia: form.provincia.trim(), // ✅ provincia (nombre)
        distrito: form.distrito.trim(), // ✅ distrito (nombre)

        latitud: form.ubicacion_lat ? Number(form.ubicacion_lat) : null,
        longitud: form.ubicacion_lng ? Number(form.ubicacion_lng) : null,
        telefono: form.telefono.trim() || null,
        descripcion: form.descripcion.trim() || null,
        techada: !!form.techada,
        iluminacion: !!form.iluminacion,
        vestuarios: !!form.vestuarios,
        estacionamiento: !!form.estacionamiento,
        cafeteria: !!form.cafeteria,
        is_active: !!form.is_active,
      };

      let actualizado: Complejo;
      const idValido = complejos.some((c) => String(c.id) === String(seleccionadoId));
      const esNuevo = seleccionadoId === "new" || !idValido;

      if (esNuevo) {
        actualizado = await apiFetch<Complejo>("/panel/complejos", {
          token,
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        actualizado = await apiFetch<Complejo>(`/panel/complejos/${seleccionadoId}`, {
          token,
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }

      /** ✅ subir foto si el usuario eligió una */
      if (fotoFile) {
        const fd = new FormData();
        fd.append("archivo", fotoFile);

        await apiFetch(`/panel/complejos/${actualizado.id}/foto`, {
          token,
          method: "POST",
          body: fd,
        });
      }

      setOk(esNuevo ? "Complejo creado ✅" : "Complejo actualizado ✅");

      // ✅ refrescar lista
      await fetchAll();

      // ✅ mantener seleccionado
      setSeleccionadoId(String(actualizado.id));
      setStoredComplejoId(String(actualizado.id));
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar el complejo.");
    } finally {
      setGuardando(false);
    }
  }

  /** ✅ url final de la foto */
  const fotoActual = fotoPreview || publicImgUrl(form.foto_url);

  return (
    <section className={styles.seccion}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Panel propietario</p>
          <h2 className={styles.titulo}>Mi complejo</h2>
          <p className={styles.muted}>
            Edita datos, ubicación y características. (La foto se sube con Guardar)
          </p>
        </div>

        <div className={styles.headerBtns}>
          <div className={styles.pill}>
            <span className={styles.pulseDot} />
            <span className={styles.pillText}>
              {activasCount}/{complejos.length} activas
            </span>
          </div>
        </div>
      </div>

      {error ? <div className={styles.alertError}>{error}</div> : null}
      {ok ? <div className={styles.alertOk}>{ok}</div> : null}

      <div className={`tarjeta ${styles.tarjeta}`}>
        <div className={styles.topRow}>
          <div className={styles.campo}>
            <label className={styles.label}>Complejo</label>
            <select
              className="input"
              value={seleccionadoId || ""}
              onChange={(e) => {
                const v = e.target.value;
                setSeleccionadoId(v);
                if (v !== "new") setStoredComplejoId(v);
                else clearStoredComplejoId();
              }}
              disabled={cargando}
            >
              {complejos.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  #{c.id} • {c.nombre}
                </option>
              ))}
              {puedeCrear ? <option value="new">+ Crear nuevo complejo</option> : null}
            </select>
          </div>
          {seleccionado && seleccionadoId !== "new" ? (
            <div className={styles.actionsRow}>
              <Link className="boton botonPrimario" href={`/panel/complejos/${seleccionado.id}/editar`}>
                Administrar perfil p?blico
              </Link>
              {publicUrl ? (
                <a className="boton botonNeon" href={publicUrl} target="_blank" rel="noreferrer">
                  Ver perfil p?blico
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        {cargando ? (
          <div className={styles.loadingBox}>Cargando…</div>
        ) : (
          <div className={styles.complejoLayout}>
            {/* ✅ FOTO */}
            <aside className={styles.fotoCard}>
              <div className={styles.fotoHeader}>
                <div>
                  <p className={styles.fotoTitle}>Foto principal</p>
                  <p className={styles.fotoHint}>Se usa en el listado y la ficha</p>
                </div>
                <span className={form.is_active ? styles.badgeOk : styles.badgeOff}>
                  {form.is_active ? "Activa" : "Inactiva"}
                </span>
              </div>

              <div className={styles.fotoPreview}>
                {fotoActual ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.fotoImg} src={fotoActual} alt="Foto complejo" />
                ) : (
                  <div className={styles.fotoPlaceholder}>
                    <p className={styles.fotoPlaceholderTitle}>Sin foto</p>
                    <p className={styles.fotoPlaceholderText}>
                      Sube una imagen para mejorar el perfil del complejo.
                    </p>
                  </div>
                )}
              </div>

              <label className={styles.fileLabel}>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className={styles.file}
                  onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
                />
                Elegir foto
              </label>

              <p className={styles.mutedTiny}>PNG/JPG/WEBP • ideal 1200x800</p>
            </aside>

            {/* ✅ FORM */}
            <div className={styles.stack}>
              <div className={styles.formGrid}>
                <div className={styles.campo}>
                  <label className={styles.label}>Nombre</label>
                  <input
                    className="input"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  />
                </div>

                <div className={styles.campo}>
                  <label className={styles.label}>Dirección</label>
                  <input
                    className="input"
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  />
                </div>

                {/* ✅ UBIGEO: Departamento */}
                <div className={styles.campo}>
                  <label className={styles.label}>Departamento</label>
                  <select
                    className="input"
                    value={form.departamento_id}
                    onChange={(e) => {
                      const id = e.target.value;
                      const dep = departamentos.find((d) => d.id === id);

                      // ✅ setea nombre + id, y limpia cascada hacia abajo
                      setForm({
                        ...form,
                        departamento_id: id,
                        departamento: dep?.name || "",
                        provincia_id: "",
                        provincia: "",
                        distrito_id: "",
                        distrito: "",
                      });
                    }}
                  >
                    <option value="">Selecciona…</option>
                    {departamentos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ✅ UBIGEO: Provincia (ciudad) */}
                <div className={styles.campo}>
                  <label className={styles.label}>Provincia</label>
                  <select
                    className="input"
                    value={form.provincia_id}
                    disabled={!form.departamento_id}
                    onChange={(e) => {
                      const id = e.target.value;
                      const prov = provincias.find((p) => p.id === id);

                      // ✅ setea nombre + id, y limpia distrito
                      setForm({
                        ...form,
                        provincia_id: id,
                        provincia: prov?.name || "",
                        distrito_id: "",
                        distrito: "",
                      });
                    }}
                  >
                    <option value="">
                      {form.departamento_id ? "Selecciona…" : "Elige un departamento primero"}
                    </option>
                    {provincias.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ✅ UBIGEO: Distrito */}
                <div className={styles.campo}>
                  <label className={styles.label}>Distrito</label>
                  <select
                    className="input"
                    value={form.distrito_id}
                    disabled={!form.provincia_id}
                    onChange={(e) => {
                      const id = e.target.value;
                      const dist = distritos.find((d) => d.id === id);

                      // ✅ setea nombre + id
                      setForm({
                        ...form,
                        distrito_id: id,
                        distrito: dist?.name || "",
                      });
                    }}
                  >
                    <option value="">
                      {form.provincia_id ? "Selecciona…" : "Elige una provincia primero"}
                    </option>
                    {distritos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name ?? d.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGrid2}>
                <div className={styles.campo}>
                  <label className={styles.label}>Latitud</label>
                  <input
                    className="input"
                    value={form.ubicacion_lat}
                    onChange={(e) => setForm({ ...form, ubicacion_lat: e.target.value })}
                    placeholder="-12.0"
                  />
                </div>
                <div className={styles.campo}>
                  <label className={styles.label}>Longitud</label>
                  <input
                    className="input"
                    value={form.ubicacion_lng}
                    onChange={(e) => setForm({ ...form, ubicacion_lng: e.target.value })}
                    placeholder="-77.0"
                  />
                </div>
              </div>

              <div className={styles.campo}>
                <label className={styles.label}>Descripción</label>
                <textarea
                  className={styles.textarea}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  rows={4}
                />
              </div>

              <div className={styles.checks}>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={form.techada}
                    onChange={(e) => setForm({ ...form, techada: e.target.checked })}
                  />
                  Techada
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={form.iluminacion}
                    onChange={(e) => setForm({ ...form, iluminacion: e.target.checked })}
                  />
                  Iluminación
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={form.vestuarios}
                    onChange={(e) => setForm({ ...form, vestuarios: e.target.checked })}
                  />
                  Vestuarios
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={form.estacionamiento}
                    onChange={(e) => setForm({ ...form, estacionamiento: e.target.checked })}
                  />
                  Estacionamiento
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={form.cafeteria}
                    onChange={(e) => setForm({ ...form, cafeteria: e.target.checked })}
                  />
                  Cafetería
                </label>
              </div>

              <div className={styles.filaBtns}>
                <button
                  className="boton botonPrimario"
                  onClick={() => void guardar()}
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : seleccionadoId === "new"
                    ? "Crear complejo"
                    : "Guardar complejo"}
                </button>
              </div>

              <p className={styles.tip}>Tip: verifica los datos de tu complejo.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
