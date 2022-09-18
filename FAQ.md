# Frequently Asked Questions (FAQ)

- [Does it support MFA (multi-factor authentication)?
](#does-it-support-mfa-multi-factor-authentication)
- [How do I give some synced users the DSM-Administrator permission on a Synology-NAS?](#how-do-i-give-some-synced-users-the-dsm-administrator-permission-on-a-synology-nas)
- [Can I use LDAPS (LDAP over SSL) instead of LDAP (with no encryption)?](#can-i-use-ldaps-ldap-over-ssl-instead-of-ldap-with-no-encryption)
- [Can I use LDAP over TLS (STARTTLS) instead of LDAP (with no encryption)?](#can-i-use-ldap-over-tls-starttls-instead-of-ldap-with-no-encryption)
- [Is it possible to customize the ldap attributes?](#is-it-possible-to-customize-the-ldap-attributes)
- [Join NAS to Azure AD Domain](#join-nas-to-azure-ad-domain)
- [Why are personal microsoft accounts not supported?](#why-are-personal-microsoft-accounts-not-supported)
- [Samba is not working, what can I do?](#samba-is-not-working-what-can-i-do)
- [Are deleted users or groups in Azure also removed from the LDAP entries?](#are-deleted-users-or-groups-in-azure-also-removed-from-the-ldap-entries)

## Does it support MFA (multi-factor authentication)?

Nope, see [here](https://github.com/Azure/ms-rest-nodeauth/issues/93). The login will just fail as mentioned [here](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth-ropc).

## How do I give some synced users the DSM-Administrator permission on a Synology-NAS?

Before DSM 7: Just create a group called "Administrators" and put the users in it.
With DSM 7: You can delegate specific permissions to each synced group.

## Can I use LDAPS (LDAP over SSL) instead of LDAP (with no encryption)?

Sure. Mount your certificate file and private key file to the docker container and then set the environment variables LDAPS_CERTIFICATE and LDAPS_KEY. You may also set LDAP_PORT to 636.

## Can I use LDAP over TLS (STARTTLS) instead of LDAP (with no encryption)?

Nope, that's not (yet) possible.

## Is it possible to customize the ldap attributes?

Sure! That's what I do in the DSM 7 workaround.
Look at [this](./customizer/customizer_DSM7_IDs_string2int.js) file for an example. Customize it as you need and map the file in your docker setup as `/app/customizer/ldap_customizer.js`. This file has even priority over the DSM 7 workaround. Basically everything can be changed with it. Filter users or groups, overwrite a users default group, add/remove/edit entries or attributes, and much more.

## Join NAS to Azure AD Domain

If you don't need support for older software, the officially Synology solution to [join your NAS to a Azure AD Domain](https://kb.synology.com/en-my/DSM/tutorial/How_to_join_NAS_to_Azure_AD_Domain) will work fine.
My wrapper creates an entire ldap server. So you can use it with several 3rd party (legacy) software in the same network.

## Why are personal microsoft accounts not supported?

This wrapper uses the ROPC flow for authentication. Microsoft doesn't support that for personal accounts as mentioned [here](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth-ropc):
> Personal accounts that are invited to an Azure AD tenant can't use ROPC.

## Samba is not working, what can I do?

Check the following points first:

- Is samba enabled and your user has permissions to use it?
- Are you using DSM >= 7? Set the ENV variable to `true`.
- Look into the docker Log. Are there any errors you should resolve? ![grafik](https://user-images.githubusercontent.com/23347180/114864713-9bb5e380-9df1-11eb-9138-5213537b7a3b.png)
- Did you really connect your device/NAS with a non-existing user from the env var `LDAP_BINDUSER`? Otherwise the required password hash for Samba is not available and access will fail.
- Before accessing files via network/Samba, each user must log in to dsm-web-gui or another tool that is directly connected to the ldap server. This also applies after a password change, since the password hash for Samba is only set after a successful login.
- Is your (Windows) device connected to Azure? Make sure you log in with username/password over the network, not with your pin code.
- Can you successfully access the shares with a local user?
- Make sure Synology Directory Service and Synology LDAP server are not installed.
- Maybe there is someting in the samba log. Get it to open an issue:
  - Enable "collect debug logs"
![image](https://user-images.githubusercontent.com/23347180/171563962-bea25dd1-8072-45d2-bbd9-5b8c86d3af1c.png)
  - Try the access a shared folder multiple times
  - [ssh into your nas](https://kb.synology.com/en-global/DSM/tutorial/How_to_login_to_DSM_with_root_permission_via_SSH_Telnet)
  - Run `cat /var/log/samba/log.smbd` and copy the latest error/fail/... messages - please replace sensitive informations like domains, ip addresses or names.
  - Don't forget to disable "collect debug logs" before opening an issue

## Are deleted users or groups in Azure also removed from the LDAP entries?

Yes, but with a delay. After a user has been deleted in Azure, it remains available there for about 30 days to undo the deletion. The API stops listing the user a earlier, a few hours after the deletion. In the meantime, the wrapper fetches the user as usual. After this time, the wrapper no longer receives the user. The deletion in the wrapper takes place 7 days later. Why not removing the user immediately? A user could also no longer be in the wrapper due to a misconfigured filter (env var). But just because of such an error, users (and their cached password hashes) should not be deleted immediately. Why not keeping it also 30 days? The user can no longer log in anyway. If the time span is too long (or short), it can be adjusted via the environment variable LDAP_DAYSTOKEEPDELETEDUSERS.
