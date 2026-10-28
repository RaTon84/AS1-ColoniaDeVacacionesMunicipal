import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import Keycloak from 'keycloak-js'

import './index.css'
import App from './App.tsx'

const keycloak = new Keycloak({
  url: 'http://localhost:8080',
  realm: 'colonia',
  clientId: 'colonia-spa',
})

async function iniciarAplicacion() {
  const rootElement = document.getElementById('root')

  if (!rootElement) {
    throw new Error('No se encontró el elemento root')
  }

  const root = createRoot(rootElement)

  try {
    const autenticado = await keycloak.init({
      onLoad: 'login-required',
      pkceMethod: 'S256',
    })

    if (autenticado) {
      root.render(
        <StrictMode>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </StrictMode>,
      )
    }
  } catch (error) {
    console.error('Error al iniciar sesión con Keycloak:', error)

    root.render(
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold text-[#172E4D]">
            No se pudo iniciar sesión
          </h1>

          <p className="mt-3 text-slate-600">
            No fue posible conectar con el servicio de autenticación.
            Verificá que Keycloak esté funcionando e intentá nuevamente.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-[#1769B3] px-6 py-3 font-semibold text-white hover:bg-[#12558F]"
          >
            Reintentar
          </button>
        </div>
      </div>,
    )
  }
}

void iniciarAplicacion()
