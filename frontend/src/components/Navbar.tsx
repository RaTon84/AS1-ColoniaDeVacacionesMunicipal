import { useState } from 'react'
import { NavLink } from 'react-router-dom'

import {
  House,
  ClipboardList,
  FileText,
  Files,
  CalendarCog,
  Activity,
  UsersRound,
  Waves,
  Sun,
  Menu,
  X,
  LogOut,
  UserRound,
  ChevronDown,
} from 'lucide-react'

import keycloak from '../auth/keycloak'

function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [usuarioAbierto, setUsuarioAbierto] = useState(false)
  const [cerrandoSesion, setCerrandoSesion] = useState(false)

  const opciones = [
    {
      nombre: 'Inicio',
      ruta: '/',
      icono: House,
      roles: ['tutor'],
    },
    {
      nombre: 'Nueva inscripción',
      ruta: '/inscripciones/nueva',
      icono: ClipboardList,
      roles: ['tutor', 'administrativo'],
    },
    {
      nombre: 'Mis inscripciones',
      ruta: '/tutor/mis-inscripciones',
      icono: FileText,
      roles: ['tutor'],
    },
    {
      nombre: 'Gestión de inscripciones',
      ruta: '/administrativo/inscripciones',
      icono: ClipboardList,
      roles: ['administrativo'],
    },
    {
      nombre: 'Inscripciones registradas',
      ruta: '/administrativo/registradas',
      icono: Files,
      roles: ['administrativo'],
    },
    {
      nombre: 'Configuración de temporada',
      ruta: '/sistemas',
      icono: CalendarCog,
      roles: ['administrador_sistema'],
    },
    {
      nombre: 'Estado del sistema',
      ruta: '/sistemas/estado',
      icono: Activity,
      roles: ['administrador_sistema'],
    },
    {
      nombre: 'Perfiles',
      ruta: '/sistemas/perfiles',
      icono: UsersRound,
      roles: ['administrador_sistema'],
    },
  ]

  // Opciones permitidas para el usuario autenticado
  const opcionesVisibles = opciones.filter((opcion) =>
    opcion.roles.some((rol) => keycloak.hasRealmRole(rol))
  )

  const datosUsuario = keycloak.tokenParsed

  const nombreUsuario =
    datosUsuario?.name ||
    datosUsuario?.preferred_username ||
    'Usuario'

  const rolUsuario = keycloak.hasRealmRole('administrador_sistema')
    ? 'Administrador de Sistemas'
    : keycloak.hasRealmRole('administrativo')
      ? 'Administrativo'
      : keycloak.hasRealmRole('tutor')
        ? 'Tutor'
        : 'Sin rol asignado'

  async function cerrarSesion() {
    if (cerrandoSesion) return

    setCerrandoSesion(true)

    try {
      await keycloak.logout({
        redirectUri: `${window.location.origin}/`,
      })
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      setCerrandoSesion(false)
    }
  }

  return (
    <header className="relative z-50 w-full bg-[#172E4D] text-white shadow-md">
      <div className="mx-auto flex min-h-[80px] w-full items-center justify-between gap-5 px-5 lg:px-8">

        {/* Logo de la colonia */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex flex-col items-center">
            <Sun size={34} className="text-yellow-400" />
            <Waves
              size={34}
              className="-mt-3 text-cyan-400"
            />
          </div>

          <div>
            <h1 className="text-base font-extrabold uppercase leading-tight tracking-wide">
              Colonia Municipal
            </h1>

            <p className="text-xs text-slate-300">
              Verano en comunidad
            </p>
          </div>
        </div>

        {/* Navegación en computadoras */}
        <nav
          className="hidden flex-1 items-center justify-center gap-1 lg:flex"
          aria-label="Menú principal"
        >
          {opcionesVisibles.map((opcion) => {
            const Icono = opcion.icono

            return (
              <NavLink
                key={opcion.ruta}
                to={opcion.ruta}
                end={opcion.ruta === '/' || opcion.ruta === '/sistemas'}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-3 py-3 text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-[#2B6C9A] font-semibold text-white'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icono size={19} aria-hidden="true" />
                <span>{opcion.nombre}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Usuario y menú de cuenta */}
        <div className="hidden shrink-0 lg:block">
          <div className="relative">
            <button
              type="button"
              onClick={() => setUsuarioAbierto(!usuarioAbierto)}
              aria-expanded={usuarioAbierto}
              aria-haspopup="true"
              className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-white/10"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#356189]">
                <UserRound size={23} />
              </div>

              <div className="max-w-40 text-left">
                <p className="truncate text-sm font-semibold">
                  {nombreUsuario}
                </p>
                <p className="truncate text-xs text-slate-300">
                  {rolUsuario}
                </p>
              </div>

              <ChevronDown size={17} />
            </button>

            {usuarioAbierto && (
              <div className="absolute right-0 top-full mt-3 w-56 rounded-xl border border-slate-200 bg-white p-2 text-[#172E4D] shadow-xl">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="truncate text-sm font-semibold">
                    {nombreUsuario}
                  </p>
                  <p className="text-xs text-slate-500">
                    {rolUsuario}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={cerrarSesion}
                  disabled={cerrandoSesion}
                  className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium hover:bg-slate-100 disabled:opacity-60"
                >
                  <LogOut size={19} />
                  <span>
                    {cerrandoSesion
                      ? 'Cerrando sesión...'
                      : 'Cerrar sesión'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Botón hamburguesa para celulares */}
        <button
          type="button"
          className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto}
          onClick={() => setMenuAbierto(!menuAbierto)}
        >
          {menuAbierto ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Menú desplegable para celulares */}
      {menuAbierto && (
        <nav
          className="border-t border-white/15 px-4 pb-5 pt-3 lg:hidden"
          aria-label="Menú móvil"
        >
          <div className="space-y-1">
            {opcionesVisibles.map((opcion) => {
              const Icono = opcion.icono

              return (
                <NavLink
                  key={opcion.ruta}
                  to={opcion.ruta}
                  end={opcion.ruta === '/' || opcion.ruta === '/sistemas'}
                  onClick={() => setMenuAbierto(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
                      isActive
                        ? 'bg-[#2B6C9A] font-semibold text-white'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icono size={20} />
                  <span>{opcion.nombre}</span>
                </NavLink>
              )
            })}
          </div>

          <div className="mt-4 border-t border-white/15 pt-4">
            <div className="mb-3 flex items-center gap-3 px-4">
              <UserRound size={22} />
              <div>
                <p className="text-sm font-semibold">
                  {nombreUsuario}
                </p>
                <p className="text-xs text-slate-300">
                  {rolUsuario}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={cerrarSesion}
              disabled={cerrandoSesion}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm hover:bg-white/10 disabled:opacity-60"
            >
              <LogOut size={20} />
              <span>
                {cerrandoSesion
                  ? 'Cerrando sesión...'
                  : 'Cerrar sesión'}
              </span>
            </button>
          </div>
        </nav>
      )}
    </header>
  )
}

export default Navbar