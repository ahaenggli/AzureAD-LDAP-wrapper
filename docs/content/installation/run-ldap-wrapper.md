---
title: Run the LDAP-wrapper
---


The preferred way to use the LDAP wrapper is with Docker. Alternatively, the source can be downloaded and started manually with npm/node.
As domain (and basedn, if manually specified) it is recommended to use the same as used in your Microsoft Entra tenant (e.g. `@domain.tld`). This way, the spelling of the users (e.g. `username@domain.tld`) will match at the end. Otherwise, your users will have to use `username@example.com` instead of the estimated `username@domain.tld`, for example.

{{< hint type=note >}}
The API results and a local copy of the LDAP entries are stored as JSON files inside the container at this path: `/app/.cache`  
Map this folder to provide persistent storage for your users/groups (and their samba password hashes).

{{< hint type=important >}}
Be aware that other users in the file system may also be able to read the JSON files and thus get access to the cached sambaNTPassword attribute.
{{< /hint >}}

{{< /hint >}}

{{< tabs "run-ldap-wrapper" >}}

{{< tab "Synology DSM Docker" >}}

## Install container on a Synology NAS

1. Install Docker from the Synology Package Center.
![package center](../syno/syno_install_docker.png)

2. In Docker, go to "Registry" to download the latest container image.
![download latest image](../syno/syno_docker_download.png)

3. In Docker, go to "Image" to launch a new container. Use "bridge" as your network.
![launch image](../syno/syno_docker_launch.png)
Use "bridge" as your network.

4. Give your container a name and enable auto-restart.
![grafik](../syno/syno_docker_name.png)

5. Configure the environment variables in "Advanced Settings". Be sure to double check your AZURE_* values and define at least one binduser. The binduser (superuser like root) does not need to exist in your Microsoft Entra tenant. Replace example.com with your domain. Here is an example of a minimum required configuration:

    ```bash
    TZ: "Europe/Zurich" # optional
    AZURE_TENANTID: "0def2345-ff01-56789-1234-ab9d6dda1e1e"
    AZURE_APP_ID: "abc12345-ab01-0000-1111-a1e1eab9d6dd"
    AZURE_APP_SECRET: "iamasecret~yep-reallyreallysecret"
    LDAP_DOMAIN: "example.com"
    LDAP_BINDUSER: "ldapsearch|*secretldapsearch123*||root|*secretroot*"
    LDAP_DEBUG: "false" # set this to true for more logs
    GRAPH_IGNORE_MFA_ERRORS: "false" # set this to true to bypass MFA
    DSM7: "true" # set this to false if you are running DSM 6 or lower
    PUID: "1000" # optional, uid used for file access/permissions 
    PGID: "1000" # optional, gid used for file access/permissions
    ```

    ![env vars](../syno/syno_docker_env.png)
    A full list of all environment variables can be found [here](../../configuration/settings/).

6. Set local Port 389 to the Container Port 13389. If you receive the error Local port 389 conflicts with other ports used by other services, make sure that Synology Directory Service and Synology LDAP Server are not installed - they also use this port.
![syno port](../syno/syno_docker_port.png)

7. Add a local folder, such as docker/ldap, to the mount path /app/.cache in the volume settings. If you skip this step, your data will not be stored permanently.
![syno folder](../syno/syno_docker_folder.png)

8. Click "Done" to start the container.
![done](../syno/syno_docker_done.png)

{{< /tab >}}

{{< tab "Docker" >}}

```bash
docker run -d `
-p 389:13389 `
--volume /volume1/docker/ldapwrapper:/app/.cache `
-e TZ="Europe/Zurich" `
-e AZURE_TENANTID="0def2345-ff01-56789-1234-ab9d6dda1e1e" `
-e AZURE_APP_ID="abc12345-ab01-0000-1111-a1e1eab9d6dd" `
-e AZURE_APP_SECRET="iamasecret~yep-reallyreallysecret" `
-e GRAPH_IGNORE_MFA_ERRORS="false" `
-e LDAP_DOMAIN="example.com" `
-e LDAP_BINDUSER="root|mystrongpw||ldapsearch|ldapsearchpw123" `
ahaen/azuread-ldap-wrapper:latest
```

{{< /tab >}}

{{< tab "Docker compose" >}}

{{< hint type=important >}}
Attention if you use a volume instead of a host directory to map '/app/.cache'. The file 'IshouldNotExist.txt' may have to be deleted manually after the first start attempt.
{{< /hint >}}

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
      LDAP_BINDUSER: "ldapsearch|ldapsearch123"
      # LDAP_DEBUG: "true"
      # GRAPH_IGNORE_MFA_ERRORS: "true"
      # DSM7: "true"
      # PUID: 1000
      # PGID: 1000
    ports:
      - 389:13389
    volumes:
      - /data/azuread-ldap/app:/app/.cache
    restart: unless-stopped
```

{{< /tab >}}

{{< tab "Portainer" >}}

{{< hint type=important >}}
Attention if you use a volume instead of a host directory to map '/app/.cache'. The file 'IshouldNotExist.txt' may have to be deleted manually after the first start attempt.
{{< /hint >}}

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
      LDAP_BINDUSER: "root|root123||ldapsearch|ldapsearch123"
      # LDAP_DEBUG: "true"
      # GRAPH_IGNORE_MFA_ERRORS: "true"
      # DSM7: "true"
      # PUID: 1000
      # PGID: 1000      
```

{{< /tab >}}

{{< tab "npm/node" >}}

This is a minimal example for a running configuration.\
You can either set environment variables or create an .env file in the root directory.

```env
## .env file or environment variables ##
# Values of your Microsoft Entra application
AZURE_APP_ID="abc12345-ab01-0000-1111-a1e1eab9d6dd"
AZURE_TENANTID="0def2345-ff01-56789-1234-ab9d6dda1e1e"
AZURE_APP_SECRET="iamasecret~yep-reallyreallysecret"
# Ignore MFA related errors, so user can login despite of activated MFA
# GRAPH_IGNORE_MFA_ERRORS="false"
# Settings for your LDAP server
LDAP_DOMAIN="example.com"
LDAP_BINDUSER="root|mystrongpw||ldapsearch|ldapsearchpw123"
```

```Shell
# clone repo and open folder
git clone https://github.com/ahaenggli/AzureAD-LDAP-wrapper.git
cd AzureAD-LDAP-wrapper
# install 3rd party libraries
npm install
# use a .env file or set your env vars
# run with npm
npm start
# or start it with node ("--openssl-legacy-provider" is needed)
# node --openssl-legacy-provider index.js
```

{{< /tab >}}
{{< /tabs >}}

{{< hint type=caution icon=gdoc_error_outline title=Caution >}}
Check your Docker log for errors before attempting to use the ldap server.
{{< /hint >}}
