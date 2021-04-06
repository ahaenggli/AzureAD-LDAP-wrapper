'use strict';

require('dotenv').config();

var config = {}

// AZURE
config.AZURE_APP_ID = process.env.AZURE_APP_ID;
config.AZURE_APP_SECRET = process.env.AZURE_APP_SECRET;
config.AZURE_TENANTID = process.env.AZURE_TENANTID;

// LDAP
config.LDAP_DOMAIN = (process.env.LDAP_DOMAIN || "example.net").toLowerCase().replace(/ /g, '');
config.LDAP_BASEDN = (process.env.LDAP_BASEDN || "dc=example,dc=net").toLowerCase().replace(/ /g, '');
config.LDAP_GROUPSDN = (process.env.LDAP_GROUPSDN || "cn=groups," + config.LDAP_BASEDN).toLowerCase().replace(/ /g, '');
config.LDAP_USERSDN = (process.env.LDAP_USERSDN || "cn=users," + config.LDAP_BASEDN).toLowerCase().replace(/ /g, '');
config.LDAP_USERSGROUPSBASEDN = (process.env.LDAP_USERSGROUPSBASEDN || "cn=users," + config.LDAP_GROUPSDN).toLowerCase().replace(/ /g, '');
config.LDAP_USERRDN = (process.env.LDAP_USERRDN || "uid").toLowerCase().replace(/ /g, '');
config.LDAP_DATAFILE = process.env.LDAP_DATAFILE || "./.cache/azure.json";

// set to true to remove the domain e.g. "alice@example.net" will just be "alice" for login
config.LDAP_REMOVEDOMAIN = true;
if (process.env.LDAP_REMOVEDOMAIN) config.LDAP_REMOVEDOMAIN = (process.env.LDAP_REMOVEDOMAIN == "true");

config.LDAP_PORT = parseInt(process.env.LDAP_PORT) || 389;
config.LDAP_BINDUSER = process.env.LDAP_BINDUSER;

config.LDAP_DEBUG = false;
if (process.env.LDAP_DEBUG) config.LDAP_DEBUG = (process.env.LDAP_DEBUG == "true");

config.LDAP_ALLOWCACHEDLOGINONFAILURE = true;
if (process.env.LDAP_ALLOWCACHEDLOGINONFAILURE) config.LDAP_ALLOWCACHEDLOGINONFAILURE = (process.env.LDAP_ALLOWCACHEDLOGINONFAILURE == "true");

config.LDAP_SAMBANTPWD_MAXCACHETIME = process.env.LDAP_SAMBANTPWD_MAXCACHETIME || -1;

// LDAPS
config.LDAPS_CERTIFICATE = process.env.LDAPS_CERTIFICATE;
config.LDAPS_KEY = process.env.LDAPS_KEY;

// export
module.exports = config;