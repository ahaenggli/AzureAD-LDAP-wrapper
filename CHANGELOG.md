# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] (in 'dev')
### Added
- env var `LDAP_SAMBANTPWD_MAXCACHETIME`
allows to limit the time a cached sambaNTPassword hash can be used
### Changed
- the docker image is now using tini (nodejs is not running as PID 1 anymore)

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
[1.0.2]: https://github.com/ahaenggli/AzureAD-LDAP-wrapper/releases/tag/v1.0.2
[1.0.1]: https://github.com/ahaenggli/AzureAD-LDAP-wrapper/releases/tag/v1.0.1
[1.0.0]: https://github.com/ahaenggli/AzureAD-LDAP-wrapper/releases/tag/v1.0.0
[0.2.0-beta]: https://github.com/ahaenggli/AzureAD-LDAP-wrapper/releases/tag/v0.2.0-beta