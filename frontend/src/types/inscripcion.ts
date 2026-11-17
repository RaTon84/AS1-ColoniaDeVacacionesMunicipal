
export type EstadoInscripcion = 'Confirmada' | 'En revisión' | 'Lista de espera' | 'Cancelada'

export interface Inscripcion {
  id: number
  turno_id: number
  nombre_chico: string
  apellido_chico: string
  dni_chico: string
  fecha_nacimiento: string
  nombre_tutor: string
  apellido_tutor: string
  dni_tutor: string
  email_tutor: string
  telefono_tutor: string
  turno: string
  sede: string
  temporada: number
  fecha_inscripcion: string
  estado: EstadoInscripcion
  posicion_espera?: number
}