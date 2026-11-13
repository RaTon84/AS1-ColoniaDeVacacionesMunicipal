import type { InscripcionTutor } from '../services/inscripciones'
import type { Inscripcion } from '../types/inscripcion'
import type { Turno } from '../types/turno'

const estados: Record<InscripcionTutor['estado'], Inscripcion['estado']> = {
  CONFIRMADA: 'Confirmada',
  LISTA_ESPERA: 'Lista de espera',
  CANCELADA: 'Cancelada',
}

export function adaptarInscripcion(
  registro: InscripcionTutor,
  turnos: Turno[],
): Inscripcion {
  const turno = turnos.find((turno) => turno.id === registro.turno_id)

  return {
    ...registro,
    estado: estados[registro.estado],
    turno: turno?.nombre ?? `Turno ${registro.turno_id}`,
    sede: turno?.sede ?? 'Sede no disponible',
    fecha_inscripcion: registro.creado_en.slice(0, 10),
    posicion_espera: registro.posicion_espera ?? undefined,
  }
}