import type { FormEvent } from "react";

type FormularioPeriodoProps = {
  periodoCargado: boolean;
  apertura: string;
  cierre: string;
  bloqueado: boolean;
  guardando: boolean;
  guardado: boolean;
  error: string;
  onCambiarApertura: (valor: string) => void;
  onCambiarCierre: (valor: string) => void;
  onEditar: () => void;
  onGuardar: (evento: FormEvent<HTMLFormElement>) => void;
};

export default function FormularioPeriodo({
  periodoCargado,
  apertura,
  cierre,
  bloqueado,
  guardando,
  guardado,
  error,
  onCambiarApertura,
  onCambiarCierre,
  onEditar,
  onGuardar,
}: FormularioPeriodoProps) {
  return (
    <div className="mt-5 border-t border-slate-200 pt-5">
      <h3 className="font-bold text-[#142D50]">Período de inscripción</h3>
      <p className="mt-1 text-sm text-slate-600">Hora argentina.</p>

      {!periodoCargado && !error && (
        <p role="status" className="mt-3 text-sm text-slate-600">
          Cargando el período de inscripción…
        </p>
      )}

      {periodoCargado && (
        <form onSubmit={onGuardar} className="mt-4 space-y-4">
          <fieldset
            disabled={bloqueado}
            onChange={onEditar}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <label className="min-w-0 text-sm font-semibold text-slate-700">
              Apertura
              <input
                type="datetime-local"
                required
                value={apertura}
                onChange={(evento) => onCambiarApertura(evento.target.value)}
                className="mt-2 block w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="min-w-0 text-sm font-semibold text-slate-700">
              Cierre
              <input
                type="datetime-local"
                required
                value={cierre}
                onChange={(evento) => onCambiarCierre(evento.target.value)}
                className="mt-2 block w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
          </fieldset>

          <button
            type="submit"
            disabled={bloqueado}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Guardar período"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {guardado && (
        <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          Período guardado correctamente.
        </p>
      )}
    </div>
  );
}