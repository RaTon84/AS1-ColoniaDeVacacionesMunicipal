import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Info } from "lucide-react";
import keycloak from "../../auth/keycloak";
import { obtenerEstadoSistema } from "../../services/sistema";
import { ServiciosSistema } from "./EstadoSistema";

export default function EstadoSistemaSeccion({
  visible,
}: {
  visible: boolean;
}) {
      const [estado, setEstado] = useState<Awaited<
        ReturnType<typeof obtenerEstadoSistema>
      > | null>(null);
      const [errorEstado, setErrorEstado] = useState(false);
      const [comprobacion, setComprobacion] = useState(0);
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

  return (
    <section
          hidden={!visible}
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

          <ServiciosSistema resultados={estado?.services} />

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
  );
}