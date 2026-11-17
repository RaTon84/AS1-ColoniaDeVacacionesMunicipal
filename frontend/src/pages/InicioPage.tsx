import BannerBienvenida from '../components/BannerBienvenida'
import AccesosRapidos from '../components/AccesosRapidos'
import InformacionColonia from '../components/InformacionColonia'

function InicioPage() {
  return (
    <div className="min-h-[calc(100dvh-80px)] bg-slate-50">
      <BannerBienvenida />

      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-6">
        <AccesosRapidos />
        <InformacionColonia />
      </div>
    </div>
  )
}

export default InicioPage