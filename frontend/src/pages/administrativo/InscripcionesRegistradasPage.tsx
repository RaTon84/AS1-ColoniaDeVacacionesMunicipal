import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, UsersRound, Plus, Info } from "lucide-react";
import InscripcionesCard from "../../components/InscripcionesCard";
import { adaptarInscripcion } from "../../utils/adaptarInscripcion";
import type { Inscripcion } from "../../types/inscripcion";
import keycloak from "../../auth/keycloak";
import {
  obtenerInscripcionesRegistradas,
  cancelarInscripcion,
} from "../../services/inscripciones";
import { obtenerTurnos } from "../../services/turnos";
import type { Turno } from "../../types/turno";

type FiltroEstado = "Todas" | Inscripcion["estado"];

function InscripcionesRegistradasPage() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("Todas");
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [filtroTurno, setFiltroTurno] = useState("");
  const [cancelandoId, setCancelandoId] = useState<number | null>(null);
  const [errorCancelacion, setErrorCancelacion] = useState("");
  const [mensajeCancelacion, setMensajeCancelacion] = useState("");
  const [actualizacion, setActualizacion] = useState(0);

  useEffect(() => {
    let activo = true;

    async function cargarInscripciones() {
      try {
        await keycloak.updateToken(30);

        const token = keycloak.token;

        if (!token) {
          throw new Error("No hay una sesión activa.");
        }

        const [registros, turnos] = await Promise.all([
          obtenerInscripcionesRegistradas(token),
          obtenerTurnos(token),
        ]);

        const datos = registros.map((registro) =>
          adaptarInscripcion(registro, turnos),
        );

        if (activo) {
          setInscripciones(datos);
          setTurnos(turnos);
        }
      } catch (error) {
        if (activo) {
          setErrorCarga(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las inscripciones.",
          );
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void cargarInscripciones();

    return () => {
      activo = false;
    };
  }, [actualizacion]);

  // Filtrar por nombre, apellido, DNI y estado
  async function manejarCancelacion(inscripcion: Inscripcion) {
    if (cancelandoId !== null) return;

    const confirmar = window.confirm(
      `¿Querés cancelar la inscripción de ` +
        `${inscripcion.nombre_chico} ${inscripcion.apellido_chico}?`,
    );

    if (!confirmar) return;

    setCancelandoId(inscripcion.id);
    setErrorCancelacion("");
    setMensajeCancelacion("");

    try {
      await keycloak.updateToken(30);

      const token = keycloak.token;

      if (!token) {
        throw new Error("No hay una sesión activa.");
      }

      await cancelarInscripcion(inscripcion.id, token);

      setMensajeCancelacion(
        `La inscripción de ${inscripcion.nombre_chico} ` +
          `${inscripcion.apellido_chico} fue cancelada.`,
      );

      setActualizacion((anterior) => anterior + 1);
    } catch (error) {
      setErrorCancelacion(
        error instanceof Error
          ? error.message
          : "No se pudo cancelar la inscripción.",
      );
    } finally {
      setCancelandoId(null);
    }
  }
  const inscripcionesFiltradas = inscripciones.filter((inscripcion) => {
    const texto = busqueda.trim().toLocaleLowerCase("es");

    const nombreCompleto =
      `${inscripcion.nombre_chico} ${inscripcion.apellido_chico}`.toLocaleLowerCase(
        "es",
      );

    const coincideBusqueda =
      nombreCompleto.includes(texto) || inscripcion.dni_chico.includes(texto);

    const coincideEstado =
      filtroEstado === "Todas" || inscripcion.estado === filtroEstado;

    const coincideTurno =
      filtroTurno === "" || inscripcion.turno_id === Number(filtroTurno);

    return coincideBusqueda && coincideEstado && coincideTurno;
  });

  // Ordenar por posición cuando se filtra la lista de espera
  const resultadosOrdenados =
    filtroEstado === "Lista de espera"
      ? [...inscripcionesFiltradas].sort(
          (a, b) =>
            (a.posicion_espera ?? Infinity) - (b.posicion_espera ?? Infinity),
        )
      : inscripcionesFiltradas;

  return (
    <div className="bg-transparent px-5 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[#142D50]">
              Inscripciones registradas
            </h1>

            <p className="mt-2 text-slate-600">
              Consultá todas las inscripciones, buscá y filtrá por estado.
            </p>
          </div>

          <Link
            to="/inscripciones/nueva"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1769B3] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            <Plus size={19} />
            Nueva inscripción
          </Link>
        </header>

        {/* Listado de inscripciones */}
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <UsersRound size={24} className="text-[#1769B3]" />

            <div>
              <h2 className="text-xl font-bold text-[#142D50]">
                Listado de inscripciones
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Buscá, filtrá y desplegá los detalles.
              </p>
            </div>
          </div>

          {/* Buscador y filtro */}
          <div className="mb-5 flex flex-col gap-3 md:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                size={19}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, apellido o DNI..."
                aria-label="Buscar inscripciones"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
              aria-label="Filtrar por estado"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="Todas">Todos los estados</option>
              <option value="Confirmada">Confirmadas</option>
              <option value="En revisión">En revisión</option>
              <option value="Lista de espera">Lista de espera</option>
            </select>

            <select
              value={filtroTurno}
              onChange={(e) => setFiltroTurno(e.target.value)}
              aria-label="Filtrar por turno"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Todos los turnos</option>

              {turnos.map((turno) => (
                <option key={turno.id} value={turno.id}>
                  {turno.nombre} · {turno.sede}
                </option>
              ))}
            </select>
          </div>

          <p className="mb-4 text-sm text-slate-500">
            {resultadosOrdenados.length}{" "}
            {resultadosOrdenados.length === 1 ? "resultado" : "resultados"}
          </p>

          {cargando && (
            <p role="status" className="mb-4 text-sm text-slate-600">
              Cargando inscripciones...
            </p>
          )}

          {!cargando && errorCarga && (
            <p
              role="alert"
              className="mb-4 rounded-xl bg-red-50 p-4 text-red-700"
            >
              {errorCarga}
            </p>
          )}

          {errorCancelacion && (
            <p
              role="alert"
              className="mb-4 rounded-xl bg-red-50 p-4 text-red-700"
            >
              {errorCancelacion}
            </p>
          )}

          {mensajeCancelacion && (
            <p
              role="status"
              className="mb-4 rounded-xl bg-green-50 p-4 text-green-800"
            >
              {mensajeCancelacion}
            </p>
          )}

          {/* Tarjetas de inscripciones */}
          {cargando || errorCarga ? null : resultadosOrdenados.length > 0 ? (
            <div className="flex flex-col gap-4">
              {resultadosOrdenados.map((inscripcion) => (
                <InscripcionesCard
                  key={inscripcion.id}
                  inscripcion={inscripcion}
                  onCancelar={manejarCancelacion}
                  cancelando={cancelandoId !== null}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 px-6 py-12 text-center">
              <Search size={38} className="mx-auto mb-4 text-slate-400" />

              <h3 className="font-bold text-[#142D50]">
                No encontramos inscripciones
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Probá con otros datos o cambiá el filtro.
              </p>

              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setFiltroEstado("Todas");
                  setFiltroTurno("");
                }}
                className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-[#1769B3] hover:bg-blue-50"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </section>

        {/* Aviso sobre los datos de ejemplo */}
        <div className="mt-6 flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
          <Info size={20} className="shrink-0" />

          <p>
            Las inscripciones mostradas corresponden a los registros guardados
            en el sistema para la temporada actual.
          </p>
        </div>
      </div>
    </div>
  );
}

export default InscripcionesRegistradasPage;
