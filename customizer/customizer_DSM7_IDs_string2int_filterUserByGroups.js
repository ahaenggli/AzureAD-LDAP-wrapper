/**
 * This module contains customizer functions for modifying LDAP and Azure objects.
 * @module customizer
 * 
 * Modify the following variables to your needs:
 * pets - The list of group names to filter the Azure groups by.
 *        Only users within these groups will be synced.
 */

'use strict';

// keep only users within these groups from Azure
const pets = ['group-b', 'administrators'];

const config = require('../src/config');
const helper = require('../src/helper');

var customizer = {};

/**
 * Modifies the Azure groups by filtering them based on a predefined list of group names.
 * @param {Array} azuregroups - The array of Azure groups.
 * @returns {Array} - The modified array of Azure groups.
 */
customizer.ModifyAzureGroups = function (azuregroups) {
    return azuregroups.filter(group => pets.includes(group.displayName.toLowerCase()));
};

/**
 * Modifies the LDAP group by converting the gidNumber from string to int.
 * @param {Object} ldapgroup - The LDAP group object.
 * @param {Object} azuregroup - The Azure group object.
 * @returns {Object} - The modified LDAP group object.
 */
customizer.ModifyLDAPGroup = function (ldapgroup, azuregroup) {
    helper.log("customizer", "ModifyLDAPGroup", "called");
    if (ldapgroup.hasOwnProperty("gidNumber")) {
        let parsed = parseInt(ldapgroup.gidNumber);
        if (isNaN(parsed)) parsed = ldapgroup.gidNumber;
        ldapgroup.gidNumber = parsed;
    }

    return ldapgroup;
};

/**
 * Modifies the LDAP user by converting the gidNumber and uidNumber from string to int.
 * Sets gidNumber to 0 if the user has no groups.
 * @param {Object} ldapuser - The LDAP user object.
 * @param {Object} azureuser - The Azure user object.
 * @returns {Object} - The modified LDAP user object.
 */
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

    // no groups for user? set gidNumber to 0
    ldapuser.memberOf = ldapuser.memberOf.filter(e => e != config.LDAP_USERSGROUPSBASEDN);
    if (Array.isArray(ldapuser.memberOf) && ldapuser.memberOf.length === 0) ldapuser.gidNumber = 0;

    return ldapuser;
};

/**
 * Modifies the LDAP objects globally by setting default values for certain properties.
 * @param {Object} all - The object containing all LDAP objects.
 * @returns {Object} - The modified object containing all LDAP objects.
 */
customizer.ModifyLDAPGlobal = function (all) {
    let root = "uid=root," + config.LDAP_USERSDN;
    for (var key of Object.keys(all)) {
        all[key].creatorsName = root;

        if (!all[key].hasOwnProperty("createTimestamp"))
            all[key].createTimestamp = helper.ldap_now() + "Z";

        if (!all[key].hasOwnProperty("entryCSN"))
            all[key].entryCSN = helper.ldap_now() + ".000000Z#000000#000#000000";

        all[key].modifiersName = root;

        if (!all[key].hasOwnProperty("modifyTimestamp"))
            all[key].modifyTimestamp = all[key].createTimestamp;

        if (all[key].hasOwnProperty("sambaDomainName")) {
            all[key].sambaDomainName = all[key].sambaDomainName.toLowerCase();
        }

        // only users with gidNumber > 0
        if (all[key].hasOwnProperty("uidNumber")
            && all[key].hasOwnProperty("gidNumber")
            && all[key].uidNumber > 0
            && all[key].gidNumber === 0
        ) {
            delete all[key];
        }
    }

    return all;
};

module.exports = customizer;