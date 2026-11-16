import { CalendarDays, Clock3, UsersRound } from "lucide-react";
import ResumenCard from "../../components/ResumenCard";

type ResumenTemporadaProps = {
  temporada: number | string;
  cupos: number | string;
  estadoPeriodo: string;
};

export default function ResumenTemporada({
  temporada,
  cupos,
  estadoPeriodo,
}: ResumenTemporadaProps) {
  return (
    <section
      aria-label="Resumen de configuración"
      className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      <ResumenCard
        titulo="Temporada"
        valor={temporada}
        icono={<CalendarDays size={28} />}
        fondoIcono="bg-blue-100 text-blue-700"
      />

      <ResumenCard
        titulo="Cupos previstos"
        valor={cupos}
        icono={<UsersRound size={28} />}
        fondoIcono="bg-emerald-100 text-emerald-700"
      />

      <ResumenCard
        titulo="Período de inscripción"
        valor={estadoPeriodo}
        icono={<Clock3 size={28} />}
        fondoIcono="bg-amber-100 text-amber-700"
      />
    </section>
  );
}