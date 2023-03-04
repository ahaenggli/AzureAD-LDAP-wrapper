---
title: Run the LDAP-wrapper
---


The preferred way to use the LDAP wrapper is with Docker. Alternatively, the source can be downloaded and started manually with npm/node.
As domain and basedn it is recommended to use the same as used in AzureAD tenant (e.g. `@domain.tld`). This way, the spelling of the users (e.g. `username@domain.tld`) will match at the end. Otherwise, your users will have to use `username@example.com` instead of the estimated `username@domain.tld`, for example.

{{< hint type=note >}}
The API results and a local copy of the LDAP entries are stored as JSON files inside the container at this path: `/app/.cache`  
Map this folder to provide persistent storage for your users/groups (and their samba password hashes).

{{< hint type=important >}}
Be aware that other users in the file system may also be able to read the JSON files and thus get access to the cached sambaNTPassword attribute.
{{< /hint >}}

{{< /hint >}}


{{< tabs "run-ldap-wrapper" >}}

{{< tab "Docker" >}}

```bash
docker run -d `
-p 389:13389 `
--volume /volume1/docker/ldapwrapper:/app/.cache `
-e AZURE_TENANTID="0def2345-ff01-56789-1234-ab9d6dda1e1e" `
-e AZURE_APP_ID="abc12345-ab01-0000-1111-a1e1eab9d6dd" `
-e AZURE_APP_SECRET="iamasecret~yep-reallyreallysecret" `
-e GRAPH_IGNORE_MFA_ERRORS="false" `
-e LDAP_DOMAIN="example.com" `
-e LDAP_BASEDN="dc=example,dc=com" `
-e LDAP_BINDUSER="root|mystrongpw||ldapsearch|ldapsearchpw123" `
ahaen/azuread-ldap-wrapper:latest
```

{{< /tab >}}

{{< tab "Docker compose" >}}

```Docker
version: '3.2'
services:
  azuread-ldap-wrapper:
    image: ahaen/azuread-ldap-wrapper:latest
    container_name: azuread-ldap-wrapper
    environment:
      TZ: "Europe/Zurich"
      AZURE_TENANTID: "0def2345-ff01-56789-1234-ab9d6dda1e1e"
      AZURE_APP_ID: "abc12345-ab01-0000-1111-a1e1eab9d6dd"
      AZURE_APP_SECRET: "iamasecret~yep-reallyreallysecret"
      LDAP_DOMAIN: "example.com"
      LDAP_BASEDN: "dc=example,dc=com"
      LDAP_BINDUSER: "ldapsearch|ldapsearch123"
      # LDAP_DEBUG: "true"
      # GRAPH_IGNORE_MFA_ERRORS: "true"
      # DSM7: "true"  
    ports:
      - 389:13389
    volumes:
      - /data/azuread-ldap/app:/app/.cache
    restart: unless-stopped
```

{{< /tab >}}

{{< tab "Portainer" >}}

```Docker
version: '3.8'
services:
  azuread-ldap-wrapper:
    image: "ahaen/azuread-ldap-wrapper:latest"
    container_name: azuread-ldap-wrapper
    ports:
      - 389:13389
    network_mode: "bridge"
    volumes:
      - /volume1/docker/ldap:/app/.cache
    environment:
      TZ: "Europe/Zurich"
      AZURE_TENANTID: "0def2345-ff01-56789-1234-ab9d6dda1e1e"
      AZURE_APP_ID: "abc12345-ab01-0000-1111-a1e1eab9d6dd"
      AZURE_APP_SECRET: "iamasecret~yep-reallyreallysecret"
      LDAP_DOMAIN: "example.com"
      LDAP_BASEDN: "dc=example,dc=com"
      LDAP_BINDUSER: "root|root123||ldapsearch|ldapsearch123"
      # LDAP_DEBUG: "true"
      # GRAPH_IGNORE_MFA_ERRORS: "true"
      # DSM7: "true"
```

{{< /tab >}}

{{< tab "Synology DSM Docker" >}}

## Install container on a Synology NAS

1. Open Docker > Registry to download the Image  
2. Open Docker > Image to launch a new container  
3. Configure and start it
![grafik](../syno_docker_add.png)

   - Use "bridge" as your network
   - Give your Container a name and enable auto-restart
   - In DSM 7 the environment variables are found in "Advanced Settings":

      ```bash
      TZ: "Europe/Zurich" # optional
      AZURE_TENANTID: "0def2345-ff01-56789-1234-ab9d6dda1e1e"
      AZURE_APP_ID: "abc12345-ab01-0000-1111-a1e1eab9d6dd"
      AZURE_APP_SECRET: "iamasecret~yep-reallyreallysecret"
      LDAP_DOMAIN: "example.com"
      LDAP_BASEDN: "dc=example,dc=com"
      LDAP_BINDUSER: "ldapsearch|*secretldapsearch123*||root|*secretroot*"
      LDAP_DEBUG: "false" # set this to true for more logs
      GRAPH_IGNORE_MFA_ERRORS: "false" # set this to true to bypass MFA
      DSM7: "true" # set this to false if you are running DSM 6 or lower
      ```

     Make sure you double check your Azure values and define at least 1 binduser. The binduser does not need to exist in your AzureAD. 
     Don't forget to replace example.com with your domain. 

   - Set local Port 389 to the Container Port 13389.\
     If you receive the error `Local port 389 conflicts with other ports used by other services`: Please make sure that Synology Directory Service and Synology LDAP Server are not installed - they also use this port.
   - Add a local folder like `docker/ldap` to the mount path `/app/.cache` in volume settings.\
     If you skip this step, your data will not be stored permanently.

## Update existing Docker container on a Synology NAS

1. Redownload the latest version
![grafik](../syno_docker_download.png)

2. Stop your container

3. Clear your container
![grafik](../syno_docker_clear.png)

4. Check the [changelog](CHANGELOG.md) file (for breaking changes) and apply new settings

5. Start your container

6. Check the logs for (new) errors (right click on container and choose "Details")
![grafik](../syno_docker_log.png)

7. Before accessing files via network/samba, each user needs to login in the dsm-web-gui or any other tool directly connected to the ldap server. It's the same after a password change, because the password-hash for samba is only set after a successfull login.

{{< /tab >}}

{{< tab "npm/node" >}}

This is a minimal example for a running configuration.\
You can either set environment variables or create an .env file in the root directory.

```env
## .env file or environment variables ##
# Values of your AzureAD application
AZURE_APP_ID="abc12345-ab01-0000-1111-a1e1eab9d6dd"
AZURE_TENANTID="0def2345-ff01-56789-1234-ab9d6dda1e1e"
AZURE_APP_SECRET="iamasecret~yep-reallyreallysecret"
# Ignore MFA related errors, so user can login despite of activated MFA
# GRAPH_IGNORE_MFA_ERRORS="false"
# Settings for your LDAP server
LDAP_DOMAIN="example.com"
LDAP_BASEDN="dc=example,dc=com"
LDAP_BINDUSER="root|mystrongpw||ldapsearch|ldapsearchpw123"
```

```Shell
# run with npm
npm start
# run directly with node ("--openssl-legacy-provider" is needed)
node --openssl-legacy-provider server.js
```

{{< /tab >}}
{{< /tabs >}}

{{< hint type=caution icon=gdoc_error_outline title=Caution >}}
Check your Docker log for errors before attempting to use the ldap server.
{{< /hint >}}
