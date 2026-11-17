import type { Turno } from "../../types/turno";

export type TurnoEditable = Turno & { cupoEditable: string };

type TablaCuposProps = {
  turnosCupos: TurnoEditable[];
  maxCupos: number;
  onCambiarCupo: (id: TurnoEditable["id"], cupoEditable: string) => void;
};

export default function TablaCupos({
  turnosCupos,
  maxCupos,
  onCambiarCupo,
}: TablaCuposProps) {
  return (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-700">
                          <tr>
                            <th scope="col" className="px-3 py-2">
                              Sede
                            </th>
                            <th scope="col" className="px-3 py-2">
                              Período
                            </th>
                            <th scope="col" className="px-3 py-2">
                              Turno
                            </th>
                            <th scope="col" className="px-3 py-2">
                              Cupos
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200">
                          {turnosCupos.map((turno) => (
                            <tr key={turno.id}>
                              <td className="px-3 py-2">{turno.sede}</td>
                              <td className="whitespace-nowrap px-3 py-2">
                                {turno.fecha_desde
                                  .split("-")
                                  .reverse()
                                  .join("/")}
                                {" al "}
                                {turno.fecha_hasta
                                  .split("-")
                                  .reverse()
                                  .join("/")}
                              </td>
                              <td className="px-3 py-2">{turno.nombre}</td>
                              <td className="px-3 py-2">
                                <input
                                  aria-label={`Cupos para ${turno.sede}, ${turno.nombre}`}
                                  type="number"
                                  min={0}
                                  max={maxCupos}
                                  step={1}
                                  required
                                  value={turno.cupoEditable}
                                  onChange={(evento) => onCambiarCupo(turno.id, evento.target.value)}
                                  className="w-24 rounded-lg border border-slate-300 px-2 py-1.5"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
  );
}