import { useEffect, useState } from 'react'
import {
  CalendarDays,
  CalendarCheck,
  UsersRound,
  ClipboardList,
  Clock3,
  Waves,
  Volleyball,
  Palette,
  Trees,
  Sun,
} from 'lucide-react'
import keycloak from '../auth/keycloak'
import { obtenerTurnos } from '../services/turnos'
import { obtenerTemporadaActiva } from '../services/inscripciones'

const actividades = [
  { nombre: 'Natación', icono: Waves, estilo: 'bg-sky-50 text-sky-600' },
  { nombre: 'Deportes', icono: Volleyball, estilo: 'bg-orange-50 text-orange-600' },
  { nombre: 'Talleres', icono: Palette, estilo: 'bg-pink-50 text-pink-600' },
  { nombre: 'Naturaleza', icono: Trees, estilo: 'bg-green-50 text-green-700' },
  { nombre: 'Juegos grupales', icono: UsersRound, estilo: 'bg-violet-50 text-violet-700' },
  { nombre: 'Recreación', icono: Sun, estilo: 'bg-amber-50 text-amber-600' },
]

const estiloTarjeta =
  'min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'

const estiloTitulo = 'mb-3 text-lg font-bold text-[#142D50]'

function InformacionColonia() {
  const [cuposPrevistos, setCuposPrevistos] = useState<number | null>(null)
  const [errorCupos, setErrorCupos] = useState(false)
  const [fechasColonia, setFechasColonia] = useState<{
    inicio: string | null
    fin: string | null
  }>({ inicio: null, fin: null })
  const [edades, setEdades] = useState<{ minima: number; maxima: number } | null>(null)
  const [errorEdades, setErrorEdades] = useState(false)

  useEffect(() => {
    let activo = true

    async function cargarCupos() {
      try {
        await keycloak.updateToken(30)

        const token = keycloak.token
        if (!token) throw new Error('No hay una sesión activa.')

        const turnos = await obtenerTurnos(token)
        if (!activo) return

        const total = turnos.reduce((suma, turno) => suma + turno.cupo_total, 0)
        const fechasInicio = turnos.map((turno) => turno.fecha_desde).sort()
        const fechasFin = turnos.map((turno) => turno.fecha_hasta).sort()

        setCuposPrevistos(total)
        setFechasColonia({
          inicio: fechasInicio[0] ?? null,
          fin: fechasFin[fechasFin.length - 1] ?? null,
        })
      } catch {
        if (activo) setErrorCupos(true)
      }
    }

    async function cargarEdades() {
      try {
        await keycloak.updateToken(30)

        const token = keycloak.token
        if (!token) throw new Error('No hay una sesión activa.')

        const temporada = await obtenerTemporadaActiva(token)
        if (!activo) return

        setEdades({ minima: temporada.edad_minima, maxima: temporada.edad_maxima })
      } catch {
        if (activo) setErrorEdades(true)
      }
    }

    void cargarCupos()
    void cargarEdades()

    return () => {
      activo = false
    }
  }, [])

  const datosColonia = [
    {
      titulo: 'Inicio',
      valor: fechasColonia.inicio?.split('-').reverse().join('/') ?? 'A confirmar',
      icono: CalendarDays,
      color: 'text-blue-600',
    },
    {
      titulo: 'Fin',
      valor: fechasColonia.fin?.split('-').reverse().join('/') ?? 'A confirmar',
      icono: CalendarCheck,
      color: 'text-pink-500',
    },
    {
      titulo: 'Edades',
      valor: errorEdades
        ? 'No disponible'
        : edades
          ? `${edades.minima} a ${edades.maxima} años`
          : 'Cargando…',
      icono: UsersRound,
      color: 'text-violet-600',
    },
  ]

  const datosInscripciones = [
    {
      titulo: 'Cupos previstos',
      valor: errorCupos ? 'No disponible' : (cuposPrevistos ?? 'Cargando…'),
      icono: UsersRound,
      estilo: 'bg-blue-50 text-blue-700',
    },
    {
      titulo: 'Período de inscripción',
      valor: '3 semanas',
      icono: Clock3,
      estilo: 'bg-violet-50 text-violet-700',
    },
  ]

  return (
    <section
      aria-label="Información general de la colonia"
      className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12"
    >
      <article className={`${estiloTarjeta} lg:col-span-7`}>
        <h2 className={estiloTitulo}>Información de la colonia</h2>

        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {datosColonia.map(({ titulo, valor, icono: Icono, color }) => (
            <div
              key={titulo}
              className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2"
            >
              <Icono size={22} className={`shrink-0 ${color}`} aria-hidden="true" />
              <div>
                <dt className="text-xs text-slate-600">{titulo}</dt>
                <dd className="text-sm font-bold text-[#142D50]">{valor}</dd>
              </div>
            </div>
          ))}
        </dl>
      </article>

      <article className={`${estiloTarjeta} lg:col-span-5`}>
        <h2 className={`${estiloTitulo} flex items-center gap-2`}>
          <ClipboardList size={21} className="text-orange-500" aria-hidden="true" />
          Inscripciones
        </h2>

        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {datosInscripciones.map(({ titulo, valor, icono: Icono, estilo }) => (
            <div
              key={titulo}
              className={`flex min-w-0 items-center gap-2 rounded-xl px-3 py-2 ${estilo}`}
            >
              <Icono size={22} className="shrink-0" aria-hidden="true" />
              <div>
                <dt className="text-xs text-slate-600">{titulo}</dt>
                <dd className="text-sm font-bold text-[#142D50]">{valor}</dd>
              </div>
            </div>
          ))}
        </dl>
      </article>

      <article className={`${estiloTarjeta} lg:col-span-7`}>
        <h2 className={estiloTitulo}>Actividades</h2>

        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {actividades.map(({ nombre, icono: Icono, estilo }) => (
            <li
              key={nombre}
              className="flex min-w-0 flex-col items-center gap-1.5 text-center"
            >
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${estilo}`}>
                <Icono size={22} aria-hidden="true" />
              </span>
              <span className="text-xs font-medium text-[#142D50]">{nombre}</span>
            </li>
          ))}
        </ul>
      </article>

      <article className="relative flex min-h-[120px] min-w-0 items-center overflow-hidden rounded-2xl border border-amber-100 bg-[#FFF3D8] p-4 shadow-sm lg:col-span-5">
        <div className="relative z-10 w-[68%]">
          <h2 className="text-xl font-extrabold leading-tight text-[#142D50]">
            ¡Un verano inolvidable!
          </h2>
          <p className="mt-2 text-sm text-[#243B5A]">
            Deporte, amistad y diversión en un entorno seguro.
          </p>
        </div>

        <img
          src="/images/palmera.png"
          alt=""
          className="pointer-events-none absolute bottom-0 right-0 w-[30%] max-w-[140px] object-contain"
        />
      </article>
    </section>
  )
}

export default InformacionColonia