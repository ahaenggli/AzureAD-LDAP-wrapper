---
title: 3. Security
---

**There are a few things you should definitely keep in mind:**

- Restrict access through a firewall. Do **NOT** allow everyone in your network access to the LDAP-wrapper.\
  Only your (local hosted) applications or your NAS should have access.

- An LDAP search on the NAS must be possible without any authentication in order to be able to select the domain/baseDN at all.
  Therefore, some queries can be run as anonymous by default. Data like domain/baseDN or schema can be fetched without authentication.
  Since this LDAP-wrapper is originally only meant to use my work account (Microsoft Entra Account) on a NAS, this is the default behaviour.
  You can change this via the env var `LDAP_ANONYMOUSBIND` if required.

- In order to use samba, the user credentials hashes are cached in the ldap attribute sambaNTPassword.\
If you don't need samba, the cache can be disabled by setting `LDAP_SAMBANTPWD_MAXCACHETIME` to 0.\
However, if you do not disable the cache, there is a special treatment for these hashed credentials. This handling can not be disabled.
  - Superusers, as defined in `LDAP_BINDUSER`, can get all cached credentials.
  - Each user has access to his own cached credential hash.
  - In all other cases the attribute is returned with XXXX instead of the hash value.

- In cases such as network/internet issues or Microsoft Graph API / Entra ID not being reachable, the cached hash is used for authentication.\
  This can be a problem if the user has been deactivated in the meantime or the password would be invalid.
  The use of the cached password during authentication can be disabled by setting the `LDAP_ALLOWCACHEDLOGINONFAILURE` parameter to false.

- Using the experimental feature to bypass MFA/2FA\
  Officially MFA is not supported by this LDAP-wrapper. The login for users with activated MFA simply fails, as mentioned  [here](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth-ropc) and [here](https://github.com/Azure/ms-rest-nodeauth/issues/93).
  There is an experimental feature to **bypass** MFA/2FA. It must be manually enabled by setting the the env var `GRAPH_IGNORE_MFA_ERRORS` to true. Even if the env var is set to true, the login attempt appears as "Failure" in the Microsoft Entra ID sign-in logs due to MFA/2FA. It is only the LDAP-wrapper that internally treats some MFA/2FA related error codes as a successful login.

- Mapped docker volume\
  Be aware that other users with access on your file system may also be able to read the JSON files in the mounted docker path (/app/.cache) and thus get access to the cached sambaNTPassword attribute.
