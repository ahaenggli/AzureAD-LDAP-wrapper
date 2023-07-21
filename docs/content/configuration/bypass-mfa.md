---
title: Bypass MFA
---

Officially MFA is not supported by this LDAP-wrapper. The login for users with activated MFA simply fails, as mentioned [here](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth-ropc) and [here](https://github.com/Azure/ms-rest-nodeauth/issues/93).
There is no interactive window to enter another factor, and LDAP does not support this either.
If you need to use this LDAP-wrapper despite of activated MFA, there are two options:

1. Disable MFA for this application in AzureAD (preferred).\
   There are several ways to define MFA, but only some of them allows you to disable MFA.
   - Per-user MFA\
     MFA could be [enabled individually](https://learn.microsoft.com/en-us/azure/active-directory/authentication/howto-mfa-userstates) for each user. A possible workaround seems to be the [trusted IPs feature](https://learn.microsoft.com/en-us/azure/active-directory/authentication/howto-mfa-mfasettings#trusted-ips), which allows to disable MFA for some IPs, but this feature requires Azure AD Premium.\
     If a login fails due to this MFA method, the error code is AADSTS50079.
   - Security defaults\
     [Security defaults](https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/concept-fundamentals-security-defaults) seems to be the only ways for customers using the free Azure AD plan to [enable multi-factor authentication](https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/concept-fundamentals-mfa-get-started#free-option) in their whole environment. It looks like there are no workarounds to disable MFA for certain IPs or applications.\
     If a login fails due to this MFA method, the error code is AADSTS50076.
   - Conditional Access\
     [Conditional Access](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/howto-conditional-access-policy-all-users-mfa) can be used to require MFA for some or all the users. This is the most flexible way to activate MFA, but it is a premium feature. The settings allows to exclude certain apps. If a login fails due to this MFA method, the error codea are either AADSTS50158 (for external MFA like Duo) or also AADSTS50079. As a simple workaround, the app used by the LDAP-wrapper can be excluded:
     - Add a URL in the app (e.g. "https://localhost")
     ![grafik](../bypass-mfa_addurl.png)
     - The App can now be selected in the exclude list
     ![grafik](../bypass-mfa_exclude.png)

2. Let the LDAP-wrapper internally treat some MFA/2FA related error codes as a successful login.\
  There is an experimental feature to ***bypass*** MFA/2FA. It must be manually enabled by setting the the env var `GRAPH_IGNORE_MFA_ERRORS` to true.\
  Even if the env var is set to true, the login attempt appears as "Failure" in the AzureAD sign-in logs due to MFA/2FA. Only the LDAP wrapper internally treats some MFA/2FA-related error codes as successful logins. Specifically, these are the error codes AADSTS50076, AADSTS50079 and AADSTS50158, as mentioned above.
