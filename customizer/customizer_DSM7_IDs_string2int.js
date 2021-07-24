const config = require('../config');
const helper = require('../helper');

var customizer = {};

// convert gidNumber from string to int
customizer.ModifyLDAPGroup = function (ldapgroup, azuregroup) {
    helper.log("customizer", "ModifyLDAPGroup", "called");
    if(ldapgroup.hasOwnProperty("gidNumber")){
        let parsed = parseInt(ldapgroup.gidNumber);
        if (isNaN(parsed)) parsed = ldapgroup.gidNumber;
        ldapgroup.gidNumber = parsed;
    }
    return ldapgroup;
};

// convert gidNumber from string to int
customizer.ModifyLDAPUser = function (ldapuser, azureuser) {
    helper.log("customizer", "ModifyLDAPUser", "called");
    if(ldapuser.hasOwnProperty("gidNumber")){
        let parsed = parseInt(ldapuser.gidNumber);
        if (isNaN(parsed)) parsed = ldapuser.gidNumber;
        ldapuser.gidNumber = parsed;
    }
    return ldapuser;
};


// customizer.ModifyLDAPUser = function (ldapuser, azureuser) { return ldapuser; };
// customizer.ModifyLDAPGlobal = function (all) { return all; };
// customizer.ModifyAzureUsers  = function (azureusers) { return azureusers; };
// customizer.ModifyAzureGroups = function (azuregroups) { return azuregroups; };

// only users in my domain
/*
customizer.customizeUsers = function (users) {
    return Object.values(users).filter(u => u.hasOwnProperty("givenName") && u.hasOwnProperty("userPrincipalName") && u.givenName != null && u.userPrincipalName.toString().endsWith(config.LDAP_DOMAIN));
};
*/

module.exports = customizer;