# Frequently Asked Questions (FAQ)

- [Does it support MFA (multi-factor authentication)?
](#does-it-support-mfa-multi-factor-authentication)
- [How do I give some synced users the DSM-Administrator permission on a Synology-NAS?](#how-do-i-give-some-synced-users-the-dsm-administrator-permission-on-a-synology-nas)
- [Can I use LDAPS (LDAP over SSL) instead of LDAP (with no encryption)?](#can-i-use-ldaps-ldap-over-ssl-instead-of-ldap-with-no-encryption)
- [Can I use LDAP over TLS (STARTTLS) instead of LDAP (with no encryption)?](#can-i-use-ldap-over-tls-starttls-instead-of-ldap-with-no-encryption)
- [Is it possible to add or edit the ldap attributes?](#is-it-possible-to-add-or-edit-the-ldap-attributes)

## Does it support MFA (multi-factor authentication)?

Nope, see [here](https://github.com/Azure/ms-rest-nodeauth/issues/93). The login will just fail as mentioned [here](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth-ropc).

## How do I give some synced users the DSM-Administrator permission on a Synology-NAS?

Before DSM 7.0: Just create a group called "Administrators" and put the users in it.
With DSM 7.0: You can delegate specific persmisisons to each synced groupd.

## Can I use LDAPS (LDAP over SSL) instead of LDAP (with no encryption)?

Sure. Mount your certificate file and private key file to the docker container and then set the environment variables LDAPS_CERTIFICATE and LDAPS_KEY. You may also set LDAP_PORT to 636.

## Can I use LDAP over TLS (STARTTLS) instead of LDAP (with no encryption)?

Nope, that's not (yet) possible.

## Is it possible to add or edit the ldap attributes?

Sure! That's what I do in the DSM 7 workaround.
Look at [this](./customizer/customizer_DSM7_IDs_string2int.js) file for an example. Customize it as you need and map the file in your docker setup as `/app/customizer/ldap_customizer.js`. This file is priorized over the DSM 7.0 workaround.
