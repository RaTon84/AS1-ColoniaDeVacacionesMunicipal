import { Database, KeyRound, Server, ShieldCheck } from "lucide-react";
import type { obtenerEstadoSistema } from "../../services/sistema";

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

type EstadoServicios = Awaited<
  ReturnType<typeof obtenerEstadoSistema>
>["services"];

export function ServiciosSistema({
  resultados,
}: {
  resultados: EstadoServicios | undefined;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {servicios.map((servicio) => {
              const Icono = servicio.icono;
              const resultado = resultados?.[servicio.id];

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
  );
}

export default function EstadoSistema() {
  return null;
}