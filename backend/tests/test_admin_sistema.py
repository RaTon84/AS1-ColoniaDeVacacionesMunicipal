"""Tests mínimos del rol administrador_sistema.

Cubren la configuración de temporada, el período de inscripción, la
distribución de cupos, el CRUD de turnos, la copia de turnos, /system-info y
el recorte de permisos sobre inscripciones (punto 1b).
"""

from datetime import date


def configurar_temporada(cliente, temporada=2027, edad_minima=6, edad_maxima=12):
    return cliente.put(
        "/api/v1/admin/configuracion-temporada",
        json={
            "temporada": temporada,
            "edad_minima": edad_minima,
            "edad_maxima": edad_maxima,
        },
    )


def crear_turno(
    cliente,
    nombre="Turno mañana",
    sede="Polideportivo",
    fecha_desde="2027-01-05",
    fecha_hasta="2027-01-30",
    cupo_total=100,
):
    return cliente.post(
        "/api/v1/admin/turnos",
        json={
            "nombre": nombre,
            "sede": sede,
            "fecha_desde": fecha_desde,
            "fecha_hasta": fecha_hasta,
            "cupo_total": cupo_total,
        },
    )


def test_activar_temporada_y_edades(autenticar):
    cliente = autenticar("administrador_sistema")

    respuesta = configurar_temporada(
        cliente, temporada=2028, edad_minima=5, edad_maxima=13
    )

    assert respuesta.status_code == 200
    assert respuesta.json() == {
        "temporada": 2028,
        "edad_minima": 5,
        "edad_maxima": 13,
    }

    consulta = cliente.get("/api/v1/admin/configuracion-temporada")
    assert consulta.status_code == 200
    assert consulta.json()["temporada"] == 2028

    # Activar otra temporada desactiva la anterior.
    assert configurar_temporada(cliente, temporada=2029).status_code == 200
    assert (
        cliente.get("/api/v1/admin/configuracion-temporada").json()["temporada"]
        == 2029
    )


def test_temporada_rechaza_edades_invertidas(autenticar):
    cliente = autenticar("administrador_sistema")

    respuesta = configurar_temporada(cliente, edad_minima=12, edad_maxima=6)

    assert respuesta.status_code == 422


def test_guardar_periodo_de_inscripcion(autenticar):
    cliente = autenticar("administrador_sistema")
    assert configurar_temporada(cliente, temporada=2027).status_code == 200

    respuesta = cliente.put(
        "/api/v1/admin/periodo-inscripcion",
        json={
            "apertura": "2026-11-01T09:00",
            "cierre": "2026-12-15T18:00",
        },
    )

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["temporada"] == 2027
    assert cuerpo["apertura"].startswith("2026-11-01T09:00")
    assert cuerpo["cierre"].startswith("2026-12-15T18:00")

    consulta = cliente.get("/api/v1/admin/periodo-inscripcion")
    assert consulta.status_code == 200
    assert consulta.json()["apertura"].startswith("2026-11-01T09:00")


def test_periodo_rechaza_cierre_anterior(autenticar):
    cliente = autenticar("administrador_sistema")

    respuesta = cliente.put(
        "/api/v1/admin/periodo-inscripcion",
        json={
            "apertura": "2026-12-15T18:00",
            "cierre": "2026-11-01T09:00",
        },
    )

    assert respuesta.status_code == 422


def test_borrar_periodo_de_inscripcion(autenticar):
    cliente = autenticar("administrador_sistema")
    assert configurar_temporada(cliente, temporada=2027).status_code == 200
    assert (
        cliente.put(
            "/api/v1/admin/periodo-inscripcion",
            json={
                "apertura": "2026-11-01T09:00",
                "cierre": "2026-12-15T18:00",
            },
        ).status_code
        == 200
    )

    borrado = cliente.delete("/api/v1/admin/periodo-inscripcion")
    assert borrado.status_code == 204
    assert borrado.content == b""

    consulta = cliente.get("/api/v1/admin/periodo-inscripcion").json()
    assert consulta["temporada"] == 2027
    assert consulta["apertura"] is None
    assert consulta["cierre"] is None

    # Es idempotente: borrar de nuevo no falla.
    assert cliente.delete("/api/v1/admin/periodo-inscripcion").status_code == 204


