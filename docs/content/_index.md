---
title: AzureAD-LDAP-wrapper
---

AzureAD-LDAP-wrapper is a Node.js LDAP server built on top of ([ldapjs](https://github.com/ldapjs/node-ldapjs)) that allows users and groups from Azure Active Directory to be accessed through the LDAP protocol. User authentication is performed using Microsoft Graph API on every login attempt. This enables other applications to connect to the LDAP server and utilize AzureAD login credentials, making it a possible solution for older applications that lack AzureAD support or for scenarios where managing a local AD controller is undesirable.

{{< hint type=note title="About the motivation" >}}

I run the project on my Synology NAS in a Docker container. By connecting the NAS and some intranet web applications to the LDAP server, my users can log in to these services using their AzureAD credentials. Although it is possible to achieve this by [joining the NAS to AADDS](https://kb.synology.com/en-global/DSM/tutorial/How_to_join_NAS_to_Azure_AD_Domain), I preferred not to maintain such a big setup, which includes a virtual machine, VPN, and AADDS, just to allow my three users to use their credentials almost everywhere.

{{< /hint >}}

## How the server works

```mermaid
sequenceDiagram
  autonumber
  participant LDAP client
  participant AzureAD-LDAP-wrapper
  participant AAD (Graph API)
      
  Note over AzureAD-LDAP-wrapper: start LDAP server
  AzureAD-LDAP-wrapper->>AAD (Graph API): Fetch users and groups
  Note over AzureAD-LDAP-wrapper: cache users and groups locally

  LDAP client->>+AzureAD-LDAP-wrapper: Attempt to bind with user credentials
    AzureAD-LDAP-wrapper->>+AAD (Graph API): Check user credentials      
    AAD (Graph API)-->>-AzureAD-LDAP-wrapper: Valid credentials

  Note over AzureAD-LDAP-wrapper: save password hash locally in the cache
  AzureAD-LDAP-wrapper->>-LDAP client: Successful bind/authenticate
    
    loop every 30 minutes
            AzureAD-LDAP-wrapper->>AAD (Graph API): Fetch users and groups again
        Note over AzureAD-LDAP-wrapper: merge and cache users and groups locally
    end

```

The diagram shows the flow of communication between an LDAP client, the AzureAD-LDAP-wrapper, and the Azure Active Directory (AAD) via Graph API.

First, the AzureAD-LDAP-wrapper starts an LDAP server and fetches users and groups from the AAD Graph API. These are cached and merged locally.

When an LDAP client attempts to bind with user credentials, the AzureAD-LDAP-wrapper checks these credentials by communicating with the AAD Graph API. If the credentials are valid, the AAD Graph API sends a success response to the AzureAD-LDAP-wrapper, which then sends a successful bind message to the user's LDAP client. Additionally, the AzureAD-LDAP-wrapper saves the user's password hash in the sambaNTPassword attribute and sets the sambaPwdLastSet attribute to "now". This allows the user to access samba shares, such as those on a NAS, from Windows PCs.

The AzureAD-LDAP-wrapper periodically fetches user and group information from the AAD Graph API every 30 minutes, merging and caching the results locally. This process preserves attributes like uid, gid, sambaNTPassword, and sambaPwdLastSet.
