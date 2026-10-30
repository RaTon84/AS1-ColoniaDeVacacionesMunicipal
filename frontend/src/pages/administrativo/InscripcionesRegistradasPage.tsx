
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, UsersRound, Plus, Info } from 'lucide-react'

import InscripcionesCard from '../../components/InscripcionesCard'

import {
  inscripcionesEjemplo,
  type Inscripcion,
} from '../../data/inscripcionesEjemplo'

type FiltroEstado = 'Todas' | Inscripcion['estado']

function InscripcionesRegistradasPage() {
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] =
    useState<FiltroEstado>('Todas')

  const inscripciones = inscripcionesEjemplo

  // Filtrar por nombre, apellido, DNI y estado
  const inscripcionesFiltradas = inscripciones.filter(
    (inscripcion) => {
      const texto = busqueda.trim().toLocaleLowerCase('es')

      const nombreCompleto =
        `${inscripcion.nombre_chico} ${inscripcion.apellido_chico}`
          .toLocaleLowerCase('es')

      const coincideBusqueda =
        nombreCompleto.includes(texto) ||
        inscripcion.dni_chico.includes(texto)

      const coincideEstado =
        filtroEstado === 'Todas' ||
        inscripcion.estado === filtroEstado

      return coincideBusqueda && coincideEstado
    }
  )

  // Ordenar por posición cuando se filtra la lista de espera
  const resultadosOrdenados =
    filtroEstado === 'Lista de espera'
      ? [...inscripcionesFiltradas].sort(
          (a, b) =>
            (a.posicion_espera ?? Infinity) -
            (b.posicion_espera ?? Infinity)
        )
      : inscripcionesFiltradas

  return (
    <div className="bg-[#F5F9FC] px-5 py-8 lg:px-10">

      <div className="mx-auto max-w-7xl">

        {/* Encabezado */}
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h1 className="text-3xl font-extrabold text-[#142D50]">
              Inscripciones registradas
            </h1>

            <p className="mt-2 text-slate-600">
              Consultá todas las inscripciones, buscá y filtrá por estado.
            </p>
          </div>

          <Link
            to="/inscripciones/nueva"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1769B3] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            <Plus size={19} />
            Nueva inscripción
          </Link>

        </header>

        {/* Listado de inscripciones */}
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">

          <div className="mb-5 flex items-center gap-3">
            <UsersRound
              size={24}
              className="text-[#1769B3]"
            />

            <div>
              <h2 className="text-xl font-bold text-[#142D50]">
                Listado de inscripciones
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Buscá, filtrá y desplegá los detalles.
              </p>
            </div>
          </div>

          {/* Buscador y filtro */}
          <div className="mb-5 flex flex-col gap-3 md:flex-row">

            <div className="relative min-w-0 flex-1">

              <Search
                size={19}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, apellido o DNI..."
                aria-label="Buscar inscripciones"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            <select
              value={filtroEstado}
              onChange={(e) =>
                setFiltroEstado(e.target.value as FiltroEstado)
              }
              aria-label="Filtrar por estado"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="Todas">Todos los estados</option>
              <option value="Confirmada">Confirmadas</option>
              <option value="En revisión">En revisión</option>
              <option value="Lista de espera">Lista de espera</option>
            </select>

          </div>

          {/* Cantidad de resultados */}
          <p className="mb-4 text-sm text-slate-500">
            {resultadosOrdenados.length}{' '}
            {resultadosOrdenados.length === 1
              ? 'resultado'
              : 'resultados'}
          </p>

          {/* Tarjetas de inscripciones */}
          {resultadosOrdenados.length > 0 ? (

            <div className="flex flex-col gap-4">

              {resultadosOrdenados.map((inscripcion) => (
                <InscripcionesCard
                  key={inscripcion.id}
                  inscripcion={inscripcion}
                />
              ))}

            </div>

          ) : (

            <div className="rounded-xl bg-slate-50 px-6 py-12 text-center">

              <Search
                size={38}
                className="mx-auto mb-4 text-slate-400"
              />

              <h3 className="font-bold text-[#142D50]">
                No encontramos inscripciones
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Probá con otros datos o cambiá el filtro.
              </p>

              <button
                type="button"
                onClick={() => {
                  setBusqueda('')
                  setFiltroEstado('Todas')
                }}
                className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-[#1769B3] hover:bg-blue-50"
              >
                Limpiar filtros
              </button>

            </div>

          )}

        </section>

        {/* Aviso sobre los datos de ejemplo */}
        <div className="mt-6 flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">

          <Info size={20} className="shrink-0" />

          <p>
            Las inscripciones mostradas son datos de ejemplo.
            Se reemplazarán con los registros reales cuando
            integremos FastAPI.
          </p>

        </div>

      </div>

    </div>
  )
}

export default InscripcionesRegistradasPage
