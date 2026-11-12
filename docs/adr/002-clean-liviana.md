# ADR-002: Clean Architecture liviana

**Estado:** Aceptada (15/10/2026)

## Contexto

Dentro del monolito modular (ADR-001) hay que decidir cómo se organiza el código de cada módulo. El
sistema lo mantiene una sola persona, se usa 3 semanas por año y al año siguiente alguien que no lo
escribió tiene que poder entenderlo y cambiar una regla sin romper el resto. Las reglas de negocio son
pocas pero críticas: edad de 6 a 12 años, solo residentes, un chico inscripto una sola vez por temporada
y cupo por orden de llegada.

## Decisión

Vamos a separar cada módulo en tres responsabilidades, con dependencias en un solo sentido:

    routes.py (HTTP)  →  service.py (casos de uso y reglas)  →  repository.py / integrations (datos y padrón)

Las reglas viven solo en `service.py`, que no conoce HTTP: informa los errores con excepciones del
dominio (`EdadFueraDeRango`, `NoResidente`, `InscripcionDuplicada`…, en `app/core/errors.py`) y un
manejador global las traduce a Problem Details (RFC 9457).

Es «liviana» porque dejamos afuera, a propósito:

- entidades de dominio separadas de las del ORM: el modelo de SQLAlchemy hace de entidad;
- interfaces abstractas (puertos) para cada repositorio: hay una sola implementación;
- un contenedor de inyección de dependencias.

## Alternativas

- **Clean Architecture completa** (entidades puras, puertos, adaptadores y mapeos entre capas): aísla
  todo, pero triplica archivos y mapeos para pocos casos de uso, y es más difícil de seguir para quien
  herede el sistema. Sería sobredimensionar.
- **Todo en los endpoints:** lo más rápido de escribir, pero las reglas quedan mezcladas con HTTP y SQL,
  y no se pueden probar ni cambiar sin tocar todo.
- **Capas clásicas sin regla de dependencia:** parecido en cantidad de archivos, pero nada impide que el
  negocio termine dependiendo del framework.

## Consecuencias

- Se gana: cada regla está en un solo lugar y se prueba sin levantar la API ni la base. Cambiar el
  padrón real por el mock, o FastAPI por otro framework, no toca las reglas.
- Se resigna: el dominio queda atado a SQLAlchemy (cambiar de ORM obligaría a tocar los modelos) y, sin
  interfaces, en los tests los repositorios se reemplazan por objetos falsos con los mismos métodos.

## NFRs

- Favorece: mantenibilidad (NFR estrella), testeabilidad y costo (menos código que una Clean completa).
- Perjudica levemente: la portabilidad del dominio respecto del ORM (riesgo aceptado).

## Confirmación

Fitness function en `verificacion/verificar.py`: analiza el código de cada `service.py` y
`repository.py` y falla si alguno importa `fastapi` o `starlette`. Resultado en `docs/VERIFICACION.md`
(NFR-01).
