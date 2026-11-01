import { Link } from 'react-router-dom'
import {
  ClipboardList,
  CheckCircle2,
  ListOrdered,
  Plus,
  Info,
  CalendarDays
} from 'lucide-react'

import { inscripcionesEjemplo, type Inscripcion } from '../../data/inscripcionesEjemplo'

const turnosEjemplo = [
  {
    id: 1,
    nombre: 'Turno mañana',
    cupo_total: 100,
    cupos_disponibles: 45,
  },
  {
    id: 2,
    nombre: 'Turno tarde',
    cupo_total: 100,
    cupos_disponibles: 0,
  },
]

interface ResumenCardProps {
  titulo: string
  cantidad: number
  icono: React.ReactNode
  fondoIcono: string
}

function ResumenCard({
  titulo,
  cantidad,
  icono,
  fondoIcono,
}: ResumenCardProps) {
  return (
    <article className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
      <div className={`rounded-xl p-3 ${fondoIcono}`}>
        {icono}
      </div>

      <div>
        <p className="text-sm text-slate-500">
          {titulo}
        </p>

        <p className="text-2xl font-extrabold text-[#142D50]">
          {cantidad}
        </p>
      </div>
    </article>
  )
}

function DisponibilidadCupos() {
  return (
    <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">

      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-xl bg-cyan-100 p-3 text-cyan-700">
          <CalendarDays size={24} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-[#142D50]">
            Disponibilidad de cupos
          </h2>

          <p className="text-sm text-slate-500">
            Resumen por turno de la colonia.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {turnosEjemplo.map((turno) => {
          const ocupados =
            turno.cupo_total - turno.cupos_disponibles

          const porcentaje =
            turno.cupo_total > 0
              ? (ocupados / turno.cupo_total) * 100
              : 0

          const completo = turno.cupos_disponibles === 0

          return (
            <article
              key={turno.id}
              className="rounded-xl border border-slate-200 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-[#142D50]">
                  {turno.nombre}
                </h3>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    completo
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {completo ? 'Completo' : 'Disponible'}
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  Ocupación
                </span>

                <span className="font-semibold text-[#142D50]">
                  {ocupados} / {turno.cupo_total}
                </span>
              </div>

              <div
                role="progressbar"
                aria-label={`Ocupación de ${turno.nombre}`}
                aria-valuemin={0}
                aria-valuemax={turno.cupo_total}
                aria-valuenow={ocupados}
                className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100"
              >
                <div
                  className={`h-full rounded-full ${
                    completo ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>

              <p
                className={`mt-3 text-sm font-semibold ${
                  completo ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {completo
                  ? 'Sin cupos disponibles'
                  : `${turno.cupos_disponibles} cupos disponibles`}
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}


function GestionInscripcionPage() {
  const inscripciones = inscripcionesEjemplo
  const total = inscripciones.length
  const confirmadas = inscripciones.filter((i) => i.estado === 'Confirmada').length
  const enEspera = inscripciones.filter((i) => i.estado === 'Lista de espera').length

  return (
    <div className="bg-transparent px-5 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h1 className="text-3xl font-extrabold text-[#142D50]">
              Gestión de inscripciones
            </h1>

            <p className="mt-2 text-slate-600">
              Consultá las solicitudes, los cupos y las revisiones.
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

        <section
          aria-label="Resumen de inscripciones"
          className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3"
        >

          <ResumenCard
            titulo="Confirmadas"
            cantidad={confirmadas}
            icono={<CheckCircle2 size={26} />}
            fondoIcono="bg-emerald-100 text-emerald-700"
          />


          <ResumenCard
            titulo="Lista de espera"
            cantidad={enEspera}
            icono={<ListOrdered size={26} />}
            fondoIcono="bg-violet-100 text-violet-700"
          />

          <ResumenCard
            titulo="Total"
            cantidad={total}
            icono={<ClipboardList size={26} />}
            fondoIcono="bg-blue-100 text-blue-700"
          />
        </section>

        <DisponibilidadCupos />

        <div className="mt-6 flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
          <Info size={20} className="shrink-0" />

          <p>
            Los datos, cupos y estados mostrados son ficticios.
            Las confirmaciones, rechazos y asignaciones de cupos
            se realizarán mediante FastAPI cuando integremos
            el backend.
          </p>
        </div>

      </div>
    </div>
  )
}

export default GestionInscripcionPage


