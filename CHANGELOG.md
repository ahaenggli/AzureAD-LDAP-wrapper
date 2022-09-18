# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] (in 'dev')

### Added

- Env var `GRAPH_IGNORE_MFA_ERRORS` to allow logins despite required MFA. When set to true, some MFA-related error codes are treated as successful logins. Attention, this is only a first attempt and may not work in all cases. Please open an issue if you encounter any problems with this.
- Deleted users and groups in Azure are now also removed from the LDAP entries. The number of days these entries should be kept in this wrapper before deletion can be specified with the env var `LDAP_DAYSTOKEEPDELETEDUSERS`. (see [FAQ](./FAQ.md#are-deleted-users-or-groups-in-azure-also-removed-from-the-ldap-entries) for more details)
- Env var `LDAP_PORT` to set a custom port for the listener (e.g. 389 for running the container directly on the host network)
- Print version at start-up, so you don't have to remember which version you are currently using.
- Check if the volume /app/.cache is mapped inside a docker container

### Fixed

- if env var `LDAP_SAMBANTPWD_MAXCACHETIME` is set to `0` (= no cache), the hashed password will never be written to the cache file.

## [1.8.1] - 2022-07-24

### Changed

- env var `LDAP_ANONYMOUSBIND` default value is set to `domain`, so everything works normal on a Synology NAS. However, you may need to change this value to `all` or `none` depending on how you use it.
- env var `DSM7` is set to `true` as default on new containers
- env var `GRAPH_FILTER_GROUPS` is set to `securityEnabled eq true` as default on new containers

### Fixed

- Modify-Requests: Update custom attributes/values and keep the CamelCase for the attribute names

### Added

- env var `LDAP_ANONYMOUSBIND` to restrict access for ldap queries without any authentication if needed.
- env var `LDAP_SECURE_ATTRIBUTES` to restrict access for the specified attributes only to superusers.
- env var `LDAP_SENSITIVE_ATTRIBUTES`  to restrict access to the specified attributes to the respective user only and superusers.
- customizer options to change api endpoints from e.g. v1.0 to beta

## [1.8.0] - 2022-07-09

### Changed

- Reset .cache folder owner every time the container is started
- Use the SIDs for users/groups from Azure instead of a "randomly" generated one.
However, you can enable the old handling by setting the env var `LDAP_SAMBA_USEAZURESID` to `false`.

### Added

- support for proxies (env var `HTTPS_PROXY` or `HTTP_PROXY`)

## [1.7.0] - 2022-03-19

### Changed

- to support #ext#-users the following changes were necessary:
  - added ldap attribute `AzureADuserPrincipalName` with the original AAD-User (for login/password check in the AAD)
  - allowed domain mismatch for AD-Domain and LDAP-Domain
  - try binding via `AzureADuserPrincipalName` if no entry for `uid`/`dn` is found
  - env var `GRAPH_FILTER_USERS` to filter user entries in graph using the [$filter](https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter) query parameter  
  (default is set to `userType eq 'Member'`, so external users (guests) will not be synced automatically by default)
  - env var `GRAPH_FILTER_GROUPS` to filter group entries in graph using the [$filter](https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter) query parameter  
  (e.g. set it to `securityEnabled eq true` so only security groups will be sync and not every teams-group)
- SID calculation for users is now `sambaSID: fixedBase + "-" + (uidNumber * 2 + 1000)`
- SID calculation for groups is now `sambaSID: fixedBase + "-" + (gidNumber * 2 + 1001)`

### Added

- support #ext#-users (guest users from other `ExternalAzureAD`)
- add ldap attribute `sambaPrimaryGroupSID` for users
- optional env var `LDAP_SAMBADOMAINNAME` to manually set the sambaDomainName attribute in the LDAP
- optional env var `SAMBA_BASESID` to overwrite the fixed base SID

### Fixed

- documentation for join a device with a non AAD user
- handle for @odata.nextLink in graph responses (should fix parts of #14)
- converted schema csv files from utf-16 to utf-8
- handle cn=subschema like any other ldap entries instead of fixed search attributes
- register an error handler for the server (EventEmitter)
- escape LDAP special chars `,=+<>#;\` with an additional backslash

## [1.6.0] - 2021-12-19

### Changed

- Switched from @azure/ms-rest-nodeauth to @azure/Identity (ADAL to MSAL)
~~[Treat application as a public client](https://github.com/AzureAD/microsoft-authentication-library-for-dotnet/wiki/Username-Password-Authentication#application-registration) may be set to `true`~~  
Set [Allow public client flows](https://github.com/AzureAD/microsoft-authentication-library-for-dotnet/wiki/Username-Password-Authentication#application-registration) to `Yes` and add the permission `User.Read` for `Delegated`  in your Azure Portal or you can't login anymore. The settings are described with some images in the [README](README.md#how-to-use-it).  
Those changes were necessary to use MSAL instead of ADAL.

### Added

- handler to add new ldap entries
- handler to remove/delete new ldap entries
- handler to modify/edit ldap entires

## [1.5.0] - 2021-10-07

### Added

- env var `LDAP_SYNC_TIME` to set the interval for fetching users/groups from azure database. Default is 30 minutes. (thx @oleksandr-mazur)
- env var `DSM7` to activate the DSM 7 workaround. It handles gidNumber and uidNumber as integers instead of strings.
- Handler to use custom JavaScript to modify your ldap attributes  
This allows you e.g. to filter your azure user/groups or modify the ldap attributes. This method is also used in the DSM7 workaround.
Look at [this](./customizer/customizer_DSM7_IDs_string2int.js) file for an example. Customize it as you need and map the file in your docker setup as `/app/customizer/ldap_customizer.js`.

## [1.4.0] - 2021-07-25

### Added

- entry point for customizable schema modifications

### Changed

- Changed the "sambaDomainName" attribute to be in upper case to respect the standard configuration of samba configs. (thx @DreydenGys)

## [1.3.1] - 2021-07-15

### Fixed

- gidNumber and uidNumber are strings again

## [1.3.0] - 2021-07-13

### Added/Fixed

- more schema data to avoid errors in DSM 7
  (ldap schema data was extracted from syno directory server)
- sambaDomainName is now part of the ldap schema information

### Changed

- merge ldap entries with matching entryUUIDs
- removed subschemaSubentry and hasSubordinates values from ldap entries

### Security

- npm dependencies updated

## [1.2.0] - 2021-04-15

### Added

- "rename" group if another with same entryUID exists

### Changed

- groups `entryDN`:
  - replace accents with the latin alternatives
   (ç -> c, è -> e, ö -> o, ...)
  - replace non alpha-numeric chars with dashes

## [1.1.0] - 2021-04-06

### Added

- limit the time a cached sambaNTPassword hash can be used with env var `LDAP_SAMBANTPWD_MAXCACHETIME`
- entryUID and osx-attributes for ldap entries
- "rename" user if another with same entryUID exists
- LDAPS (LDAP over SSL) support

### Changed

- the docker image is now using tini (nodejs is not running as PID 1 anymore)
- always log 30 minutes refresh info (to be sure it's still running)

## [1.0.2] - 2021-04-02

### Fixed

- format logs
- distinct user membership (user could be in same group multiple times due to wrong creation/edit)

### Security

- no login from cache for inactive users

## [1.0.1] - 2021-04-02

### Added

- more logs for debugging

### Fixed

- users without groups

## [1.0.0] - 2021-03-31

### Added

- new environment variable to allow login from cached sambaNTPassword
`LDAP_ALLOWCACHEDLOGINONFAILURE`, default: true
if set to true and the login is failed, the login is retried against the sambaNTPassword, except the error says "wrong credentials".
(useful for unstable internet connection)
- this CHANGELOG file

### Changed

- README file (more samples, map-folder)
- errors are always logged
- allow multiple bind-user (ex. ldapsearch1|mysecret||searchy2|othersecret)

### Fixed

- load existing db on startup-error (ex. unstable internet connection)

### Security

- sambaNTPassword can only be accessed from defined LDAP_BINDUSER and on accessing your own entries (userA can only access userA-sambaNTPassword, LDAP_BINDUSER-user can access all sambaNTPasswords)

## [0.2.0-beta] - 2021-03-27

### Added

- LDAP server
- AzureAD Connection
- Dockerfile
- Container on hub.docker.cm

[Unreleased]: https://github.com/ahaenggli/AzureAD-LDAP-wrapper/projects/1
[1.8.0]: https://github.com/ahaenggli/AzureAD-LDAP-wrapper/releases/tag/v1.8.0
[1.7.0]: https://github.com/ahaenggli/AzureAD-LDAP-wrapper/releases/tag/v1.7.0
[1.6.0]: https://github.com/ahaenggli/AzureAD-LDAP-wrapper/releases/tag/v1.6.0
[1.5.0]: https://github.com/ahaenggli/AzureAD-LDAP-wrapper/releases/tag/v1.5.0
[1.4.0]: https://github.com/ahaenggli/AzureAD-LDAP-wrapper/releases/tag/v1.4.0
[1.3.1]: https://github.com/ahaenggli/AzureAD-LDAP-wrapper/releases/tag/v1.3.1
[1.3.0]: https://github.com/ahaenggli/AzureAD-LDAP-wrapper/releases/tag/v1.3.0
[1.2.0]: https://github.com/ahaenggli/AzureAD-LDAP-wrapper/releases/tag/v1.2.0
[1.1.0]: https://github.com/ahaenggli/AzureAD-LDAP-wrapper/releases/tag/v1.1.0
[1.0.2]: https://github.com/ahaenggli/AzureAD-LDAP-wrapper/releases/tag/v1.0.2
[1.0.1]: https://github.com/ahaenggli/AzureAD-LDAP-wrapper/releases/tag/v1.0.1
[1.0.0]: https://github.com/ahaenggli/AzureAD-LDAP-wrapper/releases/tag/v1.0.0
[0.2.0-beta]: https://github.com/ahaenggli/AzureAD-LDAP-wrapper/releases/tag/v0.2.0-beta
