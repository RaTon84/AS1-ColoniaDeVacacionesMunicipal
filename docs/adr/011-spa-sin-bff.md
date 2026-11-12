# ADR-011: SPA servida por el backend, sin BFF ni API Gateway

**Estado:** Aceptada (29/10/2026)

## Contexto

Las familias se inscriben desde el navegador y los administrativos, desde la oficina. No hay app mobile
ni otros clientes. En la Clase 10 se vieron los patrones BFF (un backend por tipo de cliente) y API
Gateway (una puerta de entrada a varios servicios), y cuándo conviene cada uno.

## Decisión

Vamos a hacer una **SPA en React** que se compila durante el build de la imagen de la app y que **sirve
el mismo backend FastAPI** en el puerto 8000. La SPA llama directamente a la API `/api/v1`, en el mismo
origen. No usamos BFF ni API Gateway.

## Alternativas

- **BFF:** sirve cuando hay clientes distintos (web y mobile) que necesitan respuestas distintas. Con un
  solo cliente, sería un servicio más que solo reenvía pedidos.
- **API Gateway:** sirve para enrutar, autenticar y limitar el tráfico hacia varios servicios. Con un
  monolito (ADR-001) no hay nada que enrutar.
- **Frontend en su propio contenedor (por ejemplo, Nginx):** separa los despliegues, pero suma un
  contenedor y la configuración de CORS para la SPA.
- **Páginas renderizadas en el servidor (plantillas):** menos JavaScript, pero el grupo eligió React y
  el login OIDC con PKCE se resuelve naturalmente en una SPA.

## Consecuencias

- Se gana: un contenedor menos, mismo origen (sin CORS para la SPA) y un solo puerto que recordar.
- Se resigna: el frontend no se puede desplegar sin el backend, y la imagen de la app es un poco más
  pesada. Sin BFF, el token vive en el navegador (en memoria de la SPA): es el riesgo que acepta un
  cliente público con PKCE (ADR-005).
- Si apareciera una app mobile con necesidades distintas, se podría sumar un BFF sin tocar el monolito.

## NFRs

- Favorece: costo, simplicidad de operación y mantenibilidad.
- Perjudica: la independencia del despliegue del frontend (no necesaria en el escenario).

## Confirmación

`http://localhost:8000` sirve la SPA y la API desde el mismo contenedor (`app`); el compose no tiene
ningún contenedor de frontend, BFF ni gateway.
