import { UsersRound } from "lucide-react";
import SeccionInscripcion from "./SeccionInscripcion";

type CamposParticipante = {
  nombre_chico: string;
  apellido_chico: string;
  dni_chico: string;
  fecha_nacimiento: string;
};

type DatosInscriptoProps = {
  formulario: CamposParticipante;
  actualizarCampo: (campo: keyof CamposParticipante, valor: string) => void;
  estiloInput: string;
};

export default function DatosInscripto({
  formulario,
  actualizarCampo,
  estiloInput,
}: DatosInscriptoProps) {
  return (
    <SeccionInscripcion
      titulo="Datos del chico"
      descripcion="Ingresá los datos del inscripto."
      icono={UsersRound}
      estiloIcono="bg-emerald-100 text-emerald-700"
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="nombre_chico"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Nombre *
          </label>

          <input
            id="nombre_chico"
            type="text"
            minLength={2}
            maxLength={100}
            required
            value={formulario.nombre_chico}
            onChange={(e) => actualizarCampo("nombre_chico", e.target.value)}
            className={estiloInput}
            placeholder="Nombre"
          />
        </div>

        <div>
          <label
            htmlFor="apellido_chico"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Apellido *
          </label>

          <input
            id="apellido_chico"
            type="text"
            minLength={2}
            maxLength={100}
            required
            value={formulario.apellido_chico}
            onChange={(e) => actualizarCampo("apellido_chico", e.target.value)}
            className={estiloInput}
            placeholder="Apellido"
          />
        </div>

        <div>
          <label
            htmlFor="dni_chico"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            DNI *
          </label>

          <input
            id="dni_chico"
            type="text"
            minLength={6}
            maxLength={20}
            required
            value={formulario.dni_chico}
            onChange={(e) => actualizarCampo("dni_chico", e.target.value)}
            className={estiloInput}
            placeholder="DNI sin puntos"
          />
        </div>

        <div>
          <label
            htmlFor="fecha_nacimiento"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Fecha de nacimiento *
          </label>

          <input
            id="fecha_nacimiento"
            type="date"
            required
            max={new Date().toLocaleDateString("en-CA")}
            value={formulario.fecha_nacimiento}
            onChange={(e) =>
              actualizarCampo("fecha_nacimiento", e.target.value)
            }
            className={estiloInput}
          />
        </div>
      </div>
    </SeccionInscripcion>
  );
}
