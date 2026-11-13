
#!/bin/sh
set -eu

KCADM=/opt/keycloak/bin/kcadm.sh
SERVER=http://keycloak:8080
REALM=colonia
CLIENT_ID=colonia-admin-api

echo "Esperando a Keycloak..."

until "$KCADM" config credentials \
  --server "$SERVER" \
  --realm master \
  --user "$KEYCLOAK_ADMIN_USERNAME" \
  --password "$KEYCLOAK_ADMIN_PASSWORD" >/dev/null 2>&1
do
  sleep 3
done

echo "Keycloak disponible."
echo "Buscando cliente $CLIENT_ID..."

# Obtener únicamente el UUID del cliente.
# Keycloak devuelve CSV sin cabecera.
obtener_client_uuid() {
  "$KCADM" get clients \
    -r "$REALM" \
    -q "clientId=$CLIENT_ID" \
    --fields id,clientId \
    --format csv --noquotes |
    tr -d '\r' |
    cut -d ',' -f 1
}

CLIENT_UUID=$(obtener_client_uuid)

if [ -z "$CLIENT_UUID" ]; then
  echo "El cliente no existe. Creándolo..."

  "$KCADM" create clients -r "$REALM" \
    -s "clientId=$CLIENT_ID" \
    -s "enabled=true" \
    -s "publicClient=false" \
    -s "clientAuthenticatorType=client-secret" \
    -s "serviceAccountsEnabled=true" \
    -s "standardFlowEnabled=false" \
    -s "implicitFlowEnabled=false" \
    -s "directAccessGrantsEnabled=false"

  CLIENT_UUID=$(obtener_client_uuid)
else
  echo "Cliente existente detectado."
fi

if [ -z "$CLIENT_UUID" ]; then
  echo "ERROR: No se pudo obtener el UUID del cliente."
  exit 1
fi

echo "Configurando cliente..."

"$KCADM" update "clients/$CLIENT_UUID" -r "$REALM" \
  -s "enabled=true" \
  -s "publicClient=false" \
  -s "clientAuthenticatorType=client-secret" \
  -s "serviceAccountsEnabled=true" \
  -s "standardFlowEnabled=false" \
  -s "implicitFlowEnabled=false" \
  -s "directAccessGrantsEnabled=false" \
  -s "secret=$KEYCLOAK_ADMIN_CLIENT_SECRET"

echo "Asignando permisos a la cuenta de servicio..."

"$KCADM" add-roles -r "$REALM" \
  --uusername "service-account-$CLIENT_ID" \
  --cclientid realm-management \
  --rolename view-users \
  --rolename query-users \
  --rolename manage-users \
  --rolename view-realm

echo "Inicialización de Keycloak completada correctamente."
