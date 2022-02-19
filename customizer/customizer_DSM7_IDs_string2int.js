'use strict';

const config = require('../config');
const helper = require('../helper');

var customizer = {};

// all possible funcitons
// customizer.ModifyLDAPUser    = function (ldapuser, azureuser) { return ldapuser; };
// customizer.ModifyLDAPGroup   = function (ldapgroup, azuregroup) { return ldapgroup; };
// customizer.ModifyLDAPGlobal  = function (all) { return all; };
// customizer.ModifyAzureUsers  = function (azureusers) { return azureusers; };
// customizer.ModifyAzureGroups = function (azuregroups) { return azuregroups; };


// convert gidNumber from string to int
customizer.ModifyLDAPGroup = function (ldapgroup, azuregroup) {
    helper.log("customizer", "ModifyLDAPGroup", "called");
    if (ldapgroup.hasOwnProperty("gidNumber")) {
        let parsed = parseInt(ldapgroup.gidNumber);
        if (isNaN(parsed)) parsed = ldapgroup.gidNumber;
        ldapgroup.gidNumber = parsed;
    }

    //if(ldapgroup.hasOwnProperty("hasSubordinates"))   delete ldapgroup.hasSubordinates;
    //if(ldapgroup.hasOwnProperty("subschemaSubentry")) delete ldapgroup.subschemaSubentry;
    return ldapgroup;
};

// convert gidNumber from string to int
customizer.ModifyLDAPUser = function (ldapuser, azureuser) {
    helper.log("customizer", "ModifyLDAPUser", "called");
    if (ldapuser.hasOwnProperty("gidNumber")) {
        let parsed = parseInt(ldapuser.gidNumber);
        if (isNaN(parsed)) parsed = ldapuser.gidNumber;
        ldapuser.gidNumber = parsed;
    }
    if (ldapuser.hasOwnProperty("uidNumber")) {
        let parsed = parseInt(ldapuser.uidNumber);
        if (isNaN(parsed)) parsed = ldapuser.uidNumber;
        ldapuser.uidNumber = parsed;
    }
    //if(ldapuser.hasOwnProperty("hasSubordinates"))   delete ldapuser.hasSubordinates;
    //if(ldapuser.hasOwnProperty("subschemaSubentry")) delete ldapuser.subschemaSubentry;
    return ldapuser;
};

customizer.ModifyLDAPGlobal = function (all) {
    let root = "uid=root," + config.LDAP_USERSDN;
    for (var key of Object.keys(all)) {
        //console.log(`${key}= ${value}`);
        all[key].creatorsName = root;
        all[key].createTimestamp = "20211018151129Z";
        all[key].entryCSN = "20211018151157.389265Z#000000#000#000000";
        all[key].modifiersName = root;
        all[key].modifyTimestamp = "20211018151129Z";

        if (!all[key].hasOwnProperty("namingContexts")) {
            if (all[key].hasOwnProperty("hasSubordinates")) delete all[key].hasSubordinates;
            if (all[key].hasOwnProperty("subschemaSubentry")) delete all[key].subschemaSubentry;
        } else {
            all[key].contextCSN = "20211018151157.389265Z#000000#000#000000";
        }

        if (all[key].hasOwnProperty("sambaDomainName")) {
            all[key].sambaDomainName = all[key].sambaDomainName.toLowerCase();
        }

    }

    return all;
};

// only users in my domain
/*
customizer.ModifyAzureUsers = function (azureusers) {
    return Object.values(azureusers).filter(u => u.hasOwnProperty("givenName") && u.hasOwnProperty("userPrincipalName") && u.givenName != null && u.userPrincipalName.toString().endsWith(config.LDAP_DOMAIN));
};
*/

module.exports = customizer;