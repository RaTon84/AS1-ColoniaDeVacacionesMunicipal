# ADR-002: Clean Architecture liviana dentro de cada módulo

**Estado:** Aceptada
**Fecha:** 15/10/2026 · **Decisores:** grupo Los Betos

## Contexto y problema

Dentro del monolito modular (ADR-001) hay que decidir cómo se organiza el código de cada módulo. El
sistema se usa 3 semanas por año y al año siguiente alguien que no lo escribió tiene que poder entender
una regla y cambiarla sin romper el resto. Las reglas son pocas pero críticas: edad, residencia,
inscripción única y cupo por orden de llegada. ¿Cómo separamos las reglas del framework y de la base?

## Drivers de la decisión

- NFR-01 Mantenibilidad (estrella): cada regla en un solo lugar, fácil de encontrar.
- NFR-02 Costo: poco código para pocos casos de uso.
- Testeabilidad: probar las reglas sin levantar la API ni la base.

## Opciones consideradas

- Clean Architecture liviana
- Clean Architecture completa (entidades puras, puertos y adaptadores)
- Todo en los endpoints
- Capas clásicas sin regla de dependencia

## Resultado de la decisión

Opción elegida: «Clean Architecture liviana», porque separa las reglas del framework con el mínimo de
archivos. Cada módulo tiene tres responsabilidades, con dependencias en un solo sentido:

    routes.py (HTTP)  →  service.py (casos de uso y reglas)  →  repository.py / integrations (datos y padrón)

Las reglas viven solo en `service.py`, que no conoce HTTP: informa los errores con excepciones del dominio
(`EdadFueraDeRango`, `NoResidente`, `InscripcionDuplicada`…) y un manejador global las traduce a Problem
Details (ADR-010). Es «liviana» porque deja afuera, a propósito, las entidades separadas del ORM, las
interfaces abstractas de cada repositorio y el contenedor de inyección de dependencias.

### Consecuencias

- Bueno, porque cada regla está en un solo lugar y se prueba sin levantar la API ni la base.
- Bueno, porque cambiar el padrón real por el mock, o FastAPI por otro framework, no toca las reglas.
- Malo, porque el dominio queda atado a SQLAlchemy: cambiar de ORM obliga a tocar los modelos.
- Malo, porque sin interfaces, en las pruebas los repositorios se reemplazan por objetos falsos con los
  mismos métodos.

### Confirmación

Fitness function en `verificacion/verificar.py`: analiza el código de cada `service.py` y
`repository.py` y falla si alguno importa `fastapi` o `starlette`. Resultado en `docs/VERIFICACION.md`
(NFR-01).

## Pros y contras de las opciones

### Clean Architecture liviana

- Bueno, porque aísla las reglas con tres archivos por módulo.
- Neutral, porque depende de una regla que hay que verificar (la fitness function).
- Malo, porque las entidades son las del ORM.

### Clean Architecture completa

- Bueno, porque aísla todo, incluso del ORM.
- Malo, porque triplica archivos y mapeos para pocos casos de uso, y es más difícil de seguir para quien
  herede el sistema. Sería sobredimensionar.

### Todo en los endpoints

- Bueno, porque es lo más rápido de escribir.
- Malo, porque las reglas quedan mezcladas con HTTP y SQL, y no se pueden probar ni cambiar sin tocar todo.

### Capas clásicas sin regla de dependencia

- Bueno, porque tiene una cantidad de archivos parecida.
- Malo, porque nada impide que el negocio termine dependiendo del framework.

## Más información

Clase 3 (Clean Architecture). Relacionado con ADR-001 y ADR-010.
