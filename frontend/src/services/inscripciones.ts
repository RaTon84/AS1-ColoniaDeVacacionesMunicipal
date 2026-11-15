async function leerError(
  respuesta: Response,
  mensaje: string
): Promise<Error> {
  const problema = await respuesta.json().catch(() => null)

  return new Error(
    problema?.errors?.[0]?.mensaje ?? problema?.detail ?? mensaje
  )
}

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
    throw await leerError(
      respuesta,
      'No se pudo registrar la inscripción'
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

export type DatosEdicionInscripcion = Omit<DatosInscripcion, 'turno_id'>

export type InscripcionActualizada = Omit<
  InscripcionAdministracion,
  'creado_por'
>

export async function editarInscripcion(
  id: number,
  datos: DatosEdicionInscripcion,
  token: string
): Promise<InscripcionActualizada> {
  const respuesta = await fetch(`/api/v1/inscripciones/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(datos),
  })

  if (!respuesta.ok) {
    throw await leerError(
      respuesta,
      'No se pudo guardar la inscripción'
    )
  }

  return await respuesta.json()
}

export interface ArchivoCsv {
  blob: Blob
  nombre: string
}

export async function exportarInscripcionesCsv(
  token: string
): Promise<ArchivoCsv> {
  const respuesta = await fetch('/api/v1/admin/inscripciones/export', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!respuesta.ok) {
    throw await leerError(
      respuesta,
      'No se pudo exportar el listado'
    )
  }

  const disposicion = respuesta.headers.get('content-disposition') ?? ''
  const coincidencia = /filename="([^"]+)"/.exec(disposicion)

  return {
    blob: await respuesta.blob(),
    nombre: coincidencia?.[1] ?? 'inscripciones.csv',
  }
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
    throw await leerError(
      respuesta,
      'No se pudieron obtener las inscripciones'
    )
  }

  return await respuesta.json()
}

export async function cancelarInscripcion(
  id: number,
  token: string
): Promise<ResultadoInscripcion> {
  const respuesta = await fetch(
    `/api/v1/inscripciones/${id}/cancelar`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!respuesta.ok) {
    throw await leerError(
      respuesta,
      'No se pudo cancelar la inscripción'
    )
  }

  return await respuesta.json()
}

export interface InscripcionTutor {
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
}

export async function obtenerMisInscripciones(
  token: string
): Promise<InscripcionTutor[]> {
  const respuesta = await fetch('/api/v1/mis-inscripciones', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!respuesta.ok) {
    throw await leerError(
      respuesta,
      'No se pudieron obtener tus inscripciones'
    )
  }

  return await respuesta.json()
}