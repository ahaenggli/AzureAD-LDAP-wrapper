---
title: AzureAD-LDAP-wrapper
---

The AzureAD-LDAP-wrapper ([![GitHub release (latest by date)](https://img.shields.io/github/v/release/ahaenggli/AzureAD-LDAP-wrapper?style=social)](https://github.com/ahaenggli/AzureAD-LDAP-wrapper) <a href="https://www.buymeacoffee.com/ahaenggli" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" width="90px"></a>) is a nodejs ldap server ([ldapjs](https://github.com/ldapjs/node-ldapjs)) that provides AzureAD users and groups via LDAP protocol. User authentication is done each time through Microsoft Graph API. As a result, other applications can connect to the LDAP server, allowing users to use their familiar AzureAD credentials. This is especially useful for applications that do not support AzureAD and for which you do not want to maintain a local AD controller.

{{< hint type=note title="About the motivation" >}}

I personally run the project in a Docker container on my Synology NAS. The NAS and some intranet web applications are connected to the ldap server. This way my users can log in to the NAS, the web applications and of course office.com with the same credentials.
The whole thing could probably also be achieved by [joining the NAS to AADDS](https://kb.synology.com/en-global/DSM/tutorial/How_to_join_NAS_to_Azure_AD_Domain). However, I was not willing to maintain such a big setup (virtual machine/VPN/AADDS) only that my 3 users can use the same credentials (almost) everywhere.

{{< /hint >}}

## How the server works

1. AzureAD-LDAP-wrapper starts an LDAP server
2. On "starting" users and groups are fetched from Azure Active Directory
3. On "bind" the user credentials are checked through Microsoft Graph API
4. On successful "bind" the user password is saved as additional hash (sambaNTPassword) and sambaPwdLastSet ist set to "now". This is necessary to allow access from e.g. Windows PCs to the samba shares on the NAS.
5. Users and groups are fetched again every 30 minutes  
(while keeping uid, gid, sambaNTPassword and sambaPwdLastSet)

