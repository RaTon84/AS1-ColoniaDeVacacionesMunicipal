type EstadoServicio = 'ok' | 'error'

interface EstadoSistema {
  services: {
    api: EstadoServicio
    database: EstadoServicio
    keycloak: EstadoServicio
    padron: EstadoServicio
  }
}

export interface PeriodoInscripcion {
  temporada: number
  apertura: string | null
  cierre: string | null
}

const URL_PERIODO = '/api/v1/admin/periodo-inscripcion'

export async function obtenerEstadoSistema(
  token: string
): Promise<EstadoSistema> {
  const respuesta = await fetch('/api/v1/system-info', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  })

  if (!respuesta.ok) {
    throw new Error('No se pudo consultar el estado del sistema.')
  }

  return respuesta.json()
}

export async function obtenerPeriodoInscripcion(
  token: string
): Promise<PeriodoInscripcion> {
  const respuesta = await fetch(URL_PERIODO, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  if (!respuesta.ok) {
    throw new Error('No se pudo cargar el período de inscripción.')
  }

  return respuesta.json()
}

export async function guardarPeriodoInscripcion(
  token: string,
  apertura: string,
  cierre: string
): Promise<PeriodoInscripcion> {
  const respuesta = await fetch(URL_PERIODO, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ apertura, cierre }),
  })

  if (!respuesta.ok) {
    const problema = await respuesta.json().catch(() => null)

    throw new Error(
      problema?.errors?.[0]?.mensaje ??
        problema?.detail ??
        'No se pudo guardar el período de inscripción.'
    )
  }

  return respuesta.json()
}