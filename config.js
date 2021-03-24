require('dotenv').config();

var config = {}

// AZURE
config.AZURE_APP_ID = process.env.AZURE_APP_ID;
config.AZURE_APP_SECRET = process.env.AZURE_APP_SECRET;
config.AZURE_TENANTID = process.env.AZURE_TENANTID;

// LDAP
config.azureDomain = process.env.LDAP_DOMAIN || "example.net";
config.baseDn = process.env.LDAP_BASEDN || "dc=example,dc=net";
config.groupDnSuffix = process.env.LDAP_GROUPSDN || "cn=groups," + config.baseDn;
config.usersDnSuffix = process.env.LDAP_USERSDN || "cn=users," + config.baseDn;
config.usersGroupDnSuffix = process.env.LDAP_USERSGROUPSBASEDN || "cn=users," + config.groupDnSuffix;
config.userRdn = process.env.LDAP_USERRDN || "uid";
config.dataFile = process.env.LDAP_DATAFILE || "./.cache/azure.json";
config.removeDomainFromCn = process.env.LDAP_REMOVEDOMAIN || true; // set to true to remove the domain e.g. "alice@example.net" will just be "alice" for login
config.LDAP_PORT = process.env.LDAP_PORT || 389;
config.LDAP_BINDUSER = process.env.LDAP_BINDUSER;
config.LDAP_DEBUG = (process.env.LDAP_DEBUG=="true") || false;
// export
module.exports = config;