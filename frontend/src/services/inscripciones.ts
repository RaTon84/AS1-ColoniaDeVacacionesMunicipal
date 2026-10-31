export interface DatosInscripcion {
  turno_id: number
  dni_chico: string
  nombre_chico: string
  apellido_chico: string
  fecha_nacimiento: string
  dni_tutor: string
  nombre_tutor: string
  apellido_tutor: string
  email_tutor: string
  telefono_tutor: string
}

export interface ResultadoInscripcion {
  id: number
  estado: 'CONFIRMADA' | 'LISTA_ESPERA' | 'CANCELADA'
  posicion_espera: number | null
}

export async function crearInscripcion(
  datos: DatosInscripcion,
  token: string
): Promise<ResultadoInscripcion> {
  const respuesta = await fetch('/api/v1/inscripciones', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(datos),
  })

  if (!respuesta.ok) {
    const problema = await respuesta.json().catch(() => null)

    throw new Error(
      problema?.detail || 'No se pudo registrar la inscripción'
    )
  }

  return await respuesta.json()
}

export interface InscripcionAdministracion {
  id: number
  turno_id: number
  temporada: number
  dni_chico: string
  nombre_chico: string
  apellido_chico: string
  fecha_nacimiento: string
  dni_tutor: string
  nombre_tutor: string
  apellido_tutor: string
  email_tutor: string
  telefono_tutor: string
  estado: 'CONFIRMADA' | 'LISTA_ESPERA' | 'CANCELADA'
  posicion_espera: number | null
  creado_en: string
  creado_por: string
}

export async function obtenerInscripcionesRegistradas(
  token: string
): Promise<InscripcionAdministracion[]> {
  const respuesta = await fetch('/api/v1/admin/inscripciones', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!respuesta.ok) {
    const problema = await respuesta.json().catch(() => null)

    throw new Error(
      problema?.detail || 'No se pudieron obtener las inscripciones'
    )
  }

  return await respuesta.json()
}