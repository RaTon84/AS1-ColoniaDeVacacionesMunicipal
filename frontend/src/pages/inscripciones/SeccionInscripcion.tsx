import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type SeccionInscripcionProps = {
  titulo: string;
  descripcion: string;
  icono: LucideIcon;
  estiloIcono: string;
  children: ReactNode;
};

export default function SeccionInscripcion({
  titulo,
  descripcion,
  icono: Icono,
  estiloIcono,
  children,
}: SeccionInscripcionProps) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className={`rounded-xl p-3 ${estiloIcono}`}>
          <Icono size={24} aria-hidden="true" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-[#142D50]">{titulo}</h2>
          <p className="text-sm text-slate-500">{descripcion}</p>
        </div>
      </div>

      {children}
    </section>
  );
}