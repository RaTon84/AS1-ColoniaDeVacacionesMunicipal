export type RolPersonal = 'administrativo' | 'administrador_sistema'

export interface UsuarioPersonal {
  id: string
  usuario: string
  nombre: string
  apellido: string
  email: string
  rol: RolPersonal
  habilitado: boolean
}

export interface UsuarioNuevo {
  usuario: string
  nombre: string
  apellido: string
  email: string
  rol: RolPersonal
  clave_temporal: string
}

export type UsuarioCambios = Omit<UsuarioPersonal, 'id' | 'usuario'>

const URL_USUARIOS = '/api/v1/admin/usuarios'

async function leerError(respuesta: Response, porDefecto: string): Promise<never> {
  const problema = await respuesta.json().catch(() => null)
  throw new Error(
    problema?.errors?.[0]?.mensaje ?? problema?.detail ?? porDefecto
  )
}

export async function listarUsuarios(token: string): Promise<UsuarioPersonal[]> {
  const respuesta = await fetch(URL_USUARIOS, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!respuesta.ok) return leerError(respuesta, 'No se pudieron cargar los usuarios.')
  return respuesta.json()
}

export async function crearUsuario(
  token: string,
  datos: UsuarioNuevo
): Promise<UsuarioPersonal> {
  const respuesta = await fetch(URL_USUARIOS, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })
  if (!respuesta.ok) return leerError(respuesta, 'No se pudo registrar el usuario.')
  return respuesta.json()
}

export async function modificarUsuario(
  token: string,
  id: string,
  cambios: UsuarioCambios
): Promise<UsuarioPersonal> {
  const respuesta = await fetch(`${URL_USUARIOS}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cambios),
  })
  if (!respuesta.ok) return leerError(respuesta, 'No se pudo guardar el cambio.')
  return respuesta.json()
}
