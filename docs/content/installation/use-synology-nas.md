---
title: Use on a Synology NAS
---

{{< hint type=important title="Important information about samba shares" >}}
To access a share on the NAS, for example, from a Windows PC, the credentials must be entered. These credentials are NOT sent to the LDAP-wrapper (or any other LDAP server). They are sent to samba so that it can generate a hash from the password. Afterwards samba fetches the password hash from the LDAP-wrapper and compares the two hashes.
Perhaps you are now wondering why this is important to know? Well, the AzureAD-LDAP-wrapper must have this hash before you access a shared folder. Otherwise, you will get an error due to invalid credentials. Maybe you are now wondering how the LDAP-wrapper can obtain the necessary hash? The answer is simple:

- Credential hashes must be cached. Therefore `LDAP_SAMBANTPWD_MAXCACHETIME` must ***NOT*** be set to 0.
- The user ***MUST*** first log in to a service that is *directly* connected to the LDAP-wrapper (DSM, web application, etc.).

Only after that the login in samba can work. The same applies after a password change. The new password has a new hash, so the user must first log in again via another service. This restriction cannot be circumvented.
{{< /hint >}}

{{< toc format=html >}}

## Connect Synology NAS to LDAP-wrapper

To enable users to log in to Synology NAS with their Azure credentials, you need to connect the NAS to the AzureAD-LDAP-wrapper. Here are the steps:

1. Go to Control Panel > Domain/LDAP and click "Join".
![ldap join](../use/syno_ldap_join.png)

2. Enter the IP address (e.g., 127.0.0.1) of your NAS as the server address.
![server address](../use/syno_ldap_serveraddress.png)

3. Enter the credentials of your previously defined superuser (environment variable `LDAP_BINDUSER`) as Bind DN. Should your user not be found, try writing "uid=root" or the full name "uid=root,cn=users,dc=domain,dc=tld" instead of just "root". Select your domain in Base DN.
![enter ldap infos](../use/syno_ldap_infos.png)

4. If you see a warning about a local group having the same name as a synchronized group, you can ignore it and skip the warning in "Details".
![skip warning](../use/syno_ldap_skipwarning.png)

5. Your NAS should now be connected successfully to the Azure AD LDAP-wrapper.
![nas connected](../use/syno_ldap_connected.png)

6. Check the "LDAP User" and "LDAP Group" tabs to ensure that all entries are fully synced. Assign the desired permissions to your synchronized users and groups. You can now log in with your Azure AD credentials.
![check users](../use/syno_ldap_check.png)

7. Note that before accessing shared folders or files via network or Samba, each user must log in to DSM web GUI or another tool directly connected to the LDAP server. This step is also required after a password change, as the password hash for Samba is only set after a successful login.

## Synology SSO

If you don't need samba (network access for shared folders) you can try enabling the Synology OpenID Connect SSO service.
Please be aware, it's not working on every DSM version. First tests on a Synology Live Demo with DSM 7.1-42661 were successfull. Unfortunately it didn't work locally on my personal NAS, probably because it'ss behind a Firewall/Proxy.

1. Add your URL to access the NAS in Azure
![grafik](../sso_azure.png)
2. Go to Domain/LDAP > SSO Client and  Tick Enable OpenID Connect SSO service
3. Select azure as the profile and set the same appid, tenant and secret you used for the docker container. The redirect URI is again your URL to access the NAS.
![grafik](../sso_syno.png)
4. Save everything
5. You should now see 'Azure SSO Authentication' on your DSM login screen
![grafik](../sso_dsm.png)

## Update existing Docker container on a Synology NAS

1. Redownload the latest version
![grafik](../syno_docker_download.png)

2. Stop your container

3. Clear your container
![grafik](../syno_docker_clear.png)

4. Check the [changelog](CHANGELOG.md) file (for breaking changes) and apply new settings

5. Start your container

6. Check the logs for (new) errors (right click on container and choose "Details")
![grafik](../syno_docker_logs.png)

7. Before accessing files via network/samba, each user needs to login in the dsm-web-gui or any other tool directly connected to the ldap server. It's the same after a password change, because the password-hash for samba is only set after a successfull login.
