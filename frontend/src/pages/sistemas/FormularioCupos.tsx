import type { FormEvent } from "react";
import TablaCupos, { type TurnoEditable } from "./TablaCupos";

type FormularioCuposProps = {
  turnos: TurnoEditable[] | null;
  cargando: boolean;
  bloqueado: boolean;
  guardando: boolean;
  guardado: boolean;
  error: string;
  total: number;
  maxCupos: number;
  superaLimite: boolean;
  onCambiarCupo: (id: TurnoEditable["id"], valor: string) => void;
  onGuardar: (evento: FormEvent<HTMLFormElement>) => void;
};

export default function FormularioCupos({
  turnos,
  cargando,
  bloqueado,
  guardando,
  guardado,
  error,
  total,
  maxCupos,
  superaLimite,
  onCambiarCupo,
  onGuardar,
}: FormularioCuposProps) {
  return (
    <div className="mt-5 border-t border-slate-200 pt-5">
      <h3 className="font-bold text-[#142D50]">Distribución de cupos</h3>

      {cargando && (
        <p role="status" className="mt-3 text-sm text-slate-600">
          Cargando turnos…
        </p>
      )}

      {turnos?.length === 0 && (
        <p className="mt-3 text-sm text-slate-600">
          La temporada activa todavía no tiene turnos cargados.
        </p>
      )}

      {turnos && turnos.length > 0 && (
        <form onSubmit={onGuardar} className="mt-4 space-y-4">
          <fieldset disabled={bloqueado} className="min-w-0">
            <TablaCupos
              turnosCupos={turnos}
              maxCupos={maxCupos}
              onCambiarCupo={onCambiarCupo}
            />
          </fieldset>

          <p
            className={`text-sm font-semibold ${
              superaLimite ? "text-red-700" : "text-slate-700"
            }`}
          >
            {total} de {maxCupos} cupos asignados
            {superaLimite && " · Supera el máximo de la temporada"}
          </p>

          <button
            type="submit"
            disabled={bloqueado || superaLimite}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Guardar distribución"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {guardado && (
        <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          Distribución guardada correctamente.
        </p>
      )}
    </div>
  );
}