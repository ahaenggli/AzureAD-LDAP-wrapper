'use strict';

const helper = require('./helper');
const config = require('./config');
const fs = require('fs');
const DSM7 = require('../customizer/customizer_DSM7_IDs_string2int');

var customizer = {};
var customizer_script = {};

if (fs.existsSync('./customizer/ldap_customizer.js')) {
    customizer_script = require('../customizer/ldap_customizer.js');
    helper.log("customizer.js", "ldap_customizer loaded");
} else if (config.DSM7) {
    customizer_script = DSM7;
    helper.log("customizer.js", "DSM7 customizer loaded");
}

// keep only users within these groups from Azure
const sync_only_groups = config.LDAP_USERS_SYNCONLYINGROUP?.split("|").map(e => e.trim().toLowerCase()) || null;
const default_group = config.LDAP_USERS_SETDEFAULTGROUP?.split("|").map(e => e.trim().toLowerCase()) || null;

// ** modify the api endpoints, like e.g. switch from v1.0 to beta ** //
customizer.modifyGraphApiConfig = function (apiConfig, MS_GRAPH_SCOPE) {
    if (typeof customizer_script.modifyGraphApiConfig !== "undefined") apiConfig = customizer_script.modifyGraphApiConfig(apiConfig, MS_GRAPH_SCOPE);
    return apiConfig;
};

// ** modify fetched groups from Azure, e.g. to delete some of them so that they are not processed further ** /
customizer.ModifyAzureGroups = function (azuregroups) {
    if (typeof customizer_script.ModifyAzureGroups !== "undefined") azuregroups = customizer_script.ModifyAzureGroups(azuregroups);

    if (sync_only_groups && sync_only_groups.length > 0)
        azuregroups = azuregroups.filter(group => sync_only_groups.includes(group.displayName.toLowerCase()));

    return azuregroups;
};

// ** modify a single ldap group entry, e.g. add more attributes from azure ... ** /
customizer.ModifyLDAPGroup = function (ldapgroup, azuregroup) {
    if (typeof customizer_script.ModifyLDAPGroup !== "undefined") ldapgroup = customizer_script.ModifyLDAPGroup(ldapgroup, azuregroup);

    return ldapgroup;
};

// ** modify fetched users from Azure, e.g. to delete some of them or some attributes so that they are not processed further ** /
customizer.ModifyAzureUsers = function (azureusers) {
    if (typeof customizer_script.ModifyAzureUsers !== "undefined") azureusers = customizer_script.ModifyAzureUsers(azureusers);

    return azureusers;
};

// ** modify a singal ldap user entry, e.g. add more attributes from azure, assign a different default group, ... ** /
customizer.ModifyLDAPUser = function (ldapuser, azureuser) {
    if (typeof customizer_script.ModifyLDAPUser !== "undefined") ldapuser = customizer_script.ModifyLDAPUser(ldapuser, azureuser);

    // no groups for user? set gidNumber to 0
    if (sync_only_groups && sync_only_groups.length > 0) {
        ldapuser.memberOf = ldapuser.memberOf.filter(e => e != config.LDAP_USERSGROUPSBASEDN);
        if (Array.isArray(ldapuser.memberOf) && ldapuser.memberOf.length === 0) ldapuser.gidNumber = 0;
    }

    return ldapuser;
};

// ** modify some overall attributes/entries ** /
customizer.ModifyLDAPGlobal = function (all) {
    if (typeof customizer_script.ModifyLDAPGlobal !== "undefined") all = customizer_script.ModifyLDAPGlobal(all);

    const users = Object.keys(all).filter(e => all[e].hasOwnProperty("structuralObjectClass") && all[e].structuralObjectClass === "inetOrgPerson");

    // keep only users with gidNumber > 0
    if ((sync_only_groups && sync_only_groups.length > 0)) {
        for (let key of users) {
            if (all[key].hasOwnProperty("uidNumber")
                && all[key].hasOwnProperty("gidNumber")
                && all[key].uidNumber > 0
                && all[key].gidNumber === 0
            ) {
                delete all[key];
                users.splice(users.indexOf(key), 1);
            }
        }
    }

    // set gidNumber for default group
    if (default_group && default_group.length > 0) {
        const groups = Object.keys(all)
            .filter(e => all[e].hasOwnProperty("structuralObjectClass") && all[e].structuralObjectClass === "posixGroup" && default_group.includes(all[e].cn.toLowerCase()))
            .sort((a, b) => default_group.indexOf(all[a].cn.toLowerCase()) - default_group.indexOf(all[b].cn.toLowerCase()));

        for (let key of users) {
            const firstGroupInMemberOf = groups.find(group => all[key].memberOf.includes(group));
            if (firstGroupInMemberOf) {
                all[key].gidNumber = all[firstGroupInMemberOf].gidNumber;
            }
        }
    }
    return all;
};

module.exports = customizer;