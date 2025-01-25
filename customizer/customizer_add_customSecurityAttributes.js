'use strict';

const helper = require('../src/helper');
const config = require('../src/config');
const fs = require('fs');

var customizer = {};

// use beta endpoint to retrieve more data
customizer.modifyGraphApiConfig = function (apiConfig, MS_GRAPH_SCOPE) {
    apiConfig.uri = `${MS_GRAPH_SCOPE}beta/users?$select=businessPhones,displayName,givenName,jobTitle,mail,mobilePhone,officeLocation,preferredLanguage,surname,userPrincipalName,id,identities,userType,externalUserState,customSecurityAttributes${config.GRAPH_FILTER_USERS}`;
    return apiConfig;
};

// check for subarrays in further flatten function
function hasSubArrays(arr) {
    var returni = false;
    //(Array.isArray(ob[i]) && ob[i].length == 1 && 
    for (var i in arr) {
        //if (!arr.hasOwnProperty(i)) continue;
        if ((typeof arr[i]) == 'object' && arr[i] !== null) return true;
    }
    return returni;
}

// convert the json object from azure to a simpler structure
// ignore @odata attributes and skip them
function flattenObjectAndIgnoreOdata(ob) {
    var returni = {};

    for (var i in ob) {
        //if (!ob.hasOwnProperty(i)) continue;
        if (i.indexOf('@odata') > -1) continue;
        // eayh sub multi-array has to be flatten
        // single items or items without deeper items are also okay, so an attribute can hav multiple values         
        if ((typeof ob[i]) == 'object' && ob[i] !== null && hasSubArrays(ob[i])) {
            var flatObject = flattenObjectAndIgnoreOdata(ob[i]);
            for (var x in flatObject) {
                //if (!flatObject.hasOwnProperty(x)) continue;
                //if (x.indexOf('@odata') > -1) continue;

                returni[i + '_' + x] = flatObject[x];
            }
        } else {
            returni[i] = ob[i];
        }
    }
    return returni;
}

// set more attributes form azure
// convert gidNumber and uidNumber from string to int
customizer.ModifyLDAPUser = function (ldapuser, azureuser) {

    /** set more attributes form azure **/
    // optional delete some infos from the fetched azureuser
    if (azureuser.hasOwnProperty("identities")) delete azureuser.identities;

    // append all fetched data to the ldap entry
    var flattendAttributes = flattenObjectAndIgnoreOdata(azureuser);
    // assign first ldapuser so all attributes are there in the correct order
    // then assign flattendAttributes at the end
    // make sure ldapuser attributes were not overwritten by assigning it again
    ldapuser = Object.assign({}, ldapuser, flattendAttributes, ldapuser);

    /** convert gidNumber and uidNumber from string to int **/
    // convert gidNumber from string to int
    if (ldapuser.hasOwnProperty("gidNumber")) {
        let parsed = parseInt(ldapuser.gidNumber);
        if (isNaN(parsed)) parsed = ldapuser.gidNumber;
        ldapuser.gidNumber = parsed;
    }
    // convert uidNumber from string to int
    if (ldapuser.hasOwnProperty("uidNumber")) {
        let parsed = parseInt(ldapuser.uidNumber);
        if (isNaN(parsed)) parsed = ldapuser.uidNumber;
        ldapuser.uidNumber = parsed;
    }

    return ldapuser;
};


// convert gidNumber from string to int
customizer.ModifyLDAPGroup = function (ldapgroup, azuregroup) {
    if (ldapgroup.hasOwnProperty("gidNumber")) {
        let parsed = parseInt(ldapgroup.gidNumber);
        if (isNaN(parsed)) parsed = ldapgroup.gidNumber;
        ldapgroup.gidNumber = parsed;
    }
    return ldapgroup;
};


// append creator and modifier attributes to all entries
customizer.ModifyLDAPGlobal = function (all) {
    let root = "uid=root," + config.LDAP_USERSDN;
    for (var key of Object.keys(all)) {
        //console.log(`${key}= ${value}`);
        all[key].creatorsName = root;
        all[key].createTimestamp = "20220301211408Z";
        all[key].entryCSN = "20220301211408.497736Z#000000#000#000000";
        all[key].modifiersName = root;
        all[key].modifyTimestamp = "20220301211408Z";

        if (all[key].hasOwnProperty("namingContexts")) {
            all[key].contextCSN = "20220301211408.497736Z#000000#000#000000";
        }

        if (all[key].hasOwnProperty("sambaDomainName")) {
            all[key].sambaDomainName = all[key].sambaDomainName.toLowerCase();
        }
    }

    return all;
};

customizer.ModifyAzureGroups = function (azuregroups) { return azuregroups; };
customizer.ModifyAzureUsers = function (azureusers) { return azureusers; };

customizer.ModifyAzureDevices = function (azuredevices) {return azuredevices;};
customizer.ModifyLDAPDevice = function (ldapdevice, azuredevice) { return ldapdevice; };

module.exports = customizer;