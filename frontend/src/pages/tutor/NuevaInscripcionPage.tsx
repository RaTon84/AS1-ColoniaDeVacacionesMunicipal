import { useEffect, useState, type FormEvent } from 'react'
import {
  CalendarDays,
  UsersRound,
  UserRound,
  ArrowRight,
  Info,
} from 'lucide-react'

import keycloak from '../../auth/keycloak'
import { obtenerTurnos } from '../../services/turnos'
import type { Turno } from '../../types/turno'
import { crearInscripcion } from '../../services/inscripciones'

interface FormularioInscripcion {
  turno_id: string
  dni_chico: string
  nombre_chico: string
  apellido_chico: string
  fecha_nacimiento: string
  dni_tutor: string
  nombre_tutor: string
  apellido_tutor: string
  email_tutor: string
  telefono_tutor: string
}

interface EstadoPeriodoInscripcion {
  estado: 'sin_configurar' | 'pendiente' | 'cerrado' | 'abierto'
  apertura: string | null
  cierre: string | null
}

const datosIniciales: FormularioInscripcion = {
  turno_id: '',
  dni_chico: '',
  nombre_chico: '',
  apellido_chico: '',
  fecha_nacimiento: '',
  dni_tutor: '',
  nombre_tutor: '',
  apellido_tutor: '',
  email_tutor: '',
  telefono_tutor: '',
}

const estiloInput =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

