import type { FormEvent } from "react";

type FormularioTemporadaProps = {
  temporada: string;
  edadMinima: string;
  edadMaxima: string;
  totalGuardado: number | undefined;
  cargando: boolean;
  bloqueado: boolean;
  guardando: boolean;
  error: string;
  onCambiarTemporada: (valor: string) => void;
  onCambiarEdadMinima: (valor: string) => void;
  onCambiarEdadMaxima: (valor: string) => void;
  onGuardar: (evento: FormEvent<HTMLFormElement>) => void;
};

const estiloCampo =
  "mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2";

export default function FormularioTemporada({
  temporada,
  edadMinima,
  edadMaxima,
  totalGuardado,
  cargando,
  bloqueado,
  guardando,
  error,
  onCambiarTemporada,
  onCambiarEdadMinima,
  onCambiarEdadMaxima,
  onGuardar,
}: FormularioTemporadaProps) {
  return (
    <>
      {cargando && !error && (
        <p role="status" className="mb-4 text-sm text-slate-600">
          Cargando la configuración de la temporada…
        </p>
      )}

      <form onSubmit={onGuardar} className="space-y-4">
        <fieldset
          disabled={bloqueado}
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
              value={temporada}
              onChange={(evento) => onCambiarTemporada(evento.target.value)}
              className={estiloCampo}
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
              onChange={(evento) => onCambiarEdadMinima(evento.target.value)}
              className={estiloCampo}
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
              onChange={(evento) => onCambiarEdadMaxima(evento.target.value)}
              className={estiloCampo}
            />
          </label>
        </fieldset>

        <button
          type="submit"
          disabled={bloqueado}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar configuración"}
        </button>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}
      </form>
    </>
  );
}