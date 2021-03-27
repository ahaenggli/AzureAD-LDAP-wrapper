# LDAP-Wrapper for 'microsoft 365' users (former 'office 365' - via AzureAD without AADDS)
AzureAD-LDAP-wrapper is pseudo-ldap-server for authenticating against Microsoft 365 (AzureAD).
This is especially useful when you don't want to maintain an on-premise AD controller.

## How it works
1. AzureAD-LDAP-wrapper starts an LDAP server
2. On 'starting' all users and groups are fetched from Azure Active Directory
3. On 'bind' the user credentials are checked with the Microsoft Graph API
4. On successfull 'bind' the user password is saved as additional hash (sambaNTPassword) and sambaPwdLastSet ist set to "now" to allow use/access to samba shares
5. Every 30 minutes users and groups are refetched
(while keeping uid, gid, sambaNTPassword and sambaPwdLastSet)

## Use on a Synology-NAS (with Docker)
1. add the ldap-wrapper as a container, configure it and start it
![grafik](https://user-images.githubusercontent.com/23347180/112722715-67928580-8f0b-11eb-9725-83f68fd2bb9c.png)
2. enable ldap-client and connect it to your docker container
![grafik](https://user-images.githubusercontent.com/23347180/112722734-79742880-8f0b-11eb-87f4-804c1363b296.png)
3. give your synced groups the permissions you want and login with your azuread-users :)

## General Installation
Use a [docker container](https://hub.docker.com/r/ahaen/azuread-ldap-wrapper) and start it with the right environment variables.

## environment variables
### example
This is a minimal example for the a running configuration.
```bash
AZURE_APP_ID="abc12345-ab01-0000-1111-a1e1eab9d6dd"
AZURE_TENANTID="0def2345-ff01-56789-1234-ab9d6dda1e1e"
AZURE_APP_SECRET="iamasecret~yep-reallyreallysecret"
LDAP_DOMAIN="example.com"
LDAP_BASEDN="dc=example,dc=com"
# LDAP_BINDUSER="ldapsearch|ldapsearch123"
```
### AZURE_APP_ID
Your `Application ID` from [azure](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal#get-tenant-and-app-id-values-for-signing-in) (see #4)

### AZURE_TENANTID
Your `Tenant ID` from [azure](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal#get-tenant-and-app-id-values-for-signing-in) (see #3)

### AZURE_APP_SECRET
A `Client secret`-value from [azure](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal#option-2-create-a-new-application-secret)

### LDAP_DOMAIN
main domain

### LDAP_BASEDN
basedn

### LDAP_BINDUSER (optional)
"username|password" for a read-only bind, useful to "join" a device (e.g. NAS).


# Docker
## run image
1. touch .env
2. set your environment variables
3. run
```bash
docker run -d -p 389:13389 --env-file .env ahaen/azuread-ldap-wrapper
```

## build image
run
```bash
docker build -t ahaen/azuread-ldap-wrapper .
```
