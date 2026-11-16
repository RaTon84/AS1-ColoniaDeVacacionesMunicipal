import type { ReactNode } from "react";

interface ResumenCardProps {
  titulo: string;
  valor: number | string;
  icono: ReactNode;
  fondoIcono: string;
}

function ResumenCard({
  titulo,
  valor,
  icono,
  fondoIcono,
}: ResumenCardProps) {
  return (
    <article className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
      <div className={`rounded-xl p-3 ${fondoIcono}`}>
        {icono}
      </div>

      <div>
        <p className="text-sm text-slate-500">{titulo}</p>
        <p className="text-2xl font-extrabold text-[#142D50]">{valor}</p>
      </div>
    </article>
  );
}

export default ResumenCard;