# ADR-011: SPA servida por el backend, sin BFF ni API Gateway

**Estado:** Aceptada
**Fecha:** 29/10/2026 · **Decisores:** grupo Los Betos

## Contexto y problema

Las familias se inscriben desde el navegador y los administrativos, desde la oficina. No hay app mobile
ni otros clientes. En la Clase 10 se vieron los patrones BFF (un backend por tipo de cliente) y API Gateway
(una puerta de entrada a varios servicios). ¿Cómo llega la interfaz al usuario y cómo se conecta con la API?

## Drivers de la decisión

- NFR-02 Costo y NFR-03 Desplegabilidad: la menor cantidad de contenedores posible.
- NFR-01 Mantenibilidad: un solo origen y sin configuración de CORS para la SPA.
- Un solo tipo de cliente (navegador).

## Opciones consideradas

- SPA en React servida por el mismo backend, sin BFF ni gateway
- SPA con un BFF
- API Gateway delante de la aplicación
- Frontend en su propio contenedor (por ejemplo, Nginx)
- Páginas renderizadas en el servidor (plantillas)

## Resultado de la decisión

Opción elegida: «SPA servida por el backend», porque con un solo cliente y un monolito no hay nada que
adaptar ni que enrutar. La SPA en React se compila durante el build de la imagen de la app, se sirve desde
FastAPI en el puerto 8000 y llama a `/api/v1` en el mismo origen.

### Consecuencias

- Bueno, porque hay un contenedor menos, un solo puerto y no hace falta CORS para la SPA.
- Malo, porque el frontend no se puede desplegar sin el backend y la imagen de la app es más pesada.
- Malo, porque sin BFF el token vive en el navegador (en memoria de la SPA): es el riesgo que acepta un
  cliente público con PKCE (ADR-005).

### Confirmación

`http://localhost:8000` sirve la SPA y la API desde el mismo contenedor (`app`); el compose no tiene ningún
contenedor de frontend, BFF ni gateway.

## Pros y contras de las opciones

### SPA servida por el backend

- Bueno, porque es lo más simple de desplegar.
- Malo, porque acopla el despliegue del frontend al del backend.

### SPA con BFF

- Bueno, porque el token queda en el servidor y no en el navegador.
- Malo, porque con un solo cliente sería un servicio más que solo reenvía pedidos.

### API Gateway

- Bueno, porque centraliza enrutamiento, autenticación y límites de tráfico.
- Malo, porque con un monolito (ADR-001) no hay nada que enrutar.

### Frontend en su propio contenedor

- Bueno, porque separa los despliegues.
- Malo, porque suma un contenedor y la configuración de CORS.

### Páginas renderizadas en el servidor

- Bueno, porque usa menos JavaScript.
- Malo, porque el grupo eligió React y el login OIDC con PKCE se resuelve naturalmente en una SPA.

## Más información

Clase 10 (BFF y API Gateway). Revisar si apareciera una app mobile: se podría sumar un BFF sin tocar el
monolito.
