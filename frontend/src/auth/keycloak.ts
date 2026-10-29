import Keycloak from 'keycloak-js'

const keycloak = new Keycloak({
  url: 'http://localhost:8080',
  realm: 'colonia',
  clientId: 'colonia-spa',
})

export default keycloak
