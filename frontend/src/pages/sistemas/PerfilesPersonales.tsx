import GestionUsuarios from "./GestionUsuarios";

export default function PerfilesPersonal({ visible }: { visible: boolean }) {
  return (
    <section
      hidden={!visible}
      className="rounded-2xl bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-xl font-bold text-[#142D50]">
        Cuentas del personal municipal
      </h2>

      <p className="mb-5 mt-1 text-sm text-slate-500">
        Alta, baja y cambio de rol de administrativos y administradores del
        sistema.
      </p>

      <GestionUsuarios />
    </section>
  );
}