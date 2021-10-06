# LDAP-Wrapper for 'microsoft 365' users (former 'office 365' - via AzureAD without AADDS) [![GitHub release (latest by date)](https://img.shields.io/github/v/release/ahaenggli/AzureAD-LDAP-wrapper?style=social)](https://github.com/ahaenggli/AzureAD-LDAP-wrapper) <a href="https://www.buymeacoffee.com/ahaenggli" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" width="90px" ></a>

AzureAD-LDAP-wrapper is pseudo-ldap-server for authenticating against Microsoft 365 (AzureAD).
This is especially useful when you don't want to maintain an on-premise AD controller.

## How it works
1. AzureAD-LDAP-wrapper starts an LDAP server
2. On 'starting' all users and groups are fetched from Azure Active Directory
3. On 'bind' the user credentials are checked with the Microsoft Graph API
4. On successfull 'bind' the user password is saved as additional hash (sambaNTPassword) and sambaPwdLastSet ist set to "now" to allow use/access to samba shares
5. Every 30 minutes users and groups are refetched
(while keeping uid, gid, sambaNTPassword and sambaPwdLastSet)

## How to use it
1. Register a new App in your [aad-portal](https://aad.portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps) as described [here](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal)
2. Set the following Graph-API Application permissions: `User.Read.All` and `Group.Read.All`
![grafik](https://user-images.githubusercontent.com/23347180/112734966-52d4e280-8f49-11eb-942f-b105ea8e4577.png)
3. Use a [docker container](https://hub.docker.com/r/ahaen/azuread-ldap-wrapper) and start it with the right environment variables.

### Using with Docker on Synology-NAS
1. add the ldap-wrapper as a container, configure it and start it
![grafik](https://user-images.githubusercontent.com/23347180/113062408-f9bcb700-91b3-11eb-95a7-54694a4e3a86.png)

2. enable ldap-client and connect it to your docker container
![grafik](https://user-images.githubusercontent.com/23347180/112722734-79742880-8f0b-11eb-87f4-804c1363b296.png)
3. give your synced groups the permissions you want and login with your azuread-users :)

### Update a container on Synology-NAS
1. Redownload the latest version
![grafik](https://user-images.githubusercontent.com/23347180/113425401-15050d80-93d2-11eb-9e6a-61416497aa5e.png)
2. Stop your container
3. Clear your container
![grafik](https://user-images.githubusercontent.com/23347180/113425576-6a411f00-93d2-11eb-8c45-31550b64d8bc.png)

4. Start your container
5. Check the logs for (new) errors (right click on container and choose "Details")
![grafik](https://user-images.githubusercontent.com/23347180/113425753-b7bd8c00-93d2-11eb-8bd4-1c032096c7cf.png)
6. Keep in mind you need to login in your dsm-web-gui before accessing files via network/samba

## General Installation
The API-Results and a local copy of the LDAP-Entries are saved in here: /app/.cache

Attention: If you map this folder, the files will be persistent, but other users could maybe see the cached sambaNTPassword-value in there.

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
Every AzureAD-user can bind (and auth) in this LDAP-Server.
This parameter allows you to add additional - NOT in AzureAD existing - users.
Format: "username|password". This can be useful to "join" a device (e.g. NAS).
Multiple users can be split by "||". (ex. `ldapsearch1|mysecret||searchy2|othersecret`).
Those users have full read permissions and can also see the sambaNTPassword-hash.

### LDAP_DEBUG (default: false)
If set to true there are more detailed logs in the console output.

### LDAP_ALLOWCACHEDLOGINONFAILURE (default: true)
allows login from cached sambaNTPassword.
If set to true, the login has failed and the error does NOT say "wrong credentials", the password is checked against the cached sambaNTPassword. If it matches, the authentification is successfull.

### LDAP_SAMBANTPWD_MAXCACHETIME (optional, default: infinity)
Maximum time in minutes that defines how long a cached sambaNTPassword hash can be used (for login and samba access).
After that time, a user has to login 'normal' via the bind method (ex. dsm-web-gui) to reset the cached value.
As default there is no time limit (-1=infinity).

### LDAPS_CERTIFICATE
Path to your certificate.pem file.
You also have to set `LDAPS_KEY` to run LDAP over SSL.
You may also need to set `LDAP_PORT` to 636.

### LDAPS_KEY
Path to private key file.
You also have to set `LDAPS_CERTIFICATE` to run LDAP over SSL.
You may also need to set `LDAP_PORT` to 636.

### LDAP_SYNC_TIME
The interval in minutes for fetching users/groups from azure. The default is 30 minutes.

### DSM7
If set to `true` the ldap attributes uidNumber and gidNumber are converted from strings to numbers.
Somehow this seems to be necessary to work with DSM 7.0. The default value is `false`.

# Frequently Asked Questions (FAQ)
- [Does it support MFA (multi-factor authentication)?
](#does-it-support-mfa-multi-factor-authentication)
- [How do I give some synced users the DSM-Administrator permission on a Synology-NAS?](#how-do-i-give-some-synced-users-the-dsm-administrator-permission-on-a-synology-nas)
- [Can I use LDAPS (LDAP over SSL) instead of LDAP (with no encryption)?](#can-i-use-ldaps-ldap-over-ssl-instead-of-ldap-with-no-encryption)
- [Can I use LDAP over TLS (STARTTLS) instead of LDAP (with no encryption)?](#can-i-use-ldap-over-tls-starttls-instead-of-ldap-with-no-encryption)
- [Is it possible to add or edit the ldap attributes?](#is-it-possible-to-add-or-edit-the-ldap-attributes)

## Does it support MFA (multi-factor authentication)?

Nope, see [here](https://github.com/Azure/ms-rest-nodeauth/issues/93). The login will just fail as mentioned [here](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth-ropc).

## How do I give some synced users the DSM-Administrator permission on a Synology-NAS?

Before DSM 7.0: Just create a group called "Administrators" and put the users in it.
With DSM 7.0: You can delegate specific persmisisons to each synced groupd.

## Can I use LDAPS (LDAP over SSL) instead of LDAP (with no encryption)?

Sure. Mount your certificate file and private key file to the docker container and then set the environment variables LDAPS_CERTIFICATE and LDAPS_KEY. You may also set LDAP_PORT to 636.

## Can I use LDAP over TLS (STARTTLS) instead of LDAP (with no encryption)?

Nope, that's not (yet) possible.

## Is it possible to add or edit the ldap attributes?
Sure! That's what I do in the DSM 7 workaround.
Look at [this](./customizer/customizer_DSM7_IDs_string2int.js) file for an example. Customize it as you need and map the file in your docker setup as `/app/customizer/ldap_customizer.js`. This file is priorized over the DSM 7.0 workaround.

# Docker
## run image
1. touch .env
2. set your environment variables
3. run
```bash
docker run -d -p 389:13389 --volume /home/mydata:/app/.cache --env-file .env ahaen/azuread-ldap-wrapper
```

## build image
run
```bash
docker build -t ahaen/azuread-ldap-wrapper .
```