def test_periodo_borrado_cierra_la_inscripcion(autenticar):
    sistema = autenticar("administrador_sistema")
    assert configurar_temporada(sistema, temporada=2027).status_code == 200
    turno = crear_turno(sistema)
    assert turno.status_code == 201
    assert (
        sistema.put(
            "/api/v1/admin/periodo-inscripcion",
            json={
                "apertura": "2026-11-01T09:00",
                "cierre": "2026-12-15T18:00",
            },
        ).status_code
        == 200
    )

    # Sin período configurado no se puede inscribir, aunque el turno exista.
    assert sistema.delete("/api/v1/admin/periodo-inscripcion").status_code == 204

    tutor = autenticar("tutor")
    respuesta = tutor.post(
        "/api/v1/inscripciones",
        json={
            "turno_id": turno.json()["id"],
            "dni_chico": "40111222",
            "nombre_chico": "Ana",
            "apellido_chico": "Pérez",
            "fecha_nacimiento": "2018-06-01",
            "dni_tutor": "30111222",
            "nombre_tutor": "Laura",
            "apellido_tutor": "Pérez",
            "email_tutor": "tutor1@example.com",
            "telefono_tutor": "1122334455",
        },
    )

    assert respuesta.status_code == 409
    assert respuesta.json()["type"] == "/problemas/periodo-no-abierto"

    publico = tutor.get("/api/v1/periodo-inscripcion")
    assert publico.status_code == 200
    assert publico.json()["estado"] == "sin_configurar"


def test_distribuir_cupos(autenticar):
    cliente = autenticar("administrador_sistema")
    assert configurar_temporada(cliente, temporada=2027).status_code == 200

    primero = crear_turno(cliente, nombre="Mañana", cupo_total=100)
    segundo = crear_turno(cliente, nombre="Tarde", cupo_total=100)
    assert primero.status_code == 201
    assert segundo.status_code == 201

    respuesta = cliente.put(
        "/api/v1/admin/distribucion-cupos",
        json={
            "temporada": 2027,
            "turnos": [
                {"turno_id": primero.json()["id"], "cupo_total": 150},
                {"turno_id": segundo.json()["id"], "cupo_total": 120},
            ],
        },
    )

    assert respuesta.status_code == 200
    cupos = {turno["nombre"]: turno["cupo_total"] for turno in respuesta.json()}
    assert cupos == {"Mañana": 150, "Tarde": 120}

    # Supera el tope de 600 para la temporada.
    excedido = cliente.put(
        "/api/v1/admin/distribucion-cupos",
        json={
            "temporada": 2027,
            "turnos": [
                {"turno_id": primero.json()["id"], "cupo_total": 400},
                {"turno_id": segundo.json()["id"], "cupo_total": 300},
            ],
        },
    )
    assert excedido.status_code == 422


def test_crud_de_turnos(autenticar):
    cliente = autenticar("administrador_sistema")
    assert configurar_temporada(cliente, temporada=2027).status_code == 200

    creado = crear_turno(cliente, cupo_total=80)
    assert creado.status_code == 201
    turno = creado.json()
    assert turno["temporada"] == 2027
    assert turno["cupos_disponibles"] == 80

    actualizado = cliente.put(
        f"/api/v1/admin/turnos/{turno['id']}",
        json={
            "nombre": "Turno tarde",
            "sede": "Polideportivo",
            "fecha_desde": "2027-02-01",
            "fecha_hasta": "2027-02-20",
            "cupo_total": 90,
        },
    )
    assert actualizado.status_code == 200
    assert actualizado.json()["nombre"] == "Turno tarde"
    assert actualizado.json()["cupo_total"] == 90

    eliminado = cliente.delete(f"/api/v1/admin/turnos/{turno['id']}")
    assert eliminado.status_code == 204
    assert cliente.get("/api/v1/turnos").json() == []


def test_turno_rechaza_cupos_invalidos(autenticar):
    cliente = autenticar("administrador_sistema")
    assert configurar_temporada(cliente, temporada=2027).status_code == 200

    # Un turno no puede superar el tope de la temporada.
    assert crear_turno(cliente, cupo_total=601).status_code == 422

    assert crear_turno(cliente, cupo_total=400).status_code == 201

    # La suma de los turnos tampoco puede superar 600.
    assert crear_turno(cliente, nombre="Tarde", cupo_total=300).status_code == 422


def test_turno_rechaza_fechas_fuera_de_la_temporada(autenticar):
    cliente = autenticar("administrador_sistema")
    assert configurar_temporada(cliente, temporada=2027).status_code == 200

    assert (
        crear_turno(
            cliente,
            fecha_desde="2026-12-01",
            fecha_hasta="2027-01-15",
        ).status_code
        == 422
    )
    assert (
        crear_turno(
            cliente,
            fecha_desde="2027-12-20",
            fecha_hasta="2028-01-10",
        ).status_code
        == 422
    )


