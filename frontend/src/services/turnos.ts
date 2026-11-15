import type { Turno } from '../types/turno'

const API_URL = '/api/v1'

export interface DatosTurno {
  nombre: string
  sede: string
  fecha_desde: string
  fecha_hasta: string
  cupo_total: number
}

async function leerError(respuesta: Response, mensaje: string): Promise<Error> {
  const problema = await respuesta.json().catch(() => null)

  return new Error(
    problema?.errors?.[0]?.mensaje ?? problema?.detail ?? mensaje
  )
}

export async function obtenerTurnos(token: string): Promise<Turno[]> {
  const respuesta = await fetch(`${API_URL}/turnos`, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!respuesta.ok) {
    throw new Error('No se pudieron obtener los turnos')
  }

  return (await respuesta.json()) as Turno[]
}

export async function obtenerTurnosDeTemporada(
  temporada: number,
  token: string
): Promise<Turno[]> {
  const respuesta = await fetch(
    `${API_URL}/admin/turnos?temporada=${encodeURIComponent(temporada)}`,
    {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!respuesta.ok) {
    throw await leerError(
      respuesta,
      'No se pudieron obtener los turnos de la temporada'
    )
  }

  return (await respuesta.json()) as Turno[]
}

export async function crearTurno(
  datos: DatosTurno,
  token: string
): Promise<Turno> {
  const respuesta = await fetch(`${API_URL}/admin/turnos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(datos),
  })

  if (!respuesta.ok) {
    throw await leerError(respuesta, 'No se pudo crear el turno')
  }

  return (await respuesta.json()) as Turno
}

export async function actualizarTurno(
  turnoId: number,
  datos: DatosTurno,
  token: string
): Promise<Turno> {
  const respuesta = await fetch(`${API_URL}/admin/turnos/${turnoId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(datos),
  })

  if (!respuesta.ok) {
    throw await leerError(respuesta, 'No se pudo actualizar el turno')
  }

  return (await respuesta.json()) as Turno
}

export async function eliminarTurno(
  turnoId: number,
  token: string
): Promise<void> {
  const respuesta = await fetch(`${API_URL}/admin/turnos/${turnoId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!respuesta.ok) {
    throw await leerError(respuesta, 'No se pudo eliminar el turno')
  }
}

export async function copiarTurnos(
  token: string,
  temporadaOrigen?: number | null
): Promise<Turno[]> {
  const respuesta = await fetch(`${API_URL}/admin/turnos/copiar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      temporada_origen: temporadaOrigen ?? null,
    }),
  })

  if (!respuesta.ok) {
    throw await leerError(respuesta, 'No se pudieron copiar los turnos')
  }

  return (await respuesta.json()) as Turno[]
}
