
import BannerBienvenida from '../components/BannerBienvenida'
import AccesosRapidos from '../components/AccesosRapidos'
import InformacionColonia from '../components/InformacionColonia'

function InicioPage() {
  return (
    <div className="flex min-h-[calc(100dvh-80px)] flex-col bg-[#F5F9FC]">

      <div className="shrink-0">
        <BannerBienvenida />
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5 py-3 lg:px-6">

        <div className="shrink-0">
          <AccesosRapidos />
        </div>

        <div className="flex-1">
          <InformacionColonia />
        </div>

      </div>

    </div>
  )
}

export default InicioPage



