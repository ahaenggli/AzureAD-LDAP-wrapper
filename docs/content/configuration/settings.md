---
title: Settings
---

The following is a list of all possible settings. The LDAP wrapper is intended to be used with Docker. Therefore, the settings must be made using environment variables.

{{< toc format=html >}}

## Azure Settings

### AZURE_APP_ID

Your `Application ID` from [azure](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal#get-tenant-and-app-id-values-for-signing-in) (see #4)

### AZURE_TENANTID

Your `Tenant ID` from [azure](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal#get-tenant-and-app-id-values-for-signing-in) (see #3)

### AZURE_APP_SECRET

A `Client secret`-value from [azure](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal#option-2-create-a-new-application-secret)

### AZURE_ENDPOINT (optional)

By default, the Azure AD global service endpoint (<https://login.microsoftonline.com>) is used. If you prefer to use a different endpoint, you can specify it here.

## Graph API Settings

### GRAPH_ENDPOINT (optional)

By default, the Microsoft Graph global service endpoint (<https://graph.microsoft.com>) is used. If you prefer to use a different endpoint, you can specify it here.

### GRAPH_API_VERSION (optional)

By default, the v1.0 API version is used for the Microsoft Graph endpoint. To use the beta API version instead, specify it here.

### GRAPH_FILTER_USERS (optional)

This allows you to filter the users in the graph api using the [$filter](https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter) query parameter.  
The default filter is set to `userType eq 'Member'`. That's why external users (guests) will not be synced automatically by default in a Docker container.

### GRAPH_FILTER_GROUPS (optional)

This allows you to filter the groups in the graph api using the [$filter](https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter) query parameter. The default filter is set in the Docker container to `securityEnabled eq true`, so only security groups are synchronized and not every single Teams group. More properties to filter are documented [here](https://docs.microsoft.com/en-us/graph/api/resources/group?view=graph-rest-1.0#properties).

### GRAPH_IGNORE_MFA_ERRORS (default: false)

When set to true, some MFA/2FA-related error codes are treated as successful logins. So, it allows logins despite required MFA/2FA. MFA/2FA is thus bypassed.

Warning: This feature is only experimental and may not work in all cases. Please open an issue if you encounter any problems.

## LDAP Settings

### LDAP_DOMAIN

Your domain, for example `domain.tld`

### LDAP_BASEDN (optional)

The LDAP_BASEDN parameter allows you to specify the base DN (Distinguished Name) for your LDAP server. If this parameter is not provided, the base DN is automatically generated based on the LDAP_DOMAIN value.

For example, if your LDAP_DOMAIN is domain.tld, the generated base DN would be dc=domain,dc=tld. Similarly, if your LDAP_DOMAIN is intra.domain.tld, the generated base DN would be dc=intra,dc=domain,dc=tld.

By specifying the LDAP_BASEDN, you have the flexibility to customize the base DN according to your LDAP server configuration and organizational structure.

### LDAP_SAMBADOMAINNAME (optional)

Default is the first part of your baseDN, for `dc=example,dc=net` it would be `EXAMPLE`. For any other value, just set it manually with this env var.

### LDAP_BINDUSER

Every AzureAD-user can bind (and auth) in this LDAP-Server.
This parameter allows you to add additional - NOT in AzureAD existing - users.
Format: "username|password". This can be useful to "join" a device (e.g. NAS).
Multiple users can be split by "||". (e.g. `ldapsearch1|mysecret||searchy2|othersecret`).
Those users are superusers (e.g. root, admin, ...) and have full read and modify permissions and can also see the sambaNTPassword-hash.

### LDAP_ANONYMOUSBIND (default: domain)

Depending on the value, anonymous binding is handelt differently

* none: no ldap query allowed without binding
* all: all ldap query are allowed without binding
* domain: only the domain entry is visible without binding

### LDAP_DEBUG (default: false)

If set to true there are more detailed logs in the console output.

### LDAP_PORT (default: 13389/389)

Sets the port for the listener. The wrapper in the Docker containter listens on port 13389 by default.
However, if you are running a Docker container directly on the host network, you may want to map the port to 389.
Port 389 is also used when starting directly via npm.

### LDAP_SECURE_ATTRIBUTES (optional)

Allows to define secure attributes. Onlye superusers can see them all.
Multiple attributes can be split by "|". (e.g. `customSecurityAttributes_*|PlannedDischargeDate`).

### LDAP_SENSITIVE_ATTRIBUTES (optional)

Allows to define sensitive attributes. Each user can see his own values, but not those of another user.
Additionally, superusers can see them all, too.
Multiple attributes can be split by "|". (e.g. `middlename|PrivatePhoneNumber`).

### LDAP_ALLOWCACHEDLOGINONFAILURE (default: true)

allows login from cached sambaNTPassword.
If set to true, the login has failed and the error does NOT say "wrong credentials", the password is checked against the cached sambaNTPassword. If it matches, the authentification is successfull.

### LDAP_SAMBANTPWD_MAXCACHETIME (optional, default: infinity)

Maximum time in minutes that defines how long a cached sambaNTPassword hash can be used (for login and samba access).
After that time, a user has to login 'normal' via the bind method (e.g. dsm-web-gui) to reset the cached value. As default there is no time limit (-1=infinity).
If this time limit is set to 0, no samba access is possible and therefore no password hash is cached.

### LDAP_DAYSTOKEEPDELETEDUSERS (optional, default: 7)

Defines the number of days after deletion in Azure after which an entry is also removed in the wrapper. By default, te deletion in the wrapper takes place about 7 days later. The reason for the  delay is simple: A user could also no longer be in the wrapper due to a misconfigured filter (env var). But just because of such an error, users (and their cached password hashes) should not be deleted immediately.
However, you can set the value to 0 to delete a user/group immediately. Use a negative value like -1 to keep everything in the wrapper and not delete anything.

### LDAP_SYNC_TIME (default: 30 minutes)

The interval in minutes for fetching users/groups from azure. The default is 30 minutes.

### LDAP_USERS_SYNCONLYINGROUP

When set, only users within the specified groups are fetched and made available in the wrapper.
Multiple group names can be specified using the pipe character (|). The variable can be used in conjunction with `LDAP_USERS_SETDEFAULTGROUP`.

### LDAP_USERS_SETDEFAULTGROUP

When set, the first specified group associated with the user will be used as the default group.
Multiple group names can be specified using the pipe character (|). For example, `admins|finance|hr`. If a user is within both groups (finance and hr), the default group will be set to finance because it was defined first.
With DSM 7, there are some issues regarding group permissions. ACL and UID/GID shifting can help. However, when losing the permissions, there seems to be some sort of fallback to the default group. With this setting, you can adjust the default group for your users.

## LDAPS

### LDAPS_CERTIFICATE

Path to your certificate.pem file.
You also have to set `LDAPS_KEY` to run LDAP over SSL.
You may also need to set `LDAP_PORT` to 636.

### LDAPS_KEY

Path to private key file.
You also have to set `LDAPS_CERTIFICATE` to run LDAP over SSL.
You may also need to set `LDAP_PORT` to 636.

## Samba

### SAMBA_BASESID (optional)

Base SID for all sambaSIDs generated for sambaDomainName, groups and users. Default is `S-1-5-21-2475342291-1480345137-508597502`.

### LDAP_SAMBA_USEAZURESID (default: true)

Use the calculated SIDs for users/groups from AzureAD (GUID/ObjectId) instead of a "randomly" generated one. You can enable the old handling by setting the env var `false`.

## misc

### DSM7

If set to `true` the ldap attributes uidNumber and gidNumber are converted from strings to numbers.
Somehow this seems to be necessary to work with DSM 7.0. The default value is `false`.

### HTTPS_PROXY or HTTP_PROXY (optional)

URL to your proxy, e.g. <http://192.168.1.2:3128>

### PUID and PGID (optional)

Override the default UID/GID (1000:1000) of the node user to enable better file permission handling on mounted volumes.
Note: The values set in PUID and PGID must not already be in use by other internal users or groups inside the container.
