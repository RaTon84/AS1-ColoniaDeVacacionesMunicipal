import { useEffect, useState } from "react";
import keycloak from "../../auth/keycloak";
import { obtenerTurnos } from "../../services/turnos";
import type { Turno } from "../../types/turno";
import {
  obtenerEstadoPeriodoInscripcion,
  type EstadoPeriodoInscripcion,
} from "../../services/inscripciones";

export default function useTurnosInscripcion() {
  const [periodo, setPeriodo] = useState<EstadoPeriodoInscripcion | null>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargandoTurnos, setCargandoTurnos] = useState(true);
  const [errorTurnos, setErrorTurnos] = useState("");

    useEffect(() => {
    let activo = true;

    async function cargarTurnos() {
      try {
        await keycloak.updateToken(30);

        if (!keycloak.token) {
          throw new Error("No hay una sesión activa. Volvé a iniciar sesión.");
        }

        const periodoActual = await obtenerEstadoPeriodoInscripcion(
          keycloak.token,
        );

        if (!activo) return;

        setPeriodo(periodoActual);

        if (periodoActual.estado !== "abierto") return;

        const datos = await obtenerTurnos(keycloak.token);

        if (activo) {
          setTurnos(datos);
        }
      } catch (error) {
        if (activo) {
          setErrorTurnos(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los turnos",
          );
        }
      } finally {
        if (activo) {
          setCargandoTurnos(false);
        }
      }
    }

    void cargarTurnos();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (periodo?.estado !== "abierto" || cargandoTurnos) return;

    let activo = true;
    let temporizador: number | undefined;

    async function actualizarDisponibilidad() {
      try {
        await keycloak.updateToken(30);

        if (!keycloak.token) {
          throw new Error("No hay una sesión activa. Volvé a iniciar sesión.");
        }

        const datos = await obtenerTurnos(keycloak.token);

        if (activo) {
          setTurnos(datos);
          setErrorTurnos("");
        }
      } catch (error) {
        if (activo) {
          setErrorTurnos(
            error instanceof Error
              ? error.message
              : "No se pudieron actualizar los cupos.",
          );
        }
      } finally {
        if (activo) {
          temporizador = window.setTimeout(actualizarDisponibilidad, 10_000);
        }
      }
    }

    temporizador = window.setTimeout(actualizarDisponibilidad, 10_000);

    return () => {
      activo = false;
      window.clearTimeout(temporizador);
    };
  }, [periodo?.estado, cargandoTurnos]);

  return { periodo, turnos, cargandoTurnos, errorTurnos };
}