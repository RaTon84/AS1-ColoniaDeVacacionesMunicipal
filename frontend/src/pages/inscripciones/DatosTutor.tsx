import { UserRound } from "lucide-react";
import SeccionInscripcion from "./SeccionInscripcion";
type CamposTutor = {
  nombre_tutor: string;
  apellido_tutor: string;
  dni_tutor: string;
  email_tutor: string;
  telefono_tutor: string;
};

type DatosTutorProps = {
  formulario: CamposTutor;
  actualizarCampo: (campo: keyof CamposTutor, valor: string) => void;
  estiloInput: string;
  esAdministrativo: boolean;
};

export default function DatosTutor({
  formulario,
  actualizarCampo,
  estiloInput,
  esAdministrativo,
}: DatosTutorProps) {
  return (
    <SeccionInscripcion
      titulo="Datos del tutor"
      descripcion="Ingresá los datos de la persona responsable."
      icono={UserRound}
      estiloIcono="bg-violet-100 text-violet-700"
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="nombre_tutor"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Nombre *
          </label>

          <input
            id="nombre_tutor"
            type="text"
            value={formulario.nombre_tutor}
            onChange={(e) => actualizarCampo("nombre_tutor", e.target.value)}
            disabled={!esAdministrativo}
            required={esAdministrativo}
            className={`${estiloInput} disabled:cursor-not-allowed disabled:bg-slate-100`}
          />
        </div>

        <div>
          <label
            htmlFor="apellido_tutor"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Apellido *
          </label>

          <input
            id="apellido_tutor"
            type="text"
            value={formulario.apellido_tutor}
            onChange={(e) => actualizarCampo("apellido_tutor", e.target.value)}
            disabled={!esAdministrativo}
            required={esAdministrativo}
            className={`${estiloInput} disabled:cursor-not-allowed disabled:bg-slate-100`}
          />
        </div>

        <div>
          <label
            htmlFor="dni_tutor"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            DNI *
          </label>

          <input
            id="dni_tutor"
            type="text"
            minLength={6}
            maxLength={20}
            required
            value={formulario.dni_tutor}
            onChange={(e) => actualizarCampo("dni_tutor", e.target.value)}
            className={estiloInput}
            placeholder="DNI sin puntos"
          />
        </div>

        <div>
          <label
            htmlFor="email_tutor"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Correo electrónico *
          </label>

          <input
            id="email_tutor"
            type="email"
            required
            value={formulario.email_tutor}
            onChange={(e) => actualizarCampo("email_tutor", e.target.value)}
            className={estiloInput}
            placeholder="correo@ejemplo.com"
          />
        </div>

        <div>
          <label
            htmlFor="telefono_tutor"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Teléfono *
          </label>

          <input
            id="telefono_tutor"
            type="tel"
            minLength={6}
            maxLength={50}
            required
            value={formulario.telefono_tutor}
            onChange={(e) => actualizarCampo("telefono_tutor", e.target.value)}
            className={estiloInput}
            placeholder="Teléfono de contacto"
          />
        </div>
      </div>
    </SeccionInscripcion>
  );
}
