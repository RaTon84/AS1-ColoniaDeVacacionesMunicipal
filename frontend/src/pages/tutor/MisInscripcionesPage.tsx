import { Link } from "react-router-dom";
import { Plus, ClipboardList, Info } from "lucide-react";
import { adaptarInscripcion } from "../../utils/adaptarInscripcion";
import InscripcionCard from "../../components/InscripcionesCard";
import { useEffect, useState } from "react";
import type { Inscripcion } from "../../types/inscripcion";
import keycloak from "../../auth/keycloak";
import {
  obtenerMisInscripciones,
  cancelarInscripcion,
} from "../../services/inscripciones";
import { obtenerTurnos } from "../../services/turnos";

function MisInscripcionesPage() {
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
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
          obtenerMisInscripciones(token),
          obtenerTurnos(token),
        ]);

        const datos = registros.map((registro) =>
          adaptarInscripcion(registro, turnos),
        );

        if (activo) {
          setInscripciones(datos);
        }
      } catch (error) {
        if (activo) {
          setError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar tus inscripciones.",
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

  async function manejarCancelacion(inscripcion: Inscripcion) {
    if (cancelandoId !== null) return;

    const confirmar = window.confirm(
      `¿Querés cancelar la inscripción de ${inscripcion.nombre_chico} ${inscripcion.apellido_chico}?`,
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
        `La inscripción de ${inscripcion.nombre_chico} ${inscripcion.apellido_chico} fue cancelada correctamente.`,
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

  return (
    <main className="min-h-screen bg-transparent px-5 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[#142D50]">
              Mis inscripciones
            </h1>

            <p className="mt-2 text-slate-600">
              Consultá las inscripciones realizadas en la colonia municipal.
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

        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <ClipboardList size={22} className="text-[#1769B3]" />

            <h2 className="text-xl font-bold text-[#142D50]">
              Solicitudes realizadas
            </h2>
          </div>

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

          {cargando ? (
            <p role="status" className="py-6 text-slate-500">
              Cargando tus inscripciones...
            </p>
          ) : error ? (
            <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
              {error}
            </p>
          ) : inscripciones.length > 0 ? (
            <div className="flex flex-col gap-4">
              {inscripciones.map((inscripcion) => (
                <InscripcionCard
                  key={inscripcion.id}
                  inscripcion={inscripcion}
                  onCancelar={manejarCancelacion}
                  cancelando={cancelandoId !== null}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 px-6 py-12 text-center">
              <ClipboardList
                size={42}
                className="mx-auto mb-4 text-slate-400"
              />

              <h3 className="text-lg font-bold text-[#142D50]">
                Todavía no hay inscripciones
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Cuando realices una inscripción, vas a poder consultarla desde
                acá.
              </p>
            </div>
          )}
        </section>

        <div className="mt-6 flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
          <Info size={20} className="shrink-0" />

          <p>
            Acá se muestran únicamente las inscripciones que realizaste con tu
            usuario en la temporada actual.
          </p>
        </div>
      </div>
    </main>
  );
}

export default MisInscripcionesPage;