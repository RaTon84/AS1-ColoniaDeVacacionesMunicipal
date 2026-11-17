import { useEffect, useState, type FormEvent } from "react";
import { Info, CalendarCog } from "lucide-react";
import keycloak from "../../auth/keycloak";
import ResumenTemporada from "./ResumenTemporada";
import {
  guardarPeriodoInscripcion,
  obtenerConfiguracionTemporada,
  obtenerPeriodoInscripcion,
  guardarConfiguracionTemporada,
  guardarDistribucionCupos,
  type PeriodoInscripcion,
} from "../../services/sistema";
import { obtenerTurnos } from "../../services/turnos";
import FormularioCupos from "./FormularioCupos";
import type { TurnoEditable } from "./TablaCupos";
import FormularioPeriodo from "./FormularioPeriodo";
import FormularioTemporada from "./FormularioTemporada";

const MAX_CUPOS_TEMPORADA = 600;

async function obtenerTokenActivo(): Promise<string> {
  await keycloak.updateToken(30);
  const token = keycloak.token;
  if (!token) {
    throw new Error("Volvé a iniciar sesión.");
  }
  return token;
}

export default function ConfiguracionTemporada({
  visible,
}: {
  visible: boolean;
}) {
  const [periodo, setPeriodo] = useState<PeriodoInscripcion | null>(null);
  const [apertura, setApertura] = useState("");
  const [cierre, setCierre] = useState("");
  const [guardandoPeriodo, setGuardandoPeriodo] = useState(false);
  const [errorPeriodo, setErrorPeriodo] = useState("");
  const [periodoGuardado, setPeriodoGuardado] = useState(false);
  const [temporadaGuardada, setTemporadaGuardada] = useState<number | null>(
    null,
  );
  const [temporadaEditable, setTemporadaEditable] = useState("");
  const [edadMinima, setEdadMinima] = useState("");
  const [edadMaxima, setEdadMaxima] = useState("");
  const [guardandoConfiguracion, setGuardandoConfiguracion] = useState(false);
  const [errorConfiguracion, setErrorConfiguracion] = useState("");
  const [turnosCupos, setTurnosCupos] = useState<TurnoEditable[] | null>(null);
  const [guardandoCupos, setGuardandoCupos] = useState(false);
  const [errorCupos, setErrorCupos] = useState("");
  const [cuposGuardados, setCuposGuardados] = useState(false);
  const totalGuardado = turnosCupos?.reduce(
    (total, turno) => total + turno.cupo_total,
    0,
  );
  const totalBorrador =
    turnosCupos?.reduce(
      (total, turno) => total + Number(turno.cupoEditable),
      0,
    ) ?? 0;
  const superaLimite = totalBorrador > MAX_CUPOS_TEMPORADA;

  useEffect(() => {
    let activo = true;

    async function cargarPeriodo() {
      try {
        const token = await obtenerTokenActivo();

        const datos = await obtenerPeriodoInscripcion(token);

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
        const token = await obtenerTokenActivo();

        const datos = await obtenerConfiguracionTemporada(token);

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
        const token = await obtenerTokenActivo();

        const turnos = await obtenerTurnos(token);
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
  }, [temporadaGuardada]);
  const hayGuardadoEnCurso =
    guardandoConfiguracion || guardandoPeriodo || guardandoCupos;

  async function guardarDistribucion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (
      temporadaGuardada === null ||
      !turnosCupos?.length ||
      hayGuardadoEnCurso ||
      superaLimite
    )
      return;

    setErrorCupos("");
    setCuposGuardados(false);
    setGuardandoCupos(true);

    try {
      const token = await obtenerTokenActivo();

      const turnos = await guardarDistribucionCupos(token, {
        temporada: temporadaGuardada,
        turnos: turnosCupos.map((turno) => ({
          turno_id: turno.id,
          cupo_total: Number(turno.cupoEditable),
        })),
      });

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

    if (hayGuardadoEnCurso) return;
    setErrorConfiguracion("");

    if (Number(edadMaxima) < Number(edadMinima)) {
      setErrorConfiguracion(
        "La edad máxima debe ser mayor o igual a la mínima.",
      );
      return;
    }

    setGuardandoConfiguracion(true);

    try {
      const token = await obtenerTokenActivo();

      await guardarConfiguracionTemporada(token, {
        temporada: Number(temporadaEditable),
        edad_minima: Number(edadMinima),
        edad_maxima: Number(edadMaxima),
      });

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

    if (hayGuardadoEnCurso) return;
    setErrorPeriodo("");
    setPeriodoGuardado(false);

    if (!apertura || !cierre || cierre <= apertura) {
      setErrorPeriodo("El cierre debe ser posterior a la apertura.");
      return;
    }

    setGuardandoPeriodo(true);

    try {
      const token = await obtenerTokenActivo();

      const datos = await guardarPeriodoInscripcion(token, apertura, cierre);

      setPeriodo(datos);
      setApertura(datos.apertura?.slice(0, 16) ?? "");
      setCierre(datos.cierre?.slice(0, 16) ?? "");
      setPeriodoGuardado(true);
    } catch (error) {
      setErrorPeriodo(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el período.",
      );
    } finally {
      setGuardandoPeriodo(false);
    }
  }

  return (
    <div hidden={!visible}>
      <ResumenTemporada
        temporada={temporadaGuardada ?? periodo?.temporada ?? "—"}
        cupos={totalGuardado ?? "—"}
        estadoPeriodo={
          periodo
            ? periodo.apertura && periodo.cierre
              ? "Configurado"
              : "Sin configurar"
            : "—"
        }
      />

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

        <FormularioTemporada
          temporada={temporadaEditable}
          edadMinima={edadMinima}
          edadMaxima={edadMaxima}
          totalGuardado={totalGuardado}
          cargando={temporadaGuardada === null}
          bloqueado={temporadaGuardada === null || hayGuardadoEnCurso}
          guardando={guardandoConfiguracion}
          error={errorConfiguracion}
          onCambiarTemporada={setTemporadaEditable}
          onCambiarEdadMinima={setEdadMinima}
          onCambiarEdadMaxima={setEdadMaxima}
          onGuardar={guardarConfiguracion}
        />

        <FormularioCupos
          turnos={turnosCupos}
          cargando={turnosCupos === null && !errorCupos && !errorConfiguracion}
          bloqueado={hayGuardadoEnCurso}
          guardando={guardandoCupos}
          guardado={cuposGuardados}
          error={errorCupos}
          total={totalBorrador}
          maxCupos={MAX_CUPOS_TEMPORADA}
          superaLimite={superaLimite}
          onCambiarCupo={(id, cupoEditable) => {
            setCuposGuardados(false);
            setErrorCupos("");
            setTurnosCupos(
              (actuales) =>
                actuales?.map((actual) =>
                  actual.id === id ? { ...actual, cupoEditable } : actual,
                ) ?? null,
            );
          }}
          onGuardar={guardarDistribucion}
        />

        <FormularioPeriodo
          periodoCargado={periodo !== null}
          apertura={apertura}
          cierre={cierre}
          bloqueado={hayGuardadoEnCurso}
          guardando={guardandoPeriodo}
          guardado={periodoGuardado}
          error={errorPeriodo}
          onCambiarApertura={setApertura}
          onCambiarCierre={setCierre}
          onEditar={() => {
            setPeriodoGuardado(false);
            setErrorPeriodo("");
          }}
          onGuardar={manejarGuardadoPeriodo}
        />
      </section>

      <div className="mt-6 flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
        <Info size={20} className="shrink-0" />
        <p>
          El total de cupos se calcula a partir de la distribución guardada.
        </p>
      </div>
    </div>
  );
}
