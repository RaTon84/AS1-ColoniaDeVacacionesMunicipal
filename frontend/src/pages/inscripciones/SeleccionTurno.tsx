import { CalendarDays, Info } from "lucide-react";
import type { Turno } from "../../types/turno";
import SeccionInscripcion from "./SeccionInscripcion";

type SeleccionTurnoProps = {
  turnoId: string;
  turnos: Turno[];
  cargandoTurnos: boolean;
  errorTurnos: string;
  estiloInput: string;
  onCambiarTurno: (valor: string) => void;
};

export default function SeleccionTurno({
  turnoId,
  turnos,
  cargandoTurnos,
  errorTurnos,
  estiloInput,
  onCambiarTurno,
}: SeleccionTurnoProps) {
  return (
    <SeccionInscripcion
      titulo="Selección del turno"
      descripcion="Elegí el turno al que querés inscribir al chico."
      icono={CalendarDays}
      estiloIcono="bg-blue-100 text-blue-700"
    >
      <label
        htmlFor="turno"
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        Turno disponible *
      </label>

      <select
        id="turno"
        value={turnoId}
        onChange={(e) => onCambiarTurno(e.target.value)}
        className={estiloInput}
        required
        disabled={cargandoTurnos || Boolean(errorTurnos) || turnos.length === 0}
      >
        <option value="">
          {cargandoTurnos
            ? "Cargando turnos..."
            : errorTurnos
              ? "No se pudieron cargar los turnos"
              : turnos.length === 0
                ? "No hay turnos habilitados"
                : "Seleccioná un turno"}
        </option>

        {turnos.map((turno) => (
          <option key={turno.id} value={turno.id}>
            {turno.nombre} · {turno.sede} ·{" "}
            {turno.cupos_disponibles > 0
              ? `${turno.cupos_disponibles} cupos disponibles`
              : "Lista de espera"}
          </option>
        ))}
      </select>

      {errorTurnos && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {errorTurnos}
        </p>
      )}

      <div className="mt-4 flex gap-2 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
        <Info size={20} className="shrink-0" />
        <p>
          Si el turno está completo, la solicitud ingresará a la lista de
          espera.
        </p>
      </div>
    </SeccionInscripcion>
  );
}
