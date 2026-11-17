import { useMatch } from "react-router-dom";
import { Settings2 } from "lucide-react";
import ConfiguracionTemporada from "./ConfiguracionTemporada";
import EstadoSistemaSeccion from "./EstadoSistemasSeccion";
import PerfilesPersonal from "./PerfilesPersonales";


function AdministracionSistemaPage() {
  const mostrarEstado = Boolean(useMatch("/sistemas/estado"));
  const mostrarPerfiles = Boolean(useMatch("/sistemas/perfiles"));
  const mostrarConfiguracion = !mostrarEstado && !mostrarPerfiles;

   return (
    <main className="min-h-screen bg-transparent px-5 py-8 lg:px-10">
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

        

<ConfiguracionTemporada visible={mostrarConfiguracion} />
        <EstadoSistemaSeccion visible={mostrarEstado} />
<PerfilesPersonal visible={mostrarPerfiles} />

        <PerfilesPersonal visible={mostrarPerfiles} />
      </div>
    </main>
  );
}

export default AdministracionSistemaPage;