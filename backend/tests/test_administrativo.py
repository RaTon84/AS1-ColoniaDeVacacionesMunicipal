"""Tests del rol administrativo (admin normal).

Cubren el alta y la cancelación de inscripciones desde la oficina, la
promoción automática de la lista de espera, el recorte de permisos sobre la
configuración del sistema y la visibilidad de las inscripciones cargadas en
la oficina para el tutor.
"""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from app.integrations.padron import PadronClient

HORA_ARGENTINA = ZoneInfo("America/Argentina/Buenos_Aires")


def configurar_temporada(cliente, temporada=2027, edad_minima=6, edad_maxima=12):
    return cliente.put(
        "/api/v1/admin/configuracion-temporada",
        json={
            "temporada": temporada,
            "edad_minima": edad_minima,
            "edad_maxima": edad_maxima,
        },
    )


def abrir_periodo(cliente):
    ahora = datetime.now(HORA_ARGENTINA).replace(tzinfo=None)

    return cliente.put(
        "/api/v1/admin/periodo-inscripcion",
        json={
            "apertura": (ahora - timedelta(days=1)).isoformat(),
            "cierre": (ahora + timedelta(days=1)).isoformat(),
        },
    )


def crear_turno(cliente, nombre="Turno mañana", sede="Polideportivo", cupo_total=100):
    return cliente.post(
        "/api/v1/admin/turnos",
        json={
            "nombre": nombre,
            "sede": sede,
            "fecha_desde": "2027-01-05",
            "fecha_hasta": "2027-01-30",
            "cupo_total": cupo_total,
        },
    )


def preparar_temporada(cliente, cupo_total=100):
    assert configurar_temporada(cliente, temporada=2027).status_code == 200
    assert abrir_periodo(cliente).status_code == 200
    turno = crear_turno(cliente, cupo_total=cupo_total)
    assert turno.status_code == 201
    return turno.json()


def crear_inscripcion(
    cliente,
    turno_id,
    dni_chico="40111222",
    fecha_nacimiento="2018-06-01",
    email_tutor="tutor1@example.com",
):
    return cliente.post(
        "/api/v1/inscripciones",
        json={
            "turno_id": turno_id,
            "dni_chico": dni_chico,
            "nombre_chico": "Ana",
            "apellido_chico": "Pérez",
            "fecha_nacimiento": fecha_nacimiento,
            "dni_tutor": "30111222",
            "nombre_tutor": "Laura",
            "apellido_tutor": "Pérez",
            "email_tutor": email_tutor,
            "telefono_tutor": "1122334455",
        },
    )


@pytest.fixture(autouse=True)
def padron_disponible(monkeypatch):
    monkeypatch.setattr(PadronClient, "es_residente", lambda self, dni: True)


def test_administrativo_lista_inscripciones(autenticar):
    sistema = autenticar("administrador_sistema")
    turno = preparar_temporada(sistema)

    administrativo = autenticar("administrativo")
    respuesta = crear_inscripcion(administrativo, turno["id"])
    assert respuesta.status_code == 201, respuesta.json()

    listado = administrativo.get("/api/v1/admin/inscripciones")
    assert listado.status_code == 200
    assert len(listado.json()) == 1

    # El tutor y el administrador de sistemas no acceden al listado completo.
    assert autenticar("tutor").get("/api/v1/admin/inscripciones").status_code == 403
    assert (
        autenticar("administrador_sistema")
        .get("/api/v1/admin/inscripciones")
        .status_code
        == 403
    )


def test_administrativo_crea_y_cancela(autenticar):
    sistema = autenticar("administrador_sistema")
    turno = preparar_temporada(sistema)

    administrativo = autenticar("administrativo")
    creada = crear_inscripcion(administrativo, turno["id"])
    assert creada.status_code == 201
    assert creada.json()["estado"] == "CONFIRMADA"

    cancelada = administrativo.post(
        f"/api/v1/inscripciones/{creada.json()['id']}/cancelar"
    )
    assert cancelada.status_code == 200
    assert cancelada.json()["estado"] == "CANCELADA"

    # La oficina puede volver a inscribir al mismo chico tras una cancelación.
    nuevamente = crear_inscripcion(administrativo, turno["id"])
    assert nuevamente.status_code == 201
    assert nuevamente.json()["estado"] == "CONFIRMADA"


def test_administrativo_promueve_la_lista_de_espera(autenticar):
    sistema = autenticar("administrador_sistema")
    turno = preparar_temporada(sistema, cupo_total=1)

    administrativo = autenticar("administrativo")
    primera = crear_inscripcion(administrativo, turno["id"], dni_chico="40111222")
    segunda = crear_inscripcion(administrativo, turno["id"], dni_chico="40222333")

    assert primera.json()["estado"] == "CONFIRMADA"
    assert segunda.json()["estado"] == "LISTA_ESPERA"
    assert segunda.json()["posicion_espera"] == 1

    assert (
        administrativo.post(
            f"/api/v1/inscripciones/{primera.json()['id']}/cancelar"
        ).status_code
        == 200
    )

    listado = administrativo.get("/api/v1/admin/inscripciones").json()
    estados = {item["dni_chico"]: item for item in listado}

    assert estados["40111222"]["estado"] == "CANCELADA"
    assert estados["40222333"]["estado"] == "CONFIRMADA"
    assert estados["40222333"]["posicion_espera"] is None


