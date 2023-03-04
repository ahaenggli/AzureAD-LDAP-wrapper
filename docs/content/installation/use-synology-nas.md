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

If you connect your Synology NAS to the LDAP-wrapper, users can login with their azure credentials.

1. Enable ldap-client and connect it to your docker container
![grafik](../syno_ldap_enable.png)

2. Users that exist in the AAD cannot see or change other users password hashes. 
   So, if you'd like to use samba, please join/bind with a (not in AzureAD existing) superuser from the previously defined env var `LDAP_BINDUSER`: ![grafik](../syno_ldap_join.png)\
The warning "a local group has the same name as a synchronized group" can be skipped. Should your BINDUSER not be found, try writing "uid=ldapsearch" or the full name "uid=ldapsearch,cn=users,dc=domain,dc=tld" instead of just "ldapsearch".

3. Give your synchronized groups the desired permissions and log in with your synchronized users.

4. Before accessing shared folders/files via network/samba, each user must log in to dsm-web-gui or another tool directly connected to the ldap server. This also applies after a password change, since the password hash for samba is only set after a successful login.

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