def test_turno_rechaza_superposicion(autenticar):
    cliente = autenticar("administrador_sistema")
    assert configurar_temporada(cliente, temporada=2027).status_code == 200

    original = crear_turno(
        cliente,
        nombre="Turno mañana",
        sede="Polideportivo",
        fecha_desde="2027-01-05",
        fecha_hasta="2027-01-30",
    )
    assert original.status_code == 201

    # Mismo nombre y sede con fechas superpuestas.
    solapado = crear_turno(
        cliente,
        nombre="Turno mañana",
        sede="Polideportivo",
        fecha_desde="2027-01-20",
        fecha_hasta="2027-02-05",
    )
    assert solapado.status_code == 409

    # El mismo nombre en otra sede no se considera superposición.
    assert (
        crear_turno(
            cliente,
            nombre="Turno mañana",
            sede="Club Municipal",
            fecha_desde="2027-01-05",
            fecha_hasta="2027-01-30",
        ).status_code
        == 201
    )

    # Un turno distinto en la misma sede y fechas tampoco se superpone.
    tarde = crear_turno(
        cliente,
        nombre="Turno tarde",
        sede="Polideportivo",
        fecha_desde="2027-01-05",
        fecha_hasta="2027-01-30",
    )
    assert tarde.status_code == 201

    # Al editar tampoco se puede solapar con otro turno existente.
    edicion = cliente.put(
        f"/api/v1/admin/turnos/{original.json()['id']}",
        json={
            "nombre": "Turno tarde",
            "sede": "Polideportivo",
            "fecha_desde": "2027-01-10",
            "fecha_hasta": "2027-01-20",
            "cupo_total": 100,
        },
    )
    assert edicion.status_code == 409


def test_historial_de_temporadas(autenticar):
    cliente = autenticar("administrador_sistema")
    assert configurar_temporada(cliente, temporada=2027).status_code == 200
    assert crear_turno(cliente, cupo_total=100).status_code == 201

    assert configurar_temporada(cliente, temporada=2028).status_code == 200

    historial = cliente.get("/api/v1/admin/temporadas")
    assert historial.status_code == 200

    por_temporada = {
        item["temporada"]: item for item in historial.json()
    }
    assert por_temporada[2028]["activa"] is True
    assert por_temporada[2028]["turnos"] == 0
    assert por_temporada[2027]["activa"] is False
    assert por_temporada[2027]["turnos"] == 1

    anteriores = cliente.get(
        "/api/v1/admin/turnos", params={"temporada": 2027}
    )
    assert anteriores.status_code == 200
    assert len(anteriores.json()) == 1
    assert anteriores.json()[0]["temporada"] == 2027

    activa = cliente.get(
        "/api/v1/admin/turnos", params={"temporada": 2028}
    )
    assert activa.status_code == 200
    assert activa.json() == []

    # Sin parámetro, devuelve los turnos de la temporada activa.
    assert cliente.get("/api/v1/admin/turnos").json() == []


def test_historial_requiere_administrador_sistema(autenticar):
    tutor = autenticar("tutor")

    assert tutor.get("/api/v1/admin/temporadas").status_code == 403
    assert tutor.get("/api/v1/admin/turnos").status_code == 403

    administrador = autenticar("administrador_sistema")

    assert administrador.get("/api/v1/admin/temporadas").status_code == 200
    assert administrador.get("/api/v1/admin/turnos").status_code == 200


def test_copiar_turnos_de_la_temporada_anterior(autenticar):
    cliente = autenticar("administrador_sistema")
    assert configurar_temporada(cliente, temporada=2027).status_code == 200

    original = crear_turno(
        cliente,
        fecha_desde="2027-01-05",
        fecha_hasta="2027-01-30",
        cupo_total=120,
    )
    assert original.status_code == 201

    # La temporada activa pasa a 2028 y queda sin turnos.
    assert configurar_temporada(cliente, temporada=2028).status_code == 200

    copiados = cliente.post(
        "/api/v1/admin/turnos/copiar",
        json={"temporada_origen": 2027},
    )

    assert copiados.status_code == 201
    assert len(copiados.json()) == 1
    nuevo = copiados.json()[0]
    assert nuevo["temporada"] == 2028
    assert date.fromisoformat(nuevo["fecha_desde"]).year == 2028
    assert nuevo["cupo_total"] == 120

    # La temporada activa ya tiene turnos: no se vuelve a copiar.
    repetido = cliente.post(
        "/api/v1/admin/turnos/copiar",
        json={"temporada_origen": 2027},
    )
    assert repetido.status_code == 409


def test_system_info_requiere_administrador_sistema(autenticar, monkeypatch):
    monkeypatch.setattr(
        "app.api.system._probe",
        lambda db: {
            "api": "ok",
            "database": "ok",
            "keycloak": "ok",
            "padron": "ok",
        },
    )

    administrador = autenticar("administrador_sistema")
    assert configurar_temporada(administrador, temporada=2027).status_code == 200

    respuesta = administrador.get("/api/v1/system-info")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["temporada"] == 2027
    assert cuerpo["services"] == {
        "api": "ok",
        "database": "ok",
        "keycloak": "ok",
        "padron": "ok",
    }

    tutor = autenticar("tutor")
    assert tutor.get("/api/v1/system-info").status_code == 403


def test_administrador_sistema_no_gestiona_inscripciones(autenticar):
    administrador = autenticar("administrador_sistema")

    assert administrador.get("/api/v1/admin/inscripciones").status_code == 403
    assert administrador.get("/api/v1/periodo-inscripcion").status_code == 403

    administrativo = autenticar("administrativo")

    assert administrativo.get("/api/v1/admin/inscripciones").status_code == 200
    assert administrativo.get("/api/v1/periodo-inscripcion").status_code == 200
