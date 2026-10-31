import httpx
from app.core.config import get_settings
from app.core.errors import PadronNoDisponible


class PadronClient:
    def __init__(self):
        self.settings = get_settings()

    def es_residente(self, dni: str) -> bool:
        url = f"{self.settings.padron_base_url}/residentes/{dni}"
        try:
            response = httpx.get(url, timeout=self.settings.padron_timeout_seconds)
        except httpx.RequestError as exc:
            raise PadronNoDisponible("El padrón no está disponible. Reintente más tarde.") from exc

        if response.status_code >= 500:
            raise PadronNoDisponible("El padrón no está disponible. Reintente más tarde.")
        if response.status_code == 404:
            return False
        response.raise_for_status()
        data = response.json()
        return bool(data.get("residente"))
