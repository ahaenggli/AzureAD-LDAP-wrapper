---
title: 6.2 Authelia with LDAP-wrapper
---

Authelia supports LDAP authentication, enabling users to log in by authenticating against your LDAP directory. This guide outlines the steps to set up LDAP authentication with Authelia using LDAP-wrapper.

{{< toc format=raw >}}

## Prerequisites

Before configuring LDAP authentication for Authelia with LDAP-wrapper, ensure the following prerequisites are met:

- **LDAP-wrapper**: Ensure you have a functioning [LDAP-wrapper](https://github.com/ahaenggli/AzureAD-LDAP-wrapper/).
- **Authelia**: Set up and configure [Authelia](https://www.authelia.com/overview/prologue/introduction/) for your environment.

## Settings for Authelia LDAP Authentication with LDAP-wrapper

To configure LDAP authentication with Authelia using LDAP-wrapper, follow these steps:

1. Open your `configuration.yml` file in the Authelia configuration directory.
2. Locate the `authentication_backend` section and configure it with the following example, adjusting the `url`,`base_dn`, `user`, and `password` based on your LDAP-wrapper setup:

```yaml
    ## Authentication Backend Provider Configuration
    authentication_backend:

    ## Password Reset Options
    password_reset:
        ## Disable both the HTML element and the API for reset password functionality.
        disable: true
        ## External reset password url for Microsoft
        custom_url: "https://account.activedirectory.windowsazure.com/ChangePassword.aspx"

    ## The amount of time to wait before we refresh data from the authentication backend. Uses duration notation
    ## See the below documentation for more information
    ## Duration Notation docs:  <https://www.authelia.com/c/common#duration-notation-format>
    ## Refresh Interval docs: <https://www.authelia.com/c/1fa#refresh-interval>
    refresh_interval: 5m

    ##
    ## LDAP (Authentication Provider)
    ##
    ldap:
        ## The LDAP implementation, this affects elements like the attribute utilised for resetting a password.
        implementation: custom
        ## The url to the ldap server. Format: <scheme>://<address>[:<port>].
        url: ldap://my-nas-name.local:389
        ## The dial timeout for LDAP.
        timeout: 5s
        ## Use StartTLS with the LDAP connection.
        start_tls: false
        tls:
        ## Server Name for certificate validation (in case it's not set correctly in the URL).
        # server_name: ldap.domain.tld
        ## Skip verifying the server certificate (to allow a self-signed certificate).
        skip_verify: false
        ## Minimum TLS version for either Secure LDAP or LDAP StartTLS.
        minimum_version: TLS1.2
        ## The distinguished name of the container searched for objects in the directory information tree.
        base_dn: dc=domain,dc=tld
        ## The attribute holding the username of the user. This attribute is used to populate the username in the session
        username_attribute: uid
        ## The additional_users_dn is prefixed to base_dn and delimited by a comma when searching for users.
        additional_users_dn: cn=users
        ## The users filter used in search queries to find the user profile based on input filled in login form.
        users_filter: (&(|({username_attribute}={input})({mail_attribute}={input}))(objectClass=person))
        ## The additional_groups_dn is prefixed to base_dn and delimited by a comma when searching for groups.
        additional_groups_dn: cn=groups
        ## The groups filter used in search queries to find the groups based on relevant authenticated user.
        groups_filter: (&(member={dn})(objectClass=posixGroup))
        ## The attribute holding the name of the group.
        group_name_attribute: cn
        ## The attribute holding the mail address of the user. If multiple email addresses are defined for a user, only the
        mail_attribute: mail
        ## The attribute holding the display name of the user. This will be used to greet an authenticated user.
        display_name_attribute: displayName
        ## Follow referrals returned by the server.
        ## This is especially useful for environments where read-only servers exist. Only implemented for write operations.
        permit_referrals: false
        ## The username and password of the admin user, matching an entry of your LDAP-wrapper environment variable `LDAP_BINDUSER`.
        user: uid=root
        ## Password can also be set using a secret: <https://www.authelia.com/c/secrets>
        password: 1234
```

3. Save the changes to your `configuration.yml` file.
4. Restart Authelia to apply the new configuration.

Now, Authelia is configured to authenticate users against your LDAP directory through LDAP-wrapper.
