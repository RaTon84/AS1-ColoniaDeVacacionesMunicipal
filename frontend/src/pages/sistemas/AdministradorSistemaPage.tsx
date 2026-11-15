import { useEffect, useState, type FormEvent } from "react";
import { useMatch } from "react-router-dom";
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
  Plus,
  Pencil,
  Trash2,
  Copy,
  History,
} from "lucide-react";
import keycloak from "../../auth/keycloak";
import {
  borrarPeriodoInscripcion,
  guardarPeriodoInscripcion,
  obtenerEstadoSistema,
  obtenerPeriodoInscripcion,
  obtenerTemporadas,
  type PeriodoInscripcion,
  type TemporadaHistorial,
} from "../../services/sistema";
import {
  actualizarTurno,
  copiarTurnos,
  crearTurno,
  eliminarTurno,
  obtenerTurnos,
  obtenerTurnosDeTemporada,
  type DatosTurno,
} from "../../services/turnos";
import type { Turno } from "../../types/turno";

const MAX_CUPOS_TEMPORADA = 600;
const urlConfiguracion = "/api/v1/admin/configuracion-temporada";

type TurnoEditable = Turno & { cupoEditable: string };

interface FormularioTurno {
  nombre: string;
  sede: string;
  fecha_desde: string;
  fecha_hasta: string;
  cupoEditable: string;
}

const formularioTurnoVacio: FormularioTurno = {
  nombre: "",
  sede: "",
  fecha_desde: "",
  fecha_hasta: "",
  cupoEditable: "150",
};

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
    descripcion:
      "Inscribe a sus chicos, consulta el estado de sus solicitudes y puede cancelarlas.",
    icono: UsersRound,
    color: "bg-blue-100 text-blue-700",
  },
  {
    nombre: "Administrativo",
    descripcion:
      "Carga inscripciones desde la oficina, consulta el listado completo y cancela solicitudes. Es el único perfil con acceso a la gestión de inscripciones.",
    icono: ClipboardList,
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    nombre: "Administrador de Sistemas",
    descripcion:
      "Perfil técnico: configura la temporada y las edades, el período de inscripción, la distribución de cupos y los turnos, y supervisa el estado de los servicios. No gestiona inscripciones.",
    icono: UserCog,
    color: "bg-violet-100 text-violet-700",
  },
];

