# LDAP-Wrapper for office365 users (via azure without AADDS)
## environment variables

### LDAP_DOMAIN
main domain

### LDAP_BASEDN
basedn

### LDAP_BINDUSER (optional)
"username|password" for a read-only bind

### AZURE_APP_ID
Your `Application ID` from [azure](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal#get-tenant-and-app-id-values-for-signing-in) (see #4)

### AZURE_TENANTID
Your `Tenant ID` from [azure](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal#get-tenant-and-app-id-values-for-signing-in) (see #3)

### AZURE_APP_SECRET
A `Client secret`-value from [azure](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal#option-2-create-a-new-application-secret)

### example
```
LDAP_DOMAIN=example.com
LDAP_BASEDN=dc=example,dc=com
LDAP_BINDUSER=ldapsearch|ldapsearch123
AZURE_APP_ID=abc12345-ab01-0000-1111-a1e1eab9d6dd
AZURE_TENANTID=0def2345-ff01-56789-1234-ab9d6dda1e1e
AZURE_APP_SECRET=iamasecret~yep-reallyreallysecret
```

# Docker
## build image
run
```bash
docker build --tag "ldap-wrapper-o365-azure" .
```

## run image
1. touch .env
2. set your environment variables
3. run
```bash
docker run -d -p 389:389 --env-file .env ldap-wrapper-o365-azure
```