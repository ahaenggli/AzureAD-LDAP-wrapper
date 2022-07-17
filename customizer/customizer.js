'use strict';

const helper = require('../helper');
const config = require('../config');
const fs = require('fs');
const DSM7 = require('./customizer_DSM7_IDs_string2int');

// *** all possible funcitons *** /
// ** modify the api endpoints, like e.g. switch from v1.0 to beta ** //
// ** customizer.modifyGraphApiConfig = function (apiConfig, MS_GRAPH_SCOPE) { return apiConfig; };
// ** modify fetched groups from Azure, e.g. to delete some of them so that they are not processed further ** /
// ** customizer.ModifyAzureGroups    = function (azuregroups) { return azuregroups; };
// ** modify a single ldap group entry, e.g. add more attributes from azure ... ** /
// customizer.ModifyLDAPGroup      = function (ldapgroup, azuregroup) { return ldapgroup; };
// ** modify fetched users from Azure, e.g. to delete some of them or some attributes so that they are not processed further ** /
// ** customizer.ModifyAzureUsers     = function (azureusers) { return azureusers; };
// ** modify a singal ldap user entry, e.g. add more attributes from azure, assign a different default group, ... ** /
// customizer.ModifyLDAPUser       = function (ldapuser, azureuser) { return ldapuser; };
// ** modify some overall attributes/entries ** /
// customizer.ModifyLDAPGlobal     = function (all) { return all; };

var customizer = {};

if (fs.existsSync('./customizer/ldap_customizer.js')) {
    customizer = require('./ldap_customizer.js');
    helper.log("customizer.js", "ldap_customizer loaded");  
} else if (config.DSM7){
    customizer = DSM7;
    helper.log("customizer.js", "DSM7 customizer loaded");    
}  


if (typeof customizer.modifyGraphApiConfig === "undefined") customizer.modifyGraphApiConfig = function (apiConfig, MS_GRAPH_SCOPE) { return apiConfig; };
if (typeof customizer.ModifyAzureGroups === "undefined") customizer.ModifyAzureGroups = function (azuregroups) { return azuregroups; };
if (typeof customizer.ModifyLDAPGroup === "undefined") customizer.ModifyLDAPGroup = function (ldapgroup, azuregroup) { return ldapgroup; };
if (typeof customizer.ModifyAzureUsers === "undefined") customizer.ModifyAzureUsers = function (azureusers) { return azureusers; };
if (typeof customizer.ModifyLDAPUser === "undefined") customizer.ModifyLDAPUser = function (ldapuser, azureuser) { return ldapuser; };
if (typeof customizer.ModifyLDAPGlobal === "undefined") customizer.ModifyLDAPGlobal = function (all) { return all; };

module.exports = customizer;