function AdministracionSistemaPage() {
  const mostrarEstado = Boolean(useMatch("/sistemas/estado"));
  const mostrarPerfiles = Boolean(useMatch("/sistemas/perfiles"));
  const mostrarConfiguracion = !mostrarEstado && !mostrarPerfiles;

  const [estado, setEstado] = useState<Awaited<
    ReturnType<typeof obtenerEstadoSistema>
  > | null>(null);
  const [errorEstado, setErrorEstado] = useState(false);
  const [comprobacion, setComprobacion] = useState(0);

  const [periodo, setPeriodo] = useState<PeriodoInscripcion | null>(null);
  const [apertura, setApertura] = useState("");
  const [cierre, setCierre] = useState("");
  const [guardandoPeriodo, setGuardandoPeriodo] = useState(false);
  const [borrandoPeriodo, setBorrandoPeriodo] = useState(false);
  const [errorPeriodo, setErrorPeriodo] = useState("");
  const [periodoGuardado, setPeriodoGuardado] = useState(false);
  const [periodoEliminado, setPeriodoEliminado] = useState(false);
  const [recargaPeriodo, setRecargaPeriodo] = useState(0);

  const [temporadaGuardada, setTemporadaGuardada] = useState<number | null>(null);
  const [temporadaEditable, setTemporadaEditable] = useState("");
  const [edadMinima, setEdadMinima] = useState("");
  const [edadMaxima, setEdadMaxima] = useState("");
  const [guardandoConfiguracion, setGuardandoConfiguracion] = useState(false);
  const [errorConfiguracion, setErrorConfiguracion] = useState("");
  const [configuracionGuardada, setConfiguracionGuardada] = useState(false);

  const [turnosCupos, setTurnosCupos] = useState<TurnoEditable[] | null>(null);
  const [guardandoCupos, setGuardandoCupos] = useState(false);
  const [errorCupos, setErrorCupos] = useState("");
  const [cuposGuardados, setCuposGuardados] = useState(false);
  const [recargaTurnos, setRecargaTurnos] = useState(0);

  const [turnoEnEdicion, setTurnoEnEdicion] = useState<Turno | "nuevo" | null>(
    null,
  );
  const [formularioTurno, setFormularioTurno] =
    useState<FormularioTurno>(formularioTurnoVacio);
  const [guardandoTurno, setGuardandoTurno] = useState(false);
  const [copiandoTurnos, setCopiandoTurnos] = useState(false);
  const [errorTurno, setErrorTurno] = useState("");
  const [mensajeTurno, setMensajeTurno] = useState("");

  const [temporadas, setTemporadas] = useState<TemporadaHistorial[]>([]);
  const [temporadaHistorial, setTemporadaHistorial] = useState("");
  const [turnosHistorial, setTurnosHistorial] = useState<Turno[] | null>(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorTemporadas, setErrorTemporadas] = useState("");
  const [errorTurnosHistorial, setErrorTurnosHistorial] = useState("");
  const errorHistorial = errorTemporadas || errorTurnosHistorial;

  const totalGuardado = turnosCupos?.reduce(
    (total, turno) => total + turno.cupo_total,
    0,
  );
  const totalBorrador = turnosCupos?.reduce(
    (total, turno) => total + Number(turno.cupoEditable),
    0,
  ) ?? 0;
  const superaLimite = totalBorrador > MAX_CUPOS_TEMPORADA;

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
        setErrorPeriodo("");
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
  }, [recargaPeriodo]);

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

  useEffect(() => {
    if (temporadaGuardada === null) return;

    let activo = true;

    async function cargarTurnosCupos() {
      try {
        setErrorCupos("");
        await keycloak.updateToken(30);

        if (!keycloak.token) {
          throw new Error("Volvé a iniciar sesión.");
        }

        const turnos = await obtenerTurnos(keycloak.token);
        if (!activo) return;

        if (turnos.some((turno) => turno.temporada !== temporadaGuardada)) {
          throw new Error("La temporada activa cambió. Recargá el panel.");
        }

        setTurnosCupos(
          turnos.map((turno) => ({
            ...turno,
            cupoEditable: String(turno.cupo_total),
          })),
        );
      } catch (error) {
        if (activo) {
          setErrorCupos(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los turnos.",
          );
        }
      }
    }

    void cargarTurnosCupos();

    return () => {
      activo = false;
    };
  }, [temporadaGuardada, recargaTurnos]);

  useEffect(() => {
    let activo = true;

    async function cargarTemporadas() {
      try {
        setErrorTemporadas("");
        await keycloak.updateToken(30);

        if (!keycloak.token) {
          throw new Error("Volvé a iniciar sesión.");
        }

        const datos = await obtenerTemporadas(keycloak.token);
        if (!activo) return;

        setTemporadas(datos);
        setTemporadaHistorial((actual) => {
          if (actual && datos.some((item) => String(item.temporada) === actual)) {
            return actual;
          }

          const activa = datos.find((item) => item.activa) ?? datos[0];

          return activa ? String(activa.temporada) : "";
        });
      } catch (error) {
        if (activo) {
          setErrorTemporadas(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el historial de temporadas.",
          );
        }
      }
    }

    void cargarTemporadas();

    return () => {
      activo = false;
    };
  }, [recargaTurnos]);

  useEffect(() => {
    if (!temporadaHistorial) {
      setTurnosHistorial(null);
      return;
    }

    let activo = true;

    async function cargarTurnosHistorial() {
      setCargandoHistorial(true);
      setErrorTurnosHistorial("");

      try {
        await keycloak.updateToken(30);

        if (!keycloak.token) {
          throw new Error("Volvé a iniciar sesión.");
        }

        const datos = await obtenerTurnosDeTemporada(
          Number(temporadaHistorial),
          keycloak.token,
        );

        if (activo) {
          setTurnosHistorial(datos);
        }
      } catch (error) {
        if (activo) {
          setTurnosHistorial(null);
          setErrorTurnosHistorial(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los turnos de la temporada.",
          );
        }
      } finally {
        if (activo) {
          setCargandoHistorial(false);
        }
      }
    }

    void cargarTurnosHistorial();

    return () => {
      activo = false;
    };
  }, [temporadaHistorial, recargaTurnos]);

  async function guardarDistribucion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (
      temporadaGuardada === null ||
      !turnosCupos?.length ||
      guardandoCupos ||
      guardandoConfiguracion ||
      guardandoPeriodo ||
      superaLimite
    ) return;

    setErrorCupos("");
    setCuposGuardados(false);
    setGuardandoCupos(true);

    try {
      await keycloak.updateToken(30);

      if (!keycloak.token) {
        throw new Error("Volvé a iniciar sesión.");
      }

      const respuesta = await fetch("/api/v1/admin/distribucion-cupos", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          temporada: temporadaGuardada,
          turnos: turnosCupos.map((turno) => ({
            turno_id: turno.id,
            cupo_total: Number(turno.cupoEditable),
          })),
        }),
      });

      if (!respuesta.ok) {
        const problema = await respuesta.json().catch(() => null);

        throw new Error(
          problema?.errors?.[0]?.mensaje ??
            problema?.detail ??
            "No se pudo guardar la distribución.",
        );
      }

      const turnos: Turno[] = await respuesta.json();

      setTurnosCupos(
        turnos.map((turno) => ({
          ...turno,
          cupoEditable: String(turno.cupo_total),
        })),
      );
      setCuposGuardados(true);
    } catch (error) {
      setErrorCupos(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la distribución.",
      );
    } finally {
      setGuardandoCupos(false);
    }
  }

  async function guardarConfiguracion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (guardandoConfiguracion || guardandoPeriodo || guardandoCupos) return;

    setErrorConfiguracion("");
    setConfiguracionGuardada(false);

    if (Number(edadMaxima) < Number(edadMinima)) {
      setErrorConfiguracion("La edad máxima debe ser mayor o igual a la mínima.");
      return;
    }

    const nuevaTemporada = Number(temporadaEditable);

    if (
      temporadaGuardada !== null &&
      nuevaTemporada !== temporadaGuardada &&
      !window.confirm(
        `Vas a activar la temporada ${nuevaTemporada}. Los datos de la temporada ${temporadaGuardada} quedarán disponibles solo en el historial. ¿Continuar?`,
      )
    ) {
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

      const datos: ConfiguracionTemporada = await respuesta.json();

      setTemporadaGuardada(datos.temporada);
      setTemporadaEditable(String(datos.temporada));
      setEdadMinima(String(datos.edad_minima));
      setEdadMaxima(String(datos.edad_maxima));
      setTurnoEnEdicion(null);
      setRecargaPeriodo((actual) => actual + 1);
      setRecargaTurnos((actual) => actual + 1);
      setConfiguracionGuardada(true);
    } catch (error) {
      setErrorConfiguracion(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la configuración.",
      );
    } finally {
      setGuardandoConfiguracion(false);
    }
  }

  async function manejarGuardadoPeriodo(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (guardandoPeriodo || guardandoConfiguracion || guardandoCupos) return;

    setErrorPeriodo("");
    setPeriodoGuardado(false);
    setPeriodoEliminado(false);

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

  async function manejarBorradoPeriodo() {
    if (
      borrandoPeriodo ||
      guardandoPeriodo ||
      guardandoConfiguracion ||
      guardandoCupos
    ) {
      return;
    }

    const confirmar = window.confirm(
      "¿Borrar el período de inscripción? La inscripción queda cerrada " +
        "hasta que configures uno nuevo.",
    );

    if (!confirmar) return;

    setBorrandoPeriodo(true);
    setErrorPeriodo("");
    setPeriodoGuardado(false);
    setPeriodoEliminado(false);

    try {
      await keycloak.updateToken(30);

      if (!keycloak.token) {
        throw new Error("Volvé a iniciar sesión.");
      }

      await borrarPeriodoInscripcion(keycloak.token);

      setPeriodo((anterior) =>
        anterior ? { ...anterior, apertura: null, cierre: null } : anterior,
      );
      setApertura("");
      setCierre("");
      setPeriodoEliminado(true);
    } catch (error) {
      setErrorPeriodo(
        error instanceof Error
          ? error.message
          : "No se pudo borrar el período.",
      );
    } finally {
      setBorrandoPeriodo(false);
    }
  }

  function abrirNuevoTurno() {
    setTurnoEnEdicion("nuevo");
    setFormularioTurno(formularioTurnoVacio);
    setErrorTurno("");
    setMensajeTurno("");
  }

  function abrirEdicionTurno(turno: Turno) {
    setTurnoEnEdicion(turno);
    setFormularioTurno({
      nombre: turno.nombre,
      sede: turno.sede,
      fecha_desde: turno.fecha_desde,
      fecha_hasta: turno.fecha_hasta,
      cupoEditable: String(turno.cupo_total),
    });
    setErrorTurno("");
    setMensajeTurno("");
  }

  async function guardarTurno(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!turnoEnEdicion || guardandoTurno || copiandoTurnos) return;

    setErrorTurno("");
    setMensajeTurno("");

    const cupo = Number(formularioTurno.cupoEditable);

    if (!formularioTurno.nombre.trim() || !formularioTurno.sede.trim()) {
      setErrorTurno("El nombre y la sede son obligatorios.");
      return;
    }

    if (!formularioTurno.fecha_desde || !formularioTurno.fecha_hasta) {
      setErrorTurno("Las fechas de inicio y fin son obligatorias.");
      return;
    }

    if (formularioTurno.fecha_hasta < formularioTurno.fecha_desde) {
      setErrorTurno("La fecha de fin debe ser posterior a la de inicio.");
      return;
    }

    if (!Number.isInteger(cupo) || cupo < 0) {
      setErrorTurno("El cupo debe ser un número entero mayor o igual a cero.");
      return;
    }

    const datos: DatosTurno = {
      nombre: formularioTurno.nombre.trim(),
      sede: formularioTurno.sede.trim(),
      fecha_desde: formularioTurno.fecha_desde,
      fecha_hasta: formularioTurno.fecha_hasta,
      cupo_total: cupo,
    };

    setGuardandoTurno(true);

    try {
      await keycloak.updateToken(30);

      if (!keycloak.token) {
        throw new Error("Volvé a iniciar sesión.");
      }

      if (turnoEnEdicion === "nuevo") {
        await crearTurno(datos, keycloak.token);
        setMensajeTurno("Turno creado correctamente.");
      } else {
        await actualizarTurno(turnoEnEdicion.id, datos, keycloak.token);
        setMensajeTurno("Turno actualizado correctamente.");
      }

      setTurnoEnEdicion(null);
      setRecargaTurnos((actual) => actual + 1);
    } catch (error) {
      setErrorTurno(
        error instanceof Error ? error.message : "No se pudo guardar el turno.",
      );
    } finally {
      setGuardandoTurno(false);
    }
  }

  async function borrarTurno(turno: Turno) {
    if (guardandoTurno || copiandoTurnos) return;

    const confirmar = window.confirm(
      `¿Querés eliminar el turno ${turno.nombre} de ${turno.sede}?`,
    );

    if (!confirmar) return;

    setErrorTurno("");
    setMensajeTurno("");
    setGuardandoTurno(true);

    try {
      await keycloak.updateToken(30);

      if (!keycloak.token) {
        throw new Error("Volvé a iniciar sesión.");
      }

      await eliminarTurno(turno.id, keycloak.token);
      setMensajeTurno("Turno eliminado correctamente.");
      setRecargaTurnos((actual) => actual + 1);
    } catch (error) {
      setErrorTurno(
        error instanceof Error ? error.message : "No se pudo eliminar el turno.",
      );
    } finally {
      setGuardandoTurno(false);
    }
  }

  async function copiarTurnosTemporadaAnterior() {
    if (guardandoTurno || copiandoTurnos) return;

    const confirmar = window.confirm(
      "Se van a copiar los turnos de la temporada anterior con las fechas ajustadas. ¿Continuar?",
    );

    if (!confirmar) return;

    setErrorTurno("");
    setMensajeTurno("");
    setCopiandoTurnos(true);

    try {
      await keycloak.updateToken(30);

      if (!keycloak.token) {
        throw new Error("Volvé a iniciar sesión.");
      }

      const turnos = await copiarTurnos(keycloak.token);
      setMensajeTurno(
        `Se copiaron ${turnos.length} turnos. Revisá las fechas y los cupos.`,
      );
      setRecargaTurnos((actual) => actual + 1);
    } catch (error) {
      setErrorTurno(
        error instanceof Error
          ? error.message
          : "No se pudieron copiar los turnos.",
      );
    } finally {
      setCopiandoTurnos(false);
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

        <div hidden={!mostrarConfiguracion}>
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
                  {totalGuardado ?? "—"}
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
                  guardandoPeriodo ||
                  guardandoCupos
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
                    onChange={(evento) => {
                      setTemporadaEditable(evento.target.value);
                      setConfiguracionGuardada(false);
                    }}
                    className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>

                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Cupos totales previstos
                  </p>
                  <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {totalGuardado ?? "—"}
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
                    onChange={(evento) => {
                      setEdadMinima(evento.target.value);
                      setConfiguracionGuardada(false);
                    }}
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
                    onChange={(evento) => {
                      setEdadMaxima(evento.target.value);
                      setConfiguracionGuardada(false);
                    }}
                    className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>
              </fieldset>

              <button
                type="submit"
                disabled={
                  temporadaGuardada === null ||
                  guardandoConfiguracion ||
                  guardandoPeriodo ||
                  guardandoCupos
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

              {configuracionGuardada && !errorConfiguracion && (
                <p
                  role="status"
                  className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
                >
                  Configuración guardada correctamente.
                </p>
              )}
            </form>

            <div className="mt-5 border-t border-slate-200 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-bold text-[#142D50]">
                  Distribución de cupos
                </h3>

                <button
                  type="button"
                  onClick={abrirNuevoTurno}
                  disabled={
                    temporadaGuardada === null ||
                    guardandoTurno ||
                    copiandoTurnos ||
                    guardandoCupos ||
                    guardandoConfiguracion ||
                    guardandoPeriodo
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={16} aria-hidden="true" />
                  Agregar turno
                </button>
              </div>

              {turnosCupos === null && !errorCupos && !errorConfiguracion && (
                <p role="status" className="mt-3 text-sm text-slate-600">
                  Cargando turnos…
                </p>
              )}

              {turnosCupos?.length === 0 && (
                <div className="mt-3 space-y-3">
                  <p className="text-sm text-slate-600">
                    La temporada activa todavía no tiene turnos cargados.
                  </p>

                  <button
                    type="button"
                    onClick={copiarTurnosTemporadaAnterior}
                    disabled={copiandoTurnos || guardandoTurno}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Copy size={16} aria-hidden="true" />
                    {copiandoTurnos
                      ? "Copiando turnos…"
                      : "Copiar turnos de la temporada anterior"}
                  </button>
                </div>
              )}

              {turnosCupos && turnosCupos.length > 0 && (
                <form onSubmit={guardarDistribucion} className="mt-4 space-y-4">
                  <fieldset
                    disabled={guardandoCupos || guardandoConfiguracion || guardandoPeriodo}
                    className="min-w-0"
                  >
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-700">
                          <tr>
                            <th scope="col" className="px-3 py-2">Sede</th>
                            <th scope="col" className="px-3 py-2">Período</th>
                            <th scope="col" className="px-3 py-2">Turno</th>
                            <th scope="col" className="px-3 py-2">Cupos</th>
                            <th scope="col" className="px-3 py-2">Disponibles</th>
                            <th scope="col" className="px-3 py-2">Acciones</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200">
                          {turnosCupos.map((turno) => (
                            <tr key={turno.id}>
                              <td className="px-3 py-2">{turno.sede}</td>
                              <td className="whitespace-nowrap px-3 py-2">
                                {turno.fecha_desde.split("-").reverse().join("/")}
                                {" al "}
                                {turno.fecha_hasta.split("-").reverse().join("/")}
                              </td>
                              <td className="px-3 py-2">{turno.nombre}</td>
                              <td className="px-3 py-2">
                                <input
                                  aria-label={`Cupos para ${turno.sede}, ${turno.nombre}`}
                                  type="number"
                                  min={0}
                                  max={MAX_CUPOS_TEMPORADA}
                                  step={1}
                                  required
                                  value={turno.cupoEditable}
                                  onChange={(evento) => {
                                    const cupoEditable = evento.target.value;
                                    setCuposGuardados(false);
                                    setErrorCupos("");
                                    setTurnosCupos((actuales) =>
                                      actuales?.map((actual) =>
                                        actual.id === turno.id
                                          ? { ...actual, cupoEditable }
                                          : actual,
                                      ) ?? null,
                                    );
                                  }}
                                  className="w-24 rounded-lg border border-slate-300 px-2 py-1.5"
                                />
                              </td>
                              <td className="px-3 py-2 font-semibold text-[#142D50]">
                                {turno.cupos_disponibles}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => abrirEdicionTurno(turno)}
                                    disabled={
                                      guardandoTurno ||
                                      copiandoTurnos ||
                                      guardandoCupos
                                    }
                                    aria-label={`Editar ${turno.nombre} de ${turno.sede}`}
                                    className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Pencil size={16} aria-hidden="true" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => borrarTurno(turno)}
                                    disabled={
                                      guardandoTurno ||
                                      copiandoTurnos ||
                                      guardandoCupos
                                    }
                                    aria-label={`Eliminar ${turno.nombre} de ${turno.sede}`}
                                    className="rounded-lg border border-red-200 p-1.5 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Trash2 size={16} aria-hidden="true" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </fieldset>

                  <p
                    className={`text-sm font-semibold ${
                      superaLimite ? "text-red-700" : "text-slate-700"
                    }`}
                  >
                    {totalBorrador} de {MAX_CUPOS_TEMPORADA} cupos asignados
                    {superaLimite && " · Supera el máximo de la temporada"}
                  </p>

                  <button
                    type="submit"
                    disabled={
                      guardandoCupos ||
                      guardandoConfiguracion ||
                      guardandoPeriodo ||
                      superaLimite
                    }
                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {guardandoCupos ? "Guardando…" : "Guardar distribución"}
                  </button>
                </form>
              )}

              {turnoEnEdicion !== null && (
                <form
                  onSubmit={guardarTurno}
                  className="mt-5 space-y-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4"
                >
                  <h4 className="font-bold text-[#142D50]">
                    {turnoEnEdicion === "nuevo"
                      ? "Nuevo turno"
                      : `Editar ${turnoEnEdicion.nombre}`}
                  </h4>

                  <fieldset
                    disabled={guardandoTurno || copiandoTurnos}
                    className="grid grid-cols-1 gap-4 md:grid-cols-2"
                  >
                    <label className="text-sm font-semibold text-slate-700">
                      Nombre
                      <input
                        type="text"
                        required
                        maxLength={120}
                        value={formularioTurno.nombre}
                        onChange={(evento) =>
                          setFormularioTurno((actual) => ({
                            ...actual,
                            nombre: evento.target.value,
                          }))
                        }
                        className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Sede
                      <input
                        type="text"
                        required
                        maxLength={120}
                        value={formularioTurno.sede}
                        onChange={(evento) =>
                          setFormularioTurno((actual) => ({
                            ...actual,
                            sede: evento.target.value,
                          }))
                        }
                        className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Fecha de inicio
                      <input
                        type="date"
                        required
                        value={formularioTurno.fecha_desde}
                        onChange={(evento) =>
                          setFormularioTurno((actual) => ({
                            ...actual,
                            fecha_desde: evento.target.value,
                          }))
                        }
                        className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Fecha de fin
                      <input
                        type="date"
                        required
                        value={formularioTurno.fecha_hasta}
                        onChange={(evento) =>
                          setFormularioTurno((actual) => ({
                            ...actual,
                            fecha_hasta: evento.target.value,
                          }))
                        }
                        className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Cupos
                      <input
                        type="number"
                        min={0}
                        max={MAX_CUPOS_TEMPORADA}
                        step={1}
                        required
                        value={formularioTurno.cupoEditable}
                        onChange={(evento) =>
                          setFormularioTurno((actual) => ({
                            ...actual,
                            cupoEditable: evento.target.value,
                          }))
                        }
                        className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>
                  </fieldset>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={guardandoTurno || copiandoTurnos}
                      className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {guardandoTurno ? "Guardando…" : "Guardar turno"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTurnoEnEdicion(null);
                        setErrorTurno("");
                      }}
                      disabled={guardandoTurno}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {errorTurno && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800"
                >
                  {errorTurno}
                </p>
              )}

              {mensajeTurno && (
                <p
                  role="status"
                  className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
                >
                  {mensajeTurno}
                </p>
              )}

              {errorCupos && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800"
                >
                  {errorCupos}
                </p>
              )}

              {cuposGuardados && (
                <p
                  role="status"
                  className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
                >
                  Distribución guardada correctamente.
                </p>
              )}
            </div>

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
                    disabled={guardandoPeriodo || guardandoConfiguracion || guardandoCupos}
                    onChange={() => {
                      setPeriodoGuardado(false);
                      setPeriodoEliminado(false);
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

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={guardandoPeriodo || guardandoConfiguracion || guardandoCupos}
                      className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {guardandoPeriodo ? "Guardando…" : "Guardar período"}
                    </button>

                    {periodo.apertura && (
                      <button
                        type="button"
                        onClick={() => void manejarBorradoPeriodo()}
                        disabled={
                          borrandoPeriodo ||
                          guardandoPeriodo ||
                          guardandoConfiguracion ||
                          guardandoCupos
                        }
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {borrandoPeriodo ? "Borrando…" : "Borrar período"}
                      </button>
                    )}
                  </div>
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

              {periodoEliminado && (
                <p
                  role="status"
                  className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"
                >
                  Período eliminado. La inscripción queda cerrada hasta que
                  configures uno nuevo.
                </p>
              )}
            </div>

            <div className="mt-5 border-t border-slate-200 pt-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                  <History size={20} aria-hidden="true" />
                </div>

                <div className="min-w-0">
                  <h3 className="font-bold text-[#142D50]">
                    Historial de temporadas
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Consultá los turnos de la temporada activa y de las
                    anteriores.
                  </p>
                </div>
              </div>

              {temporadas.length > 0 && (
                <label className="mt-4 block max-w-xs text-sm font-semibold text-slate-700">
                  Temporada
                  <select
                    value={temporadaHistorial}
                    onChange={(evento) =>
                      setTemporadaHistorial(evento.target.value)
                    }
                    className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2"
                  >
                    {temporadas.map((temporada) => (
                      <option
                        key={temporada.temporada}
                        value={temporada.temporada}
                      >
                        {temporada.temporada}
                        {temporada.activa ? " (activa)" : ""} ·{" "}
                        {temporada.turnos}{" "}
                        {temporada.turnos === 1 ? "turno" : "turnos"}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {cargandoHistorial && (
                <p role="status" className="mt-3 text-sm text-slate-600">
                  Cargando los turnos de la temporada…
                </p>
              )}

              {errorHistorial && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800"
                >
                  {errorHistorial}
                </p>
              )}

              {!cargandoHistorial &&
                !errorHistorial &&
                temporadas.length === 0 && (
                  <p className="mt-3 text-sm text-slate-600">
                    Todavía no hay temporadas registradas.
                  </p>
                )}

              {!cargandoHistorial &&
                !errorHistorial &&
                turnosHistorial &&
                (turnosHistorial.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">
                    La temporada {temporadaHistorial} no tiene turnos cargados.
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th scope="col" className="px-3 py-2">Período</th>
                          <th scope="col" className="px-3 py-2">Turno</th>
                          <th scope="col" className="px-3 py-2">Sede</th>
                          <th scope="col" className="px-3 py-2">Cupos</th>
                          <th scope="col" className="px-3 py-2">
                            Disponibles
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {turnosHistorial.map((turno) => (
                          <tr
                            key={turno.id}
                            className="border-t border-slate-100"
                          >
                            <td className="whitespace-nowrap px-3 py-2">
                              {turno.fecha_desde} → {turno.fecha_hasta}
                            </td>
                            <td className="px-3 py-2 font-semibold text-[#142D50]">
                              {turno.nombre}
                            </td>
                            <td className="px-3 py-2">{turno.sede}</td>
                            <td className="px-3 py-2">{turno.cupo_total}</td>
                            <td className="px-3 py-2">
                              {turno.cupos_disponibles}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

              {temporadas.length > 0 && (
                <p className="mt-3 text-xs text-slate-500">
                  {(() => {
                    const seleccionada = temporadas.find(
                      (item) =>
                        String(item.temporada) === temporadaHistorial,
                    );
                    const cantidad = seleccionada?.inscripciones ?? 0;

                    return `${cantidad} ${
                      cantidad === 1 ? "inscripción" : "inscripciones"
                    } registradas en la temporada seleccionada.`;
                  })()}
                </p>
              )}
            </div>
          </section>

          <div className="mt-6 flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
            <Info size={20} className="shrink-0" />
            <p>El total de cupos se calcula a partir de la distribución guardada.</p>
          </div>
        </div>

        <section
          hidden={!mostrarEstado}
          className="mb-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6"
        >
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

          {estado && (
            <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-slate-500">Aplicación</p>
                <p className="font-semibold text-[#142D50]">{estado.app}</p>
              </div>
              <div>
                <p className="text-slate-500">Versión</p>
                <p className="font-semibold text-[#142D50]">{estado.version}</p>
              </div>
              <div>
                <p className="text-slate-500">Entorno</p>
                <p className="font-semibold text-[#142D50]">
                  {estado.environment}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Temporada activa</p>
                <p className="font-semibold text-[#142D50]">
                  {estado.temporada}
                </p>
              </div>
            </div>
          )}

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
                <CheckCircle2 size={19} className="shrink-0" aria-hidden="true" />
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

        <section
          hidden={!mostrarPerfiles}
          className="rounded-2xl bg-white p-5 shadow-sm sm:p-6"
        >
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
            La autenticación y los roles se gestionan con Keycloak. La creación
            de usuarios y la asignación de roles se hacen desde la consola de
            administración de Keycloak, no desde este panel.
          </p>
        </section>
      </div>
    </main>
  );
}

export default AdministracionSistemaPage;