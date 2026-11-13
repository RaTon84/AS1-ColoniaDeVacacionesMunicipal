import { useEffect, useState, type FormEvent } from "react";
import { UserPlus, Pencil, UserX, UserCheck, X } from "lucide-react";
import keycloak from "../../auth/keycloak";
import {
  crearUsuario,
  listarUsuarios,
  modificarUsuario,
  type RolPersonal,
  type UsuarioCambios,
  type UsuarioPersonal,
} from "../../services/usuarios";

const nombresRol: Record<RolPersonal, string> = {
  administrativo: "Administrativo",
  administrador_sistema: "Administrador de Sistemas",
};

const nuevoVacio = {
  usuario: "",
  nombre: "",
  apellido: "",
  email: "",
  rol: "administrativo" as RolPersonal,
  clave_temporal: "",
};

const campo = "mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2";

async function token(): Promise<string> {
  await keycloak.updateToken(30);
  if (!keycloak.token) throw new Error("Volvé a iniciar sesión.");
  return keycloak.token;
}

function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioPersonal[] | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [nuevo, setNuevo] = useState(nuevoVacio);
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<UsuarioCambios | null>(null);
  const yo = keycloak.tokenParsed?.sub;

  async function cargar() {
    try {
      setUsuarios(await listarUsuarios(await token()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los usuarios.");
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  async function ejecutar(accion: () => Promise<unknown>, mensaje: string) {
    setOcupado(true);
    setError("");
    setAviso("");
    try {
      await accion();
      setAviso(mensaje);
      await cargar();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la operación.");
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const ok = await ejecutar(
      async () => crearUsuario(await token(), nuevo),
      `Cuenta «${nuevo.usuario}» registrada. Va a tener que cambiar la clave temporal al ingresar.`,
    );
    if (ok) setNuevo(nuevoVacio);
  }

  async function guardar(id: string) {
    if (!borrador) return;
    const ok = await ejecutar(async () => modificarUsuario(await token(), id, borrador), "Cambios guardados.");
    if (ok) setEditando(null);
  }

  function cambiarEstado(u: UsuarioPersonal) {
    const { nombre, apellido, email, rol } = u;
    void ejecutar(
      async () => modificarUsuario(await token(), u.id, { nombre, apellido, email, rol, habilitado: !u.habilitado }),
      u.habilitado ? `Se dio de baja a «${u.usuario}».` : `Se reactivó a «${u.usuario}».`,
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={registrar} className="rounded-xl border border-slate-200 p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus size={20} className="text-blue-700" />
          <h3 className="font-bold text-[#142D50]">Registrar personal municipal</h3>
        </div>

        <fieldset disabled={ocupado} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">
            Usuario
            <input required minLength={3} pattern="[a-zA-Z0-9._\-]+" value={nuevo.usuario}
              onChange={(e) => setNuevo({ ...nuevo, usuario: e.target.value })} className={campo} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Nombre
            <input required minLength={2} value={nuevo.nombre}
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} className={campo} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Apellido
            <input required minLength={2} value={nuevo.apellido}
              onChange={(e) => setNuevo({ ...nuevo, apellido: e.target.value })} className={campo} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Correo
            <input required type="email" value={nuevo.email}
              onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} className={campo} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Rol
            <select value={nuevo.rol}
              onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value as RolPersonal })} className={campo}>
              <option value="administrativo">Administrativo</option>
              <option value="administrador_sistema">Administrador de Sistemas</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Clave temporal
            <input required minLength={8} type="password" autoComplete="new-password" value={nuevo.clave_temporal}
              onChange={(e) => setNuevo({ ...nuevo, clave_temporal: e.target.value })} className={campo} />
          </label>
        </fieldset>

        <button type="submit" disabled={ocupado}
          className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
          {ocupado ? "Guardando…" : "Registrar"}
        </button>
      </form>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {aviso && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{aviso}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th scope="col" className="px-3 py-2">Persona</th>
              <th scope="col" className="px-3 py-2">Usuario</th>
              <th scope="col" className="px-3 py-2">Correo</th>
              <th scope="col" className="px-3 py-2">Rol</th>
              <th scope="col" className="px-3 py-2">Estado</th>
              <th scope="col" className="px-3 py-2"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {usuarios === null && !error && (
              <tr><td colSpan={6} className="px-3 py-3 text-slate-600" role="status">Cargando usuarios…</td></tr>
            )}
            {usuarios?.map((u) =>
              editando === u.id && borrador ? (
                <tr key={u.id} className="bg-blue-50/50">
                  <td className="px-3 py-2">
                    <input aria-label="Nombre" value={borrador.nombre}
                      onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
                      className="w-28 rounded-lg border border-slate-300 px-2 py-1" />{" "}
                    <input aria-label="Apellido" value={borrador.apellido}
                      onChange={(e) => setBorrador({ ...borrador, apellido: e.target.value })}
                      className="mt-1 w-28 rounded-lg border border-slate-300 px-2 py-1" />
                  </td>
                  <td className="px-3 py-2">{u.usuario}</td>
                  <td className="px-3 py-2">
                    <input aria-label="Correo" type="email" value={borrador.email}
                      onChange={(e) => setBorrador({ ...borrador, email: e.target.value })}
                      className="w-48 rounded-lg border border-slate-300 px-2 py-1" />
                  </td>
                  <td className="px-3 py-2">
                    <select aria-label="Rol" value={borrador.rol}
                      onChange={(e) => setBorrador({ ...borrador, rol: e.target.value as RolPersonal })}
                      className="rounded-lg border border-slate-300 px-2 py-1">
                      <option value="administrativo">Administrativo</option>
                      <option value="administrador_sistema">Administrador de Sistemas</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">{u.habilitado ? "Activo" : "De baja"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button type="button" disabled={ocupado} onClick={() => void guardar(u.id)}
                      className="rounded-lg bg-blue-700 px-3 py-1 font-semibold text-white disabled:opacity-50">Guardar</button>{" "}
                    <button type="button" onClick={() => setEditando(null)} aria-label="Cancelar edición"
                      className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
                  </td>
                </tr>
              ) : (
                <tr key={u.id} className={u.habilitado ? "" : "text-slate-400"}>
                  <td className="px-3 py-2 font-semibold">{u.nombre} {u.apellido}{u.id === yo && " (vos)"}</td>
                  <td className="px-3 py-2">{u.usuario}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{nombresRol[u.rol]}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      u.habilitado ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                      {u.habilitado ? "Activo" : "De baja"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button type="button" disabled={ocupado} aria-label={`Modificar a ${u.usuario}`}
                      onClick={() => {
                        setEditando(u.id);
                        setBorrador({ nombre: u.nombre, apellido: u.apellido, email: u.email, rol: u.rol, habilitado: u.habilitado });
                      }}
                      className="rounded-lg p-1.5 text-blue-700 hover:bg-blue-50 disabled:opacity-50"><Pencil size={18} /></button>
                    <button type="button" disabled={ocupado || u.id === yo}
                      aria-label={u.habilitado ? `Dar de baja a ${u.usuario}` : `Reactivar a ${u.usuario}`}
                      title={u.id === yo ? "No podés darte de baja a vos mismo" : undefined}
                      onClick={() => cambiarEstado(u)}
                      className={`ml-1 rounded-lg p-1.5 disabled:opacity-30 ${
                        u.habilitado ? "text-red-700 hover:bg-red-50" : "text-emerald-700 hover:bg-emerald-50"}`}>
                      {u.habilitado ? <UserX size={18} /> : <UserCheck size={18} />}
                    </button>
                  </td>
                </tr>
              ),
            )}
            {usuarios?.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-3 text-slate-600">No hay cuentas del personal.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-slate-500">
        Las cuentas se guardan en Keycloak. La baja deshabilita la cuenta sin borrarla y se puede revertir.
        Los tutores no se gestionan desde acá.
      </p>
    </div>
  );
}

export default GestionUsuarios;
