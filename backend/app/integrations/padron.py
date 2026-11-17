from concurrent.futures import ThreadPoolExecutor, TimeoutError as TiempoAgotado

import httpx
from app.core.config import get_settings
from app.core.errors import PadronNoDisponible

# El timeout de httpx no cubre la resolución DNS: con el padrón caído puede tardar varios segundos
# en fallar. La consulta corre en un hilo aparte para cortarla a los padron_timeout_seconds en total.
_consultas = ThreadPoolExecutor(max_workers=8, thread_name_prefix="padron")


class PadronClient:
    def __init__(self):
        self.settings = get_settings()

    def es_residente(self, dni: str) -> bool:
        url = f"{self.settings.padron_base_url}/residentes/{dni}"
        limite = self.settings.padron_timeout_seconds
        consulta = _consultas.submit(httpx.get, url, timeout=limite)
        try:
            response = consulta.result(timeout=limite)
        except (httpx.RequestError, TiempoAgotado) as exc:
            raise PadronNoDisponible("El padrón no está disponible. Reintente más tarde.") from exc

        if response.status_code >= 500:
            raise PadronNoDisponible("El padrón no está disponible. Reintente más tarde.")
        if response.status_code == 404:
            return False
        response.raise_for_status()
        data = response.json()
        return bool(data.get("residente"))
