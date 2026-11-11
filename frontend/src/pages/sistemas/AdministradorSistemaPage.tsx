import { useEffect, useState, type FormEvent } from "react";
import {
  Settings2,
  CalendarDays,
  UsersRound,
  Clock3,
  Database,
  Server,
  ShieldCheck,
  Activity,
  KeyRound,
  Info,
  CheckCircle2,
  ClipboardList,
  UserCog,
  CalendarCog,
} from "lucide-react";
import keycloak from "../../auth/keycloak";
import {
  guardarPeriodoInscripcion,
  obtenerEstadoSistema,
  obtenerPeriodoInscripcion,
  type PeriodoInscripcion,
} from "../../services/sistema";

const configuracion = {
  cuposPrevistos: 600,
};

const urlConfiguracion = "/api/v1/admin/configuracion-temporada";

interface ConfiguracionTemporada {
  temporada: number;
  edad_minima: number;
  edad_maxima: number;
}

const servicios = [
  {
    id: "api",
    nombre: "API FastAPI",
    descripcion: "Lógica de negocio e inscripciones",
    icono: Server,
  },
  {
    id: "database",
    nombre: "PostgreSQL",
    descripcion: "Persistencia de datos",
    icono: Database,
  },
  {
    id: "keycloak",
    nombre: "Keycloak",
    descripcion: "Autenticación y roles de usuarios",
    icono: KeyRound,
  },
  {
    id: "padron",
    nombre: "Padrón municipal",
    descripcion: "Verificación de residencia mediante WireMock",
    icono: ShieldCheck,
  },
] as const;

const perfiles = [
  {
    nombre: "Tutor",
    descripcion: "Realiza inscripciones y consulta sus solicitudes.",
    icono: UsersRound,
    color: "bg-blue-100 text-blue-700",
  },
  {
    nombre: "Administrativo",
    descripcion:
      "Consulta inscripciones y atiende las solicitudes que requieren revisión.",
    icono: ClipboardList,
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    nombre: "Administrador de Sistemas",
    descripcion:
      "Supervisa la aplicación y administra la configuración técnica autorizada.",
    icono: UserCog,
    color: "bg-violet-100 text-violet-700",
  },
];

