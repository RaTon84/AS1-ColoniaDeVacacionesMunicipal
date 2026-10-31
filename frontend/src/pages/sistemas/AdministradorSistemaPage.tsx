import {
  Settings2,
  CalendarDays,
  UsersRound,
  Clock3,
  Database,
  Server,
  ShieldCheck,
  Activity,
  KeyRound,
  Info,
  CheckCircle2,
  ClipboardList,
  UserCog,
  CalendarCog,
} from 'lucide-react'

const configuracion = {
  temporada: 2027,
  cuposPrevistos: 600,
  periodoInscripcion: '3 semanas',
  edadMinima: 6,
  edadMaxima: 12,
}

const servicios = [
  {
    nombre: 'API FastAPI',
    descripcion: 'Lógica de negocio e inscripciones',
    icono: Server,
  },
  {
    nombre: 'PostgreSQL',
    descripcion: 'Persistencia de datos',
    icono: Database,
  },
  {
    nombre: 'Keycloak',
    descripcion: 'Autenticación y roles de usuarios',
    icono: KeyRound,
  },
  {
    nombre: 'Padrón municipal',
    descripcion: 'Verificación de residencia mediante WireMock',
    icono: ShieldCheck,
  },
]

const perfiles = [
  {
    nombre: 'Tutor',
    descripcion: 'Realiza inscripciones y consulta sus solicitudes.',
    icono: UsersRound,
    color: 'bg-blue-100 text-blue-700',
  },
  {
    nombre: 'Administrativo',
    descripcion:
      'Consulta inscripciones y atiende las solicitudes que requieren revisión.',
    icono: ClipboardList,
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    nombre: 'Administrador de Sistemas',
    descripcion:
      'Supervisa la aplicación y administra la configuración técnica autorizada.',
    icono: UserCog,
    color: 'bg-violet-100 text-violet-700',
  },
]

function AdministracionSistemaPage() {
  return (
    <main className="min-h-screen bg-[#F5F9FC] px-5 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl">

        <header className="mb-7">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <Settings2 size={28} />
            </div>

            <div>
              <h1 className="text-3xl font-extrabold text-[#142D50]">
                Administración del sistema
              </h1>

              <p className="mt-1 text-slate-600">
                Configuración y supervisión de la colonia municipal.
              </p>
            </div>
          </div>
        </header>

        <section
          aria-label="Resumen de configuración"
          className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >

          <article className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <CalendarDays size={28} />
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Temporada de ejemplo
              </p>

              <p className="text-2xl font-extrabold text-[#142D50]">
                {configuracion.temporada}
              </p>
            </div>
          </article>

          <article className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
              <UsersRound size={28} />
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Cupos previstos
              </p>

              <p className="text-2xl font-extrabold text-[#142D50]">
                {configuracion.cuposPrevistos}
              </p>
            </div>
          </article>

          <article className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
            <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
              <Clock3 size={28} />
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Período de inscripción
              </p>

              <p className="text-2xl font-extrabold text-[#142D50]">
                {configuracion.periodoInscripcion}
              </p>
            </div>
          </article>

        </section>

        <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">

          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <CalendarCog size={25} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#142D50]">
                Configuración de la temporada
              </h2>

              <p className="text-sm text-slate-500">
                Parámetros previstos para el funcionamiento de la colonia.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            <div>
              <label
                htmlFor="temporada-sistema"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Temporada
              </label>

              <input
                id="temporada-sistema"
                type="number"
                value={configuracion.temporada}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
              />
            </div>

            <div>
              <label
                htmlFor="cupos-sistema"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Cupos totales previstos
              </label>

              <input
                id="cupos-sistema"
                type="number"
                value={configuracion.cuposPrevistos}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
              />
            </div>

            <div>
              <label
                htmlFor="periodo-sistema"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Período de inscripción
              </label>

              <input
                id="periodo-sistema"
                type="text"
                value={configuracion.periodoInscripcion}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
              />
            </div>

            <div>
              <label
                htmlFor="edades-sistema"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Rango de edades
              </label>

              <input
                id="edades-sistema"
                type="text"
                value={`${configuracion.edadMinima} a ${configuracion.edadMaxima} años`}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
              />
            </div>

          </div>

          <div className="mt-5 flex items-start gap-2 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
            <Info size={19} className="shrink-0" />
            <p>
              Esta sección es de solo lectura por ahora.
              La edición de parámetros se habilitará únicamente
              si el backend incorpora operaciones de configuración.
            </p>
          </div>

        </section>

        <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">

          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-cyan-100 p-3 text-cyan-700">
              <Activity size={25} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#142D50]">
                Estado del sistema
              </h2>

              <p className="text-sm text-slate-500">
                Servicios principales de la arquitectura.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            {servicios.map((servicio) => {
              const Icono = servicio.icono

              return (
                <article
                  key={servicio.nombre}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">

                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
                        <Icono size={24} />
                      </div>

                      <div>
                        <h3 className="font-bold text-[#142D50]">
                          {servicio.nombre}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {servicio.descripcion}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      Sin verificar
                    </span>

                  </div>
                </article>
              )
            })}

          </div>

          <div className="mt-5 flex items-start gap-2 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
            <Info size={19} className="shrink-0" />

            <p>
              El estado de los servicios todavía no se consulta
              automáticamente. Más adelante integraremos los
              mecanismos de supervisión disponibles.
            </p>
          </div>

        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">

          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
              <ShieldCheck size={25} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#142D50]">
                Perfiles del sistema
              </h2>

              <p className="text-sm text-slate-500">
                Responsabilidades de los tres perfiles definidos.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {perfiles.map((perfil) => {
              const Icono = perfil.icono

              return (
                <article
                  key={perfil.nombre}
                  className="flex items-start gap-4 rounded-xl border border-slate-200 p-4"
                >
                  <div className={`shrink-0 rounded-xl p-3 ${perfil.color}`}>
                    <Icono size={23} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-[#142D50]">
                      {perfil.nombre}
                    </h3>

                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {perfil.descripcion}
                    </p>
                  </div>

                  <CheckCircle2
                    size={19}
                    className="ml-auto shrink-0 text-slate-300"
                    aria-hidden="true"
                  />
                </article>
              )
            })}
          </div>

          <p className="mt-5 text-sm text-slate-500">
            La autenticación y asignación real de roles
            se integrará mediante Keycloak.
          </p>

        </section>

        <div className="mt-6 flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
          <Info size={20} className="shrink-0" />

          <p>
            Esta es una versión visual del panel de Sistemas.
            La configuración mostrada es ilustrativa y
            todavía no se realizan operaciones sobre el backend.
          </p>
        </div>

      </div>
    </main>
  )
}

export default AdministracionSistemaPage
