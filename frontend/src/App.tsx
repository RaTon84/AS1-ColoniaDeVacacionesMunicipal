import {Routes, Route, Navigate,} from 'react-router-dom'
import type { ReactNode } from 'react'
import keycloak from './auth/keycloak'
import DashboardLayout from './layouts/DashboardLayout'
import InicioPage from './pages/InicioPage'
import NuevaInscripcionPage from './pages/inscripciones/NuevaInscripcionPage'
import MisInscripcionesPage from './pages/tutor/MisInscripcionesPage'
import TurnosPage from './pages/tutor/TurnosPage'
import GestionInscripcionesPage from './pages/administrativo/GestionInscripcionPage'
import AdministracionSistemaPage from './pages/sistemas/AdministradorSistemaPage'
import InscripcionesRegistradasPage from './pages/administrativo/InscripcionesRegistradasPage'

function obtenerRutaInicial(): string | null {
  if (keycloak.hasRealmRole('administrador_sistema')) {
    return '/sistemas'
  }

  if (keycloak.hasRealmRole('administrativo')) {
    return '/administrativo/inscripciones'
  }

  if (keycloak.hasRealmRole('tutor')) {
    return '/'
  }

  return null
}

interface RutaProtegidaProps {
  rolesPermitidos: string[]
  children: ReactNode
}

function RutaProtegida({
  rolesPermitidos,
  children,
}: RutaProtegidaProps) {
  const tienePermiso = rolesPermitidos.some((rol) =>
    keycloak.hasRealmRole(rol)
  )

  if (!tienePermiso) {
    const rutaInicial = obtenerRutaInicial()

    if (rutaInicial === null) {
      return (
        <div className="flex min-h-[calc(100dvh-80px)] items-center justify-center p-6">
          <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-[#172E4D]">
              Sin permisos de acceso
            </h1>

            <p className="mt-3 text-slate-600">
              Tu usuario no tiene un rol asignado para utilizar
              esta aplicación. Contactá al administrador.
            </p>
          </div>
        </div>
      )
    }

    return <Navigate to={rutaInicial} replace />
  }

  return <>{children}</>
}

function PaginaInicial() {
  if (keycloak.hasRealmRole('tutor') &&
      !keycloak.hasRealmRole('administrativo') &&
      !keycloak.hasRealmRole('administrador_sistema')) {
    return <InicioPage />
  }

  const rutaInicial = obtenerRutaInicial()

  if (rutaInicial !== null) {
    return <Navigate to={rutaInicial} replace />
  }

  return (
    <RutaProtegida rolesPermitidos={[]}>
      <InicioPage />
    </RutaProtegida>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>

        <Route
          path="/"
          element={<PaginaInicial />}
        />

        <Route
          path="/inscripciones/nueva"
          element={
            <RutaProtegida
              rolesPermitidos={['tutor', 'administrativo']}
            >
              <NuevaInscripcionPage />
            </RutaProtegida>
          }
        />

        <Route
          path="/administrativo/inscripciones"
          element={
            <RutaProtegida
              rolesPermitidos={['administrativo']}
            >
              <GestionInscripcionesPage />
            </RutaProtegida>
          }
        />

        <Route
          path="/administrativo/registradas"
          element={
            <RutaProtegida rolesPermitidos={['administrativo']}>
              <InscripcionesRegistradasPage />
            </RutaProtegida>
          }
        />

        <Route
          path="/tutor/mis-inscripciones"
          element={
            <RutaProtegida rolesPermitidos={['tutor']}>
              <MisInscripcionesPage />
            </RutaProtegida>
          }
        />

        <Route
          path="/tutor/turnos"
          element={
            <RutaProtegida rolesPermitidos={['tutor']}>
              <TurnosPage />
            </RutaProtegida>
          }
        />

        <Route
          path="/sistemas/*"
          element={
            <RutaProtegida
              rolesPermitidos={['administrador_sistema']}
            >
              <AdministracionSistemaPage />
            </RutaProtegida>
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to={obtenerRutaInicial() ?? '/'}
              replace
            />
          }
        />

      </Route>
    </Routes>
  )
}

export default App