function AdministracionSistemaPage() {
  const [estado, setEstado] = useState<Awaited<
    ReturnType<typeof obtenerEstadoSistema>
  > | null>(null);
  const [errorEstado, setErrorEstado] = useState(false);
  const [comprobacion, setComprobacion] = useState(0);

  const [periodo, setPeriodo] = useState<PeriodoInscripcion | null>(null);
  const [apertura, setApertura] = useState("");
  const [cierre, setCierre] = useState("");
  const [guardandoPeriodo, setGuardandoPeriodo] = useState(false);
  const [errorPeriodo, setErrorPeriodo] = useState("");
  const [periodoGuardado, setPeriodoGuardado] = useState(false);

  const [temporadaGuardada, setTemporadaGuardada] = useState<number | null>(null);
  const [temporadaEditable, setTemporadaEditable] = useState("");
  const [edadMinima, setEdadMinima] = useState("");
  const [edadMaxima, setEdadMaxima] = useState("");
  const [guardandoConfiguracion, setGuardandoConfiguracion] = useState(false);
  const [errorConfiguracion, setErrorConfiguracion] = useState("");

  useEffect(() => {
    let activo = true;
    let temporizador: number | undefined;

    async function cargarEstado() {
      try {
        if (!keycloak.token || keycloak.isTokenExpired()) {
          await keycloak.updateToken(30);
        }

        if (!keycloak.token) {
          throw new Error("No hay una sesión activa.");
        }

        const datos = await obtenerEstadoSistema(keycloak.token);

        if (activo) {
          setEstado(datos);
          setErrorEstado(false);
        }
      } catch {
        if (activo) {
          setEstado(null);
          setErrorEstado(true);
        }
      } finally {
        if (activo) {
          temporizador = window.setTimeout(cargarEstado, 30_000);
        }
      }
    }

    void cargarEstado();

    return () => {
      activo = false;
      window.clearTimeout(temporizador);
    };
  }, [comprobacion]);

  useEffect(() => {
    let activo = true;

    async function cargarPeriodo() {
      try {
        await keycloak.updateToken(30);

        if (!keycloak.token) {
          throw new Error("Volvé a iniciar sesión.");
        }

        const datos = await obtenerPeriodoInscripcion(keycloak.token);

        if (activo) {
          setPeriodo(datos);
          setApertura(datos.apertura?.slice(0, 16) ?? "");
          setCierre(datos.cierre?.slice(0, 16) ?? "");
        }
      } catch (error) {
        if (activo) {
          setErrorPeriodo(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el período de inscripción.",
          );
        }
      }
    }

    void cargarPeriodo();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;

    async function cargarConfiguracion() {
      try {
        await keycloak.updateToken(30);

        if (!keycloak.token) {
          throw new Error("Volvé a iniciar sesión.");
        }

        const respuesta = await fetch(urlConfiguracion, {
          headers: { Authorization: `Bearer ${keycloak.token}` },
          cache: "no-store",
        });

        if (!respuesta.ok) {
          throw new Error("No se pudo cargar la configuración de la temporada.");
        }

        const datos: ConfiguracionTemporada = await respuesta.json();

        if (activo) {
          setTemporadaGuardada(datos.temporada);
          setTemporadaEditable(String(datos.temporada));
          setEdadMinima(String(datos.edad_minima));
          setEdadMaxima(String(datos.edad_maxima));
        }
      } catch (error) {
        if (activo) {
          setErrorConfiguracion(
            error instanceof Error
              ? error.message
              : "No se pudo cargar la configuración de la temporada.",
          );
        }
      }
    }

    void cargarConfiguracion();

    return () => {
      activo = false;
    };
  }, []);

  async function guardarConfiguracion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (guardandoConfiguracion || guardandoPeriodo) return;

    setErrorConfiguracion("");

    if (Number(edadMaxima) < Number(edadMinima)) {
      setErrorConfiguracion("La edad máxima debe ser mayor o igual a la mínima.");
      return;
    }

    setGuardandoConfiguracion(true);

    try {
      await keycloak.updateToken(30);

      if (!keycloak.token) {
        throw new Error("Volvé a iniciar sesión.");
      }

      const respuesta = await fetch(urlConfiguracion, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          temporada: Number(temporadaEditable),
          edad_minima: Number(edadMinima),
          edad_maxima: Number(edadMaxima),
        }),
      });

      if (!respuesta.ok) {
        const problema = await respuesta.json().catch(() => null);
        throw new Error(
          problema?.errors?.[0]?.mensaje ??
            problema?.detail ??
            "No se pudo guardar la configuración.",
        );
      }

      window.location.reload();
    } catch (error) {
      setErrorConfiguracion(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la configuración.",
      );
      setGuardandoConfiguracion(false);
    }
  }

  async function manejarGuardadoPeriodo(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (guardandoPeriodo || guardandoConfiguracion) return;

    setErrorPeriodo("");
    setPeriodoGuardado(false);

    if (!apertura || !cierre || cierre <= apertura) {
      setErrorPeriodo("El cierre debe ser posterior a la apertura.");
      return;
    }

    setGuardandoPeriodo(true);

    try {
      await keycloak.updateToken(30);

      if (!keycloak.token) {
        throw new Error("Volvé a iniciar sesión.");
      }

      const datos = await guardarPeriodoInscripcion(
        keycloak.token,
        apertura,
        cierre,
      );

      setPeriodo(datos);
      setApertura(datos.apertura?.slice(0, 16) ?? "");
      setCierre(datos.cierre?.slice(0, 16) ?? "");
      setPeriodoGuardado(true);
    } catch (error) {
      setErrorPeriodo(
        error instanceof Error ? error.message : "No se pudo guardar el período.",
      );
    } finally {
      setGuardandoPeriodo(false);
    }
  }

  return (
    <main className="min-h-screen bg-transparent px-5 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <Settings2 size={28} />
            </div>

            <div>
              <h1 className="text-3xl font-extrabold text-[#142D50]">
                Administración del sistema
              </h1>
              <p className="mt-1 text-slate-600">
                Configuración y supervisión de la colonia municipal.
              </p>
            </div>
          </div>
        </header>

        <section
          aria-label="Resumen de configuración"
          className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <article className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <CalendarDays size={28} />
            </div>

            <div>
              <p className="text-sm text-slate-500">Temporada</p>
              <p className="text-2xl font-extrabold text-[#142D50]">
                {temporadaGuardada ?? periodo?.temporada ?? "—"}
              </p>
            </div>
          </article>

          <article className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
              <UsersRound size={28} />
            </div>

            <div>
              <p className="text-sm text-slate-500">Cupos previstos</p>
              <p className="text-2xl font-extrabold text-[#142D50]">
                {configuracion.cuposPrevistos}
              </p>
            </div>
          </article>

          <article className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
            <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
              <Clock3 size={28} />
            </div>

            <div>
              <p className="text-sm text-slate-500">Período de inscripción</p>
              <p className="text-2xl font-extrabold text-[#142D50]">
                {periodo
                  ? periodo.apertura && periodo.cierre
                    ? "Configurado"
                    : "Sin configurar"
                  : "—"}
              </p>
            </div>
          </article>
        </section>

        <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <CalendarCog size={25} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#142D50]">
                Configuración de la temporada
              </h2>
              <p className="text-sm text-slate-500">
                Parámetros previstos para el funcionamiento de la colonia.
              </p>
            </div>
          </div>

          {temporadaGuardada === null && !errorConfiguracion && (
            <p role="status" className="mb-4 text-sm text-slate-600">
              Cargando la configuración de la temporada…
            </p>
          )}

          <form onSubmit={guardarConfiguracion} className="space-y-4">
            <fieldset
              disabled={
                temporadaGuardada === null ||
                guardandoConfiguracion ||
                guardandoPeriodo
              }
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <label className="text-sm font-semibold text-slate-700">
                Temporada
                <input
                  id="temporada-sistema"
                  type="number"
                  min={1}
                  max={9999}
                  required
                  value={temporadaEditable}
                  onChange={(evento) => setTemporadaEditable(evento.target.value)}
                  className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>

              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Cupos totales previstos
                </p>
                <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {configuracion.cuposPrevistos}
                </p>
              </div>

              <label className="text-sm font-semibold text-slate-700">
                Edad mínima
                <input
                  id="edad-minima-sistema"
                  type="number"
                  min={0}
                  required
                  value={edadMinima}
                  onChange={(evento) => setEdadMinima(evento.target.value)}
                  className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Edad máxima
                <input
                  id="edad-maxima-sistema"
                  type="number"
                  min={0}
                  required
                  value={edadMaxima}
                  onChange={(evento) => setEdadMaxima(evento.target.value)}
                  className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
            </fieldset>

            <button
              type="submit"
              disabled={
                temporadaGuardada === null ||
                guardandoConfiguracion ||
                guardandoPeriodo
              }
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardandoConfiguracion ? "Guardando…" : "Guardar configuración"}
            </button>

            {errorConfiguracion && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
              >
                {errorConfiguracion}
              </p>
            )}
          </form>

          <div className="mt-5 border-t border-slate-200 pt-5">
            <h3 className="font-bold text-[#142D50]">Período de inscripción</h3>
            <p className="mt-1 text-sm text-slate-600">Hora argentina.</p>

            {!periodo && !errorPeriodo && (
              <p role="status" className="mt-3 text-sm text-slate-600">
                Cargando el período de inscripción…
              </p>
            )}

            {periodo && (
              <form onSubmit={manejarGuardadoPeriodo} className="mt-4 space-y-4">
                <fieldset
                  disabled={guardandoPeriodo || guardandoConfiguracion}
                  onChange={() => {
                    setPeriodoGuardado(false);
                    setErrorPeriodo("");
                  }}
                  className="grid grid-cols-1 gap-4 md:grid-cols-2"
                >
                  <label className="min-w-0 text-sm font-semibold text-slate-700">
                    Apertura
                    <input
                      type="datetime-local"
                      required
                      value={apertura}
                      onChange={(evento) => setApertura(evento.target.value)}
                      className="mt-2 block w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <label className="min-w-0 text-sm font-semibold text-slate-700">
                    Cierre
                    <input
                      type="datetime-local"
                      required
                      value={cierre}
                      onChange={(evento) => setCierre(evento.target.value)}
                      className="mt-2 block w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2"
                    />
                  </label>
                </fieldset>

                <button
                  type="submit"
                  disabled={guardandoPeriodo || guardandoConfiguracion}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardandoPeriodo ? "Guardando…" : "Guardar período"}
                </button>
              </form>
            )}

            {errorPeriodo && (
              <p
                role="alert"
                className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800"
              >
                {errorPeriodo}
              </p>
            )}

            {periodoGuardado && (
              <p
                role="status"
                className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"
              >
                Período guardado correctamente.
              </p>
            )}
          </div>
        </section>

        <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-cyan-100 p-3 text-cyan-700">
              <Activity size={25} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#142D50]">
                Estado del sistema
              </h2>
              <p className="text-sm text-slate-500">
                Servicios principales de la arquitectura.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {servicios.map((servicio) => {
              const Icono = servicio.icono;
              const resultado = estado?.services[servicio.id];

              return (
                <article
                  key={servicio.nombre}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col items-start gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
                        <Icono size={24} />
                      </div>

                      <div>
                        <h3 className="font-bold text-[#142D50]">
                          {servicio.nombre}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {servicio.descripcion}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        resultado === "ok"
                          ? "bg-emerald-100 text-emerald-800"
                          : resultado === "error"
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {resultado === "ok"
                        ? "Operativo"
                        : resultado === "error"
                          ? "Con fallas"
                          : "Sin verificar"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          <div
            className={`mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl p-4 ${
              errorEstado
                ? "bg-red-50 text-red-800"
                : estado
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-blue-50 text-blue-800"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              {estado ? (
                <CheckCircle2
                  size={19}
                  className="shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <Info size={19} className="shrink-0" aria-hidden="true" />
              )}

              <p role="status" className="text-sm font-semibold">
                {errorEstado
                  ? "Estado sin actualizar. No se pudo verificar la conexión con el sistema."
                  : estado
                    ? "Estado actualizado"
                    : "Consultando el estado de los servicios…"}
              </p>
            </div>

            <button
              type="button"
              disabled={!estado && !errorEstado}
              onClick={() => {
                setEstado(null);
                setErrorEstado(false);
                setComprobacion((anterior) => anterior + 1);
              }}
              className="ml-auto shrink-0 rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Actualizar
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
              <ShieldCheck size={25} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#142D50]">
                Perfiles del sistema
              </h2>
              <p className="text-sm text-slate-500">
                Responsabilidades de los tres perfiles definidos.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {perfiles.map((perfil) => {
              const Icono = perfil.icono;

              return (
                <article
                  key={perfil.nombre}
                  className="flex items-start gap-4 rounded-xl border border-slate-200 p-4"
                >
                  <div className={`shrink-0 rounded-xl p-3 ${perfil.color}`}>
                    <Icono size={23} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-[#142D50]">
                      {perfil.nombre}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {perfil.descripcion}
                    </p>
                  </div>

                  <CheckCircle2
                    size={19}
                    className="ml-auto shrink-0 text-slate-300"
                    aria-hidden="true"
                  />
                </article>
              );
            })}
          </div>

          <p className="mt-5 text-sm text-slate-500">
            La autenticación y asignación real de roles se integrará mediante
            Keycloak.
          </p>
        </section>

        <div className="mt-6 flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
          <Info size={20} className="shrink-0" />
          <p>Los cupos previstos se muestran como referencia.</p>
        </div>
      </div>
    </main>
  );
}

export default AdministracionSistemaPage;