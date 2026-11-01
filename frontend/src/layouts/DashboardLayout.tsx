import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'

function DashboardLayout() {
  return (
    <div className="min-h-dvh bg-[#B7C7D8]">

      {/* Navbar fijo arriba */}
      <div className="fixed inset-x-0 top-0 z-50">
        <Navbar />
      </div>

      {/* Contenido de las páginas */}
      <main className="min-w-0 pt-[80px]">
        <Outlet />
      </main>

    </div>
  )
}

export default DashboardLayout

