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