def test_administrativo_no_configura_el_sistema(autenticar):
    sistema = autenticar("administrador_sistema")
    turno = preparar_temporada(sistema)
    administrativo = autenticar("administrativo")
    assert (
        administrativo.get("/api/v1/admin/configuracion-temporada").status_code
        == 403
    )
    assert (
        administrativo.put(
            "/api/v1/admin/configuracion-temporada",
            json={"temporada": 2028, "edad_minima": 6, "edad_maxima": 12},
        ).status_code
        == 403
    )
    assert (
        administrativo.get("/api/v1/admin/periodo-inscripcion").status_code == 403
    )
    assert (
        administrativo.delete("/api/v1/admin/periodo-inscripcion").status_code
        == 403
    )
    assert (
        administrativo.post(
            "/api/v1/admin/turnos",
            json={
                "nombre": "Otro turno",
                "sede": "Club",
                "fecha_desde": "2027-02-01",
                "fecha_hasta": "2027-02-20",
                "cupo_total": 10,
            },
        ).status_code
        == 403
    )
    assert (
        administrativo.put(
            "/api/v1/admin/distribucion-cupos",
            json={
                "temporada": 2027,
                "turnos": [{"turno_id": turno["id"], "cupo_total": 50}],
            },
        ).status_code
        == 403
    )
    assert administrativo.get("/api/v1/admin/temporadas").status_code == 403
    assert administrativo.get("/api/v1/system-info").status_code == 403

    # Pero sí consulta el período público y los turnos de la temporada.
    assert administrativo.get("/api/v1/periodo-inscripcion").status_code == 200
    assert administrativo.get("/api/v1/turnos").status_code == 200


def test_inscripcion_de_oficina_visible_para_el_tutor(autenticar):
    sistema = autenticar("administrador_sistema")
    turno = preparar_temporada(sistema)

    administrativo = autenticar("administrativo")
    creada = crear_inscripcion(
        administrativo,
        turno["id"],
        email_tutor="tutor1@example.com",
    )
    assert creada.status_code == 201

    tutor = autenticar("tutor", sub="tutor-de-test", email="tutor1@example.com")

    mias = tutor.get("/api/v1/mis-inscripciones")
    assert mias.status_code == 200
    assert [item["id"] for item in mias.json()] == [creada.json()["id"]]

    detalle = tutor.get(f"/api/v1/inscripciones/{creada.json()['id']}")
    assert detalle.status_code == 200

    # Otro tutor no ve la inscripción, aunque conozca el id.
    otro = autenticar("tutor", sub="otro-tutor", email="otro@example.com")
    assert otro.get("/api/v1/mis-inscripciones").json() == []
    assert otro.get(f"/api/v1/inscripciones/{creada.json()['id']}").status_code == 404


def test_administrativo_edita_los_datos_de_una_inscripcion(autenticar):
    sistema = autenticar("administrador_sistema")
    turno = preparar_temporada(sistema)
    administrativo = autenticar("administrativo")
    creada = crear_inscripcion(administrativo, turno["id"]).json()

    respuesta = administrativo.put(
        f"/api/v1/inscripciones/{creada['id']}",
        json=datos_para_editar(
            creada,
            apellido_chico="Gómez",
            email_tutor="corregido@example.com",
            telefono_tutor="1199998888",
        ),
    )

    assert respuesta.status_code == 200, respuesta.json()
    cuerpo = respuesta.json()
    assert cuerpo["apellido_chico"] == "Gómez"
    assert cuerpo["email_tutor"] == "corregido@example.com"
    assert cuerpo["telefono_tutor"] == "1199998888"

    # Corregir datos no cambia el estado ni la posición en la lista.
    assert cuerpo["estado"] == "CONFIRMADA"
    assert cuerpo["posicion_espera"] is None
    assert cuerpo["turno_id"] == turno["id"]

    detalle = administrativo.get(f"/api/v1/inscripciones/{creada['id']}")
    assert detalle.json()["telefono_tutor"] == "1199998888"


def test_edicion_rechaza_el_dni_de_otro_chico(autenticar):
    sistema = autenticar("administrador_sistema")
    turno = preparar_temporada(sistema)
    administrativo = autenticar("administrativo")

    primera = crear_inscripcion(administrativo, turno["id"], dni_chico="40111222")
    segunda = crear_inscripcion(administrativo, turno["id"], dni_chico="40222333")
    assert primera.status_code == 201
    assert segunda.status_code == 201

    respuesta = administrativo.put(
        f"/api/v1/inscripciones/{segunda.json()['id']}",
        json=datos_para_editar(segunda.json(), dni_chico="40111222"),
    )

    assert respuesta.status_code == 409
    assert respuesta.json()["type"] == "/problemas/inscripcion-duplicada"


