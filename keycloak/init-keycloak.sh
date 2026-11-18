
#!/bin/sh
set -eu

KCADM=/opt/keycloak/bin/kcadm.sh
SERVER=http://keycloak:8080
REALM=colonia
CLIENT_ID=colonia-admin-api

echo "Esperando a Keycloak..."

# Keycloak ya está sano (healthcheck), así que en general entra al primer intento.
# Si a los 20 intentos (~1 min) no puede iniciar sesión, corta y muestra el error.
intentos=0
until "$KCADM" config credentials \
  --server "$SERVER" \
  --realm master \
  --user "$KEYCLOAK_ADMIN_USERNAME" \
  --password "$KEYCLOAK_ADMIN_PASSWORD" >/tmp/login.log 2>&1
do
  intentos=$((intentos + 1))
  if [ "$intentos" -ge 20 ]; then
    echo "ERROR: no se pudo iniciar sesión en Keycloak. Revisar KEYCLOAK_ADMIN_USERNAME y KEYCLOAK_ADMIN_PASSWORD."
    cat /tmp/login.log
    exit 1
  fi
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

# Detecta posibles duplicados de los tres mappers estándar.
# No elimina configuraciones automáticamente.
# Registra los UUID para facilitar el diagnóstico.
detectar_mappers_duplicados() {
  echo "Comprobando mappers duplicados..."

  archivo_mappers=$(mktemp)

  "$KCADM" get \
    "clients/$CLIENT_UUID/protocol-mappers/models" \
    -r "$REALM" \
    --fields id,name,protocol,protocolMapper \
    --format csv --noquotes |
    tr -d '\r' > "$archivo_mappers"

  for nombre in "Client Host" "Client ID" "Client IP Address"; do
    encontrados=0

    while IFS=',' read -r uuid mapper_name protocolo tipo; do
      [ "$mapper_name" = "$nombre" ] || continue
      [ "$protocolo" = "openid-connect" ] || continue
      [ "$tipo" = "oidc-usersessionmodel-note-mapper" ] || continue

      encontrados=$((encontrados + 1))

      if [ "$encontrados" -gt 1 ]; then
        echo "ADVERTENCIA: mapper duplicado detectado: $nombre ($uuid)"
        echo "No se elimina automáticamente para evitar perder configuraciones."
      fi
    done < "$archivo_mappers"
  done

  rm -f "$archivo_mappers"

  echo "Comprobación de mappers finalizada."
}

detectar_mappers_duplicados

echo "Verificando configuración del cliente..."

CONFIG_ACTUAL=$(
  "$KCADM" get "clients/$CLIENT_UUID" \
    -r "$REALM" \
    --fields enabled,publicClient,serviceAccountsEnabled,standardFlowEnabled,implicitFlowEnabled,directAccessGrantsEnabled \
    --format csv --noquotes |
  tr -d '\r'
)

CONFIG_ESPERADA="true,false,true,false,false,false"

if [ "$CONFIG_ACTUAL" = "$CONFIG_ESPERADA" ]; then
  echo "El cliente ya tiene la configuración esperada."
else
  echo "Actualizando configuración del cliente..."

  "$KCADM" update "clients/$CLIENT_UUID" -r "$REALM" \
    -s "enabled=true" \
    -s "publicClient=false" \
    -s "clientAuthenticatorType=client-secret" \
    -s "serviceAccountsEnabled=true" \
    -s "standardFlowEnabled=false" \
    -s "implicitFlowEnabled=false" \
    -s "directAccessGrantsEnabled=false"
fi

echo "Verificando secreto del cliente..."

SECRETO_ACTUAL=$(
  "$KCADM" get "clients/$CLIENT_UUID/client-secret" \
    -r "$REALM" \
    --fields value \
    --format csv --noquotes |
  tr -d '\r'
)

if [ "$SECRETO_ACTUAL" = "$KEYCLOAK_ADMIN_CLIENT_SECRET" ]; then
  echo "El secreto ya está configurado correctamente."
else
  echo "Sincronizando secreto del cliente..."

  "$KCADM" update "clients/$CLIENT_UUID" -r "$REALM" \
    -s "secret=$KEYCLOAK_ADMIN_CLIENT_SECRET"
fi

echo "Asignando permisos a la cuenta de servicio..."

"$KCADM" add-roles -r "$REALM" \
  --uusername "service-account-$CLIENT_ID" \
  --cclientid realm-management \
  --rolename view-users \
  --rolename query-users \
  --rolename manage-users \
  --rolename view-realm

echo "Inicialización de Keycloak completada correctamente."