function NuevaInscripcionPage() {
  const [formulario, setFormulario] = useState<FormularioInscripcion>(datosIniciales)
  const [periodo, setPeriodo] = useState<EstadoPeriodoInscripcion | null>(null)
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [cargandoTurnos, setCargandoTurnos] = useState(true)
  const [errorTurnos, setErrorTurnos] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errorInscripcion, setErrorInscripcion] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')

  useEffect(() => {
    let activo = true

    async function cargarTurnos() {
      try {
        await keycloak.updateToken(30)

        if (!keycloak.token) {
          throw new Error('No hay una sesión activa. Volvé a iniciar sesión.')
        }

        const respuesta = await fetch('/api/v1/periodo-inscripcion', {
          headers: {
            Authorization: `Bearer ${keycloak.token}`,
          },
          cache: 'no-store',
        })

        if (!respuesta.ok) {
          throw new Error('No se pudo verificar el período de inscripción.')
        }

        const periodoActual: EstadoPeriodoInscripcion = await respuesta.json()

        if (!activo) return

        setPeriodo(periodoActual)

        if (periodoActual.estado !== 'abierto') return

        const datos = await obtenerTurnos(keycloak.token)

        if (activo) {
          setTurnos(datos)
        }
      } catch (error) {
        if (activo) {
          setErrorTurnos(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los turnos'
          )
        }
      } finally {
        if (activo) {
          setCargandoTurnos(false)
        }
      }
    }

    void cargarTurnos()

    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    if (periodo?.estado !== 'abierto' || cargandoTurnos) return

    let activo = true
    let temporizador: number | undefined

    async function actualizarDisponibilidad() {
      try {
        await keycloak.updateToken(30)

        if (!keycloak.token) {
          throw new Error('No hay una sesión activa. Volvé a iniciar sesión.')
        }

        const datos = await obtenerTurnos(keycloak.token)

        if (activo) {
          setTurnos(datos)
          setErrorTurnos('')
        }
      } catch (error) {
        if (activo) {
          setErrorTurnos(
            error instanceof Error
              ? error.message
              : 'No se pudieron actualizar los cupos.'
          )
        }
      } finally {
        if (activo) {
          temporizador = window.setTimeout(actualizarDisponibilidad, 10_000)
        }
      }
    }

    temporizador = window.setTimeout(actualizarDisponibilidad, 10_000)

    return () => {
      activo = false
      window.clearTimeout(temporizador)
    }
  }, [periodo?.estado, cargandoTurnos])

  function actualizarCampo(
    campo: keyof FormularioInscripcion,
    valor: string
  ) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }))
  }

  async function manejarEnvio(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault()

    if (enviando || mensajeExito) return

    setErrorInscripcion('')
    setMensajeExito('')

    if (!formulario.turno_id) {
      setErrorInscripcion('Seleccioná un turno.')
      return
    }

    setEnviando(true)

    try {
      await keycloak.updateToken(30)

      if (!keycloak.token) {
        throw new Error(
          'No hay una sesión activa. Volvé a iniciar sesión.'
        )
      }

      const resultado = await crearInscripcion(
        {
          ...formulario,
          turno_id: Number(formulario.turno_id),
        },
        keycloak.token
      )

      if (resultado.estado === 'CONFIRMADA') {
        setMensajeExito(
          `Inscripción N.º ${resultado.id} confirmada.`
        )
      } else if (resultado.estado === 'LISTA_ESPERA') {
        setMensajeExito(
          `Inscripción N.º ${resultado.id} en lista de espera. ` +
          `Posición: ${resultado.posicion_espera}.`
        )
      }
    } catch (error) {
      setErrorInscripcion(
        error instanceof Error
          ? error.message
          : 'No se pudo registrar la inscripción.'
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="min-h-screen bg-transparent px-5 py-8 lg:px-10">
      <div className="mx-auto max-w-5xl">

        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#142D50]">
            Nueva inscripción
          </h1>

          <p className="mt-2 text-slate-600">
            Completá los datos para solicitar un cupo en la
            colonia de vacaciones municipal.
          </p>
        </header>

        {periodo?.estado !== 'abierto' && (
          <p role="status" className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
            {periodo?.estado === 'pendiente' && periodo.apertura
              ? `Las inscripciones abren el ${new Date(periodo.apertura).toLocaleString(
                  'es-AR',
                  {
                    dateStyle: 'short',
                    timeStyle: 'short',
                    timeZone: 'America/Argentina/Buenos_Aires',
                  }
                )} (hora argentina).`
              : periodo?.estado === 'cerrado'
                ? 'El período de inscripción ya cerró.'
                : periodo?.estado === 'sin_configurar'
                  ? 'El período de inscripción todavía no fue configurado.'
                  : errorTurnos || 'Consultando el período de inscripción…'}
          </p>
        )}

        {periodo?.estado === 'abierto' && (
          <form onSubmit={manejarEnvio} className="space-y-6">

            <section className="rounded-2xl bg-white p-6 shadow-sm">

              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                  <CalendarDays size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-[#142D50]">
                    Selección del turno
                  </h2>
                  <p className="text-sm text-slate-500">
                    Elegí el turno al que querés inscribir al chico.
                  </p>
                </div>
              </div>

              <label
                htmlFor="turno"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Turno disponible *
              </label>

              <select
                id="turno"
                value={formulario.turno_id}
                onChange={(e) =>
                  actualizarCampo('turno_id', e.target.value)
                }
                className={estiloInput}
                required
                disabled={
                  cargandoTurnos ||
                  Boolean(errorTurnos) ||
                  turnos.length === 0
                }
              >
                <option value="">
                  {cargandoTurnos
                    ? 'Cargando turnos...'
                    : errorTurnos
                      ? 'No se pudieron cargar los turnos'
                      : turnos.length === 0
                        ? 'No hay turnos habilitados'
                        : 'Seleccioná un turno'}
                </option>

                {turnos.map((turno) => (
                  <option key={turno.id} value={turno.id}>
                    {turno.nombre} · {turno.sede} ·{' '}
                    {turno.cupos_disponibles > 0
                      ? `${turno.cupos_disponibles} cupos disponibles`
                      : 'Lista de espera'}
                  </option>
                ))}
              </select>

              {errorTurnos && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {errorTurnos}
                </p>
              )}

              <div className="mt-4 flex gap-2 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
                <Info size={20} className="shrink-0" />
                <p>
                  Si el turno está completo, la solicitud ingresará
                  a la lista de espera.
                </p>
              </div>

            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">

              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                  <UsersRound size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-[#142D50]">
                    Datos del chico
                  </h2>
                  <p className="text-sm text-slate-500">
                    Ingresá los datos del participante.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                <div>
                  <label
                    htmlFor="nombre_chico"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Nombre *
                  </label>

                  <input
                    id="nombre_chico"
                    type="text"
                    minLength={2}
                    maxLength={100}
                    required
                    value={formulario.nombre_chico}
                    onChange={(e) =>
                      actualizarCampo('nombre_chico', e.target.value)
                    }
                    className={estiloInput}
                    placeholder="Nombre"
                  />
                </div>

                <div>
                  <label
                    htmlFor="apellido_chico"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Apellido *
                  </label>

                  <input
                    id="apellido_chico"
                    type="text"
                    minLength={2}
                    maxLength={100}
                    required
                    value={formulario.apellido_chico}
                    onChange={(e) =>
                      actualizarCampo('apellido_chico', e.target.value)
                    }
                    className={estiloInput}
                    placeholder="Apellido"
                  />
                </div>

                <div>
                  <label
                    htmlFor="dni_chico"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    DNI *
                  </label>

                  <input
                    id="dni_chico"
                    type="text"
                    minLength={6}
                    maxLength={20}
                    required
                    value={formulario.dni_chico}
                    onChange={(e) =>
                      actualizarCampo('dni_chico', e.target.value)
                    }
                    className={estiloInput}
                    placeholder="DNI sin puntos"
                  />
                </div>

                <div>
                  <label
                    htmlFor="fecha_nacimiento"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Fecha de nacimiento *
                  </label>

                  <input
                    id="fecha_nacimiento"
                    type="date"
                    required
                    max={new Date().toLocaleDateString('en-CA')}
                    value={formulario.fecha_nacimiento}
                    onChange={(e) =>
                      actualizarCampo('fecha_nacimiento', e.target.value)
                    }
                    className={estiloInput}
                  />
                </div>

              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">

              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
                  <UserRound size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-[#142D50]">
                    Datos del tutor
                  </h2>
                  <p className="text-sm text-slate-500">
                    Ingresá los datos de la persona responsable.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                <div>
                  <label
                    htmlFor="nombre_tutor"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Nombre *
                  </label>

                  <input
                    id="nombre_tutor"
                    type="text"
                    minLength={2}
                    maxLength={120}
                    required
                    value={formulario.nombre_tutor}
                    onChange={(e) =>
                      actualizarCampo('nombre_tutor', e.target.value)
                    }
                    className={estiloInput}
                    placeholder="Nombre"
                  />
                </div>

                <div>
                  <label
                    htmlFor="apellido_tutor"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Apellido *
                  </label>

                  <input
                    id="apellido_tutor"
                    type="text"
                    minLength={2}
                    maxLength={120}
                    required
                    value={formulario.apellido_tutor}
                    onChange={(e) =>
                      actualizarCampo('apellido_tutor', e.target.value)
                    }
                    className={estiloInput}
                    placeholder="Apellido"
                  />
                </div>

                <div>
                  <label
                    htmlFor="dni_tutor"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    DNI *
                  </label>

                  <input
                    id="dni_tutor"
                    type="text"
                    minLength={6}
                    maxLength={20}
                    required
                    value={formulario.dni_tutor}
                    onChange={(e) =>
                      actualizarCampo('dni_tutor', e.target.value)
                    }
                    className={estiloInput}
                    placeholder="DNI sin puntos"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email_tutor"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Correo electrónico *
                  </label>

                  <input
                    id="email_tutor"
                    type="email"
                    required
                    value={formulario.email_tutor}
                    onChange={(e) =>
                      actualizarCampo('email_tutor', e.target.value)
                    }
                    className={estiloInput}
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="telefono_tutor"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Teléfono *
                  </label>

                  <input
                    id="telefono_tutor"
                    type="tel"
                    minLength={6}
                    maxLength={50}
                    required
                    value={formulario.telefono_tutor}
                    onChange={(e) =>
                      actualizarCampo('telefono_tutor', e.target.value)
                    }
                    className={estiloInput}
                    placeholder="Teléfono de contacto"
                  />
                </div>

              </div>
            </section>
            {errorInscripcion && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-4 text-red-700"
              >
                {errorInscripcion}
              </p>
            )}

            {mensajeExito && (
              <p
                role="status"
                className="rounded-xl bg-green-50 p-4 text-green-800"
              >
                {mensajeExito}
              </p>
            )}

            <div className="flex justify-end pb-6">
              <button
                type="submit"
                disabled={
                  enviando ||
                  cargandoTurnos ||
                  Boolean(errorTurnos) ||
                  !formulario.turno_id ||
                  Boolean(mensajeExito)
                }
                className="flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {enviando ? 'Registrando...' : 'Solicitar inscripción'}
                <ArrowRight size={20} />
              </button>
            </div>

          </form>
        )}
      </div>
    </main>
  )
}

export default NuevaInscripcionPage