def test_no_se_edita_una_inscripcion_cancelada(autenticar):
    sistema = autenticar("administrador_sistema")
    turno = preparar_temporada(sistema)
    administrativo = autenticar("administrativo")
    creada = crear_inscripcion(administrativo, turno["id"]).json()

    assert (
        administrativo.post(
            f"/api/v1/inscripciones/{creada['id']}/cancelar"
        ).status_code
        == 200
    )

    respuesta = administrativo.put(
        f"/api/v1/inscripciones/{creada['id']}",
        json=datos_para_editar(creada, nombre_chico="Corregido"),
    )

    assert respuesta.status_code == 409
    assert respuesta.json()["type"] == "/problemas/inscripcion-no-editable"


def test_edicion_valida_la_edad(autenticar):
    sistema = autenticar("administrador_sistema")
    turno = preparar_temporada(sistema)
    administrativo = autenticar("administrativo")
    creada = crear_inscripcion(administrativo, turno["id"]).json()

    respuesta = administrativo.put(
        f"/api/v1/inscripciones/{creada['id']}",
        json=datos_para_editar(creada, fecha_nacimiento="2024-06-01"),
    )

    assert respuesta.status_code == 422
    assert respuesta.json()["type"] == "/problemas/edad-fuera-de-rango"


def test_tutor_edita_solo_su_inscripcion(autenticar):
    sistema = autenticar("administrador_sistema")
    turno = preparar_temporada(sistema)

    tutor = autenticar("tutor", sub="tutor-uno", email="tutor1@example.com")
    creada = crear_inscripcion(tutor, turno["id"]).json()

    propia = tutor.put(
        f"/api/v1/inscripciones/{creada['id']}",
        json=datos_para_editar(creada, nombre_chico="Ana María"),
    )
    assert propia.status_code == 200
    assert propia.json()["nombre_chico"] == "Ana María"

    otro = autenticar("tutor", sub="otro-tutor", email="otro@example.com")
    ajena = otro.put(
        f"/api/v1/inscripciones/{creada['id']}",
        json=datos_para_editar(creada, nombre_chico="Intruso"),
    )
    assert ajena.status_code == 404

    # La oficina sí puede corregir las inscripciones de cualquier tutor.
    administrativo = autenticar("administrativo")
    corregida = administrativo.put(
        f"/api/v1/inscripciones/{creada['id']}",
        json=datos_para_editar(creada, apellido_tutor="Pérez"),
    )
    assert corregida.status_code == 200


def test_administrativo_exporta_el_listado_en_csv(autenticar):
    sistema = autenticar("administrador_sistema")
    turno = preparar_temporada(sistema)
    administrativo = autenticar("administrativo")
    assert crear_inscripcion(administrativo, turno["id"]).status_code == 201

    respuesta = administrativo.get("/api/v1/admin/inscripciones/export")

    assert respuesta.status_code == 200
    assert respuesta.headers["content-type"].startswith("text/csv")
    assert "attachment" in respuesta.headers["content-disposition"]
    assert "inscripciones-2027.csv" in respuesta.headers["content-disposition"]

    texto = respuesta.content.decode("utf-8-sig")
    lineas = texto.splitlines()

    assert lineas[0] == (
        "temporada;turno;sede;dni_chico;nombre_chico;apellido_chico;"
        "fecha_nacimiento;dni_tutor;nombre_tutor;apellido_tutor;email_tutor;"
        "telefono_tutor;estado;posicion_espera;creado_en;creado_por"
    )
    assert "40111222" in lineas[1]
    assert "CONFIRMADA" in lineas[1]

    assert (
        autenticar("tutor").get("/api/v1/admin/inscripciones/export").status_code
        == 403
    )


def datos_para_editar(inscripcion, **cambios):
    """Arma el cuerpo del PUT a partir de una inscripción existente."""
    datos = {
        "dni_chico": inscripcion["dni_chico"],
        "nombre_chico": inscripcion["nombre_chico"],
        "apellido_chico": inscripcion["apellido_chico"],
        "fecha_nacimiento": inscripcion["fecha_nacimiento"],
        "dni_tutor": inscripcion["dni_tutor"],
        "nombre_tutor": inscripcion["nombre_tutor"],
        "apellido_tutor": inscripcion["apellido_tutor"],
        "email_tutor": inscripcion["email_tutor"],
        "telefono_tutor": inscripcion["telefono_tutor"],
    }
    datos.update(cambios)
    return datos


def test_accesos_residuales_cerrados(autenticar):
    sistema = autenticar("administrador_sistema")
    turno = preparar_temporada(sistema)

    tutor = autenticar("tutor", sub="tutor-de-test", email="tutor1@example.com")
    creada = crear_inscripcion(tutor, turno["id"])
    assert creada.status_code == 201

    assert (
        autenticar("administrador_sistema")
        .get("/api/v1/mis-inscripciones")
        .status_code
        == 403
    )
    assert (
        autenticar("administrador_sistema")
        .get(f"/api/v1/inscripciones/{creada.json()['id']}")
        .status_code
        == 403
    )
