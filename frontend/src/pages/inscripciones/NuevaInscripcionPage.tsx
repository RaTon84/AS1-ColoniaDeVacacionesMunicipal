import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import keycloak from "../../auth/keycloak";
import { crearInscripcion } from "../../services/inscripciones";
import DatosInscripto from "./DatosInscripto";
import DatosTutor from "./DatosTutor";
import SeleccionTurno from "./SeleccionTurno";
import useTurnosInscripcion from "./useTurnosInscripcion";

interface FormularioInscripcion {
  turno_id: string;
  dni_chico: string;
  nombre_chico: string;
  apellido_chico: string;
  fecha_nacimiento: string;
  dni_tutor: string;
  nombre_tutor: string;
  apellido_tutor: string;
  email_tutor: string;
  telefono_tutor: string;
}

const datosIniciales: FormularioInscripcion = {
  turno_id: "",
  dni_chico: "",
  nombre_chico: "",
  apellido_chico: "",
  fecha_nacimiento: "",
  dni_tutor: "",
  nombre_tutor: "",
  apellido_tutor: "",
  email_tutor: "",
  telefono_tutor: "",
};

const estiloInput =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function NuevaInscripcionPage() {
  const esAdministrativo = keycloak.hasRealmRole("administrativo");
  const [formulario, setFormulario] = useState<FormularioInscripcion>(() => {
    if (esAdministrativo) {
      return { ...datosIniciales };
    }

    return {
      ...datosIniciales,
      nombre_tutor: keycloak.tokenParsed?.given_name ?? "",
      apellido_tutor: keycloak.tokenParsed?.family_name ?? "",
      email_tutor: keycloak.tokenParsed?.email ?? "",
    };
  });
  const { periodo, turnos, cargandoTurnos, errorTurnos } =
    useTurnosInscripcion();
  const [enviando, setEnviando] = useState(false);
  const [errorInscripcion, setErrorInscripcion] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  function actualizarCampo(campo: keyof FormularioInscripcion, valor: string) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (enviando || mensajeExito) return;

    setErrorInscripcion("");
    setMensajeExito("");

    if (!formulario.turno_id) {
      setErrorInscripcion("Seleccioná un turno.");
      return;
    }

    setEnviando(true);

    try {
      await keycloak.updateToken(30);

      if (!keycloak.token) {
        throw new Error("No hay una sesión activa. Volvé a iniciar sesión.");
      }

      const resultado = await crearInscripcion(
        {
          ...formulario,
          turno_id: Number(formulario.turno_id),
        },
        keycloak.token,
      );

      if (resultado.estado === "CONFIRMADA") {
        setMensajeExito(`Inscripción N.º ${resultado.id} confirmada.`);
      } else if (resultado.estado === "LISTA_ESPERA") {
        setMensajeExito(
          `Inscripción N.º ${resultado.id} en lista de espera. ` +
            `Posición: ${resultado.posicion_espera}.`,
        );
      }
    } catch (error) {
      setErrorInscripcion(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la inscripción.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen bg-transparent px-5 py-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#142D50]">
            Nueva inscripción
          </h1>

          <p className="mt-2 text-slate-600">
            Completá los datos para solicitar un cupo en la colonia de
            vacaciones municipal.
          </p>
        </header>

        {periodo?.estado !== "abierto" && (
          <p
            role="status"
            className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800"
          >
            {periodo?.estado === "pendiente" && periodo.apertura
              ? `Las inscripciones abren el ${new Date(
                  periodo.apertura,
                ).toLocaleString("es-AR", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "America/Argentina/Buenos_Aires",
                })} (hora argentina).`
              : periodo?.estado === "cerrado"
                ? "El período de inscripción ya cerró."
                : periodo?.estado === "sin_configurar"
                  ? "El período de inscripción todavía no fue configurado."
                  : errorTurnos || "Consultando el período de inscripción…"}
          </p>
        )}

        {periodo?.estado === "abierto" && (
          <form onSubmit={manejarEnvio} className="space-y-6">
            <SeleccionTurno
              turnoId={formulario.turno_id}
              turnos={turnos}
              cargandoTurnos={cargandoTurnos}
              errorTurnos={errorTurnos}
              estiloInput={estiloInput}
              onCambiarTurno={(valor) => actualizarCampo("turno_id", valor)}
            />

            <DatosInscripto
              formulario={formulario}
              actualizarCampo={actualizarCampo}
              estiloInput={estiloInput}
            />

            <DatosTutor
              formulario={formulario}
              actualizarCampo={actualizarCampo}
              estiloInput={estiloInput}
              esAdministrativo={esAdministrativo}
            />
            {errorInscripcion && (
              <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
                {errorInscripcion}
              </p>
            )}

            {mensajeExito && (
              <p
                role="status"
                className="rounded-xl bg-green-50 p-4 text-green-800"
              >
                {mensajeExito}
              </p>
            )}

            <div className="flex justify-end pb-6">
              <button
                type="submit"
                disabled={
                  enviando ||
                  cargandoTurnos ||
                  Boolean(errorTurnos) ||
                  !formulario.turno_id ||
                  Boolean(mensajeExito)
                }
                className="flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {enviando ? "Registrando..." : "Solicitar inscripción"}
                <ArrowRight size={20} />
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

export default NuevaInscripcionPage;
