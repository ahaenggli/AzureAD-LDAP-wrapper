---
title: 6.1 Portainer
---

Portainer supports LDAP authentication, allowing users to log in by authenticating against your LDAP directory. This guide outlines the steps to set up LDAP authentication over LDAP-wrapper with Portainer.

{{< toc format=raw >}}

## Prerequisites

Before configuring LDAP authentication for Portainer, ensure the following prerequisites are met:

- **LDAP-wrapper**: Make sure you have a working [LDAP-wrapper](https://github.com/ahaenggli/AzureAD-LDAP-wrapper/).
- **Portainer**: Install and set up a working instance of [Portainer](https://docs.portainer.io/start/install-ce).

## Settings for Portainer LDAP Authentication with LDAP-wrapper

### LDAP Configuration

- **LDAP Server**: Specify the IP or name of your NAS with Port 389.  
  Example: `192.168.1.2:389` or `my-nas-name.local:389`
- **Reader DN**: Set it to `uid=root`, matching an entry of your LDAP-wrapper environment variable `LDAP_BINDUSER`.
- **Password**: Set it to the password corresponding to the entry in your LDAP-wrapper environment variable `LDAP_BINDUSER`.

### LDAP Security

- Ensure that `StartTLS`, `Use TLS`, and `Skip verification` are set to off.

### User Search Configurations

- **Base DN**: Define the base DN as `cn=users,dc=domain,dc=tld`.
- **Username Attribute**: Specify `mail`.
- **Filter**: Use the following filter to restrict access:

  ```plaintext
  (|(&(uid=*)(memberOf=cn=users,cn=groups,dc=domain,dc=tld))(&(cn=administrators)))
  ```

  This filter ensures that only users within the administrators group can log into Portainer.

Don't forget to save your LDAP-wrapper configuration. Now, users attempting to log into Portainer will be authenticated against your LDAP directory. Only users within the administrators group, as specified in the LDAP filter, will be allowed access to Portainer.
