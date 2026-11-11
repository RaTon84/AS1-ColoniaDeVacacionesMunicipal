type EstadoServicio = 'ok' | 'error'

interface EstadoSistema {
  services: {
    api: EstadoServicio
    database: EstadoServicio
    keycloak: EstadoServicio
    padron: EstadoServicio
  }
}

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