# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] (in 'dev')

## [1.6.0] - 2021-12-19
### Changed
- Switched from @azure/ms-rest-nodeauth to @azure/Identity (ADAL to MSAL)
[Treat application as a public client](https://github.com/AzureAD/microsoft-authentication-library-for-dotnet/wiki/Username-Password-Authentication#application-registration) may be set to `true` in your Azure Portal or you can't login anymore.
### Added
- handler to add new ldap entries
- handler to remove/delete new ldap entries
- handler to modify/edit ldap entires

## [1.5.0] - 2021-10-07
### Added
- env var `LDAP_SYNC_TIME` to set the interval for fetching users/groups from azure database. Default is 30 minutes. (thx @oleksandr-mazur)
- env var `DSM7` to activate the DSM 7.0 workaround. It handles gidNumber and uidNumber as integers instead of strings.
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
- more schema data to avoid errors in DSM 7.0
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