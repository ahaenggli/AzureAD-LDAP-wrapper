'use strict';

const config = require('./config');
const helper = require('./helper');
const encode = require('hashcode').hashCode;
const customizer = require('./customizer');
const fetch = require('./graph.fetch');

const database = {};

/**
 * contains the in-memory database for the LDAP server
 */
let dbEntries = {};
const schemaEntries = {
    "objectClass": ["top", "subentry", "subschema", "extensibleObject"],
    "cn": "subschema",
    "structuralObjectClass": "subentry",
    "entryDN": "cn=subschema",
    "createTimestamp": "20220301211408Z",
    "modifyTimestamp": "20220301211408Z",
    "subschemaSubentry": "cn=subschema",
    // source: https://www.iana.org/assignments/ldap-parameters/ldap-parameters.xhtml#ldap-parameters-8
    // schemaDB["ldapSyntaxes"] = helper.ReadCSVfile('./schema/ldapSyntaxes.csv', function (row) { return '(' + row[0] + ' DESC ' + row[1] + ')'; });
    // source: extraced via ./schema/ldap_seacher.ps1
    "ldapSyntaxes": helper.ReadCSVfile('./schema/ldapSyntaxes.csv', row => row.join(",")),
    "matchingRules": helper.ReadCSVfile('./schema/matchingRules.csv', row => row.join(",")),
    "matchingRuleUse": helper.ReadCSVfile('./schema/matchingRuleUse.csv', row => row.join(",")),
    "attributeTypes": helper.ReadCSVfile('./schema/attributeTypes.csv', row => row.join(",")),
    "objectClasses": helper.ReadCSVfile('./schema/objectClasses.csv', row => row.join(",")),
};

/**
 * timestamp last refresh of in-memory database entries
 */
let lastRefresh = 0;
/**
 * interval in ms to refresh the in-memory database entries
 */
const refreshInterval = config.LDAP_SYNC_TIME /*minutes*/ * 60 * 1000;


const { clean: cleanSpecialChars } = require('diacritic');
function removeSpecialChars(str) {
    // A–Z a-z 0–9 ' . - _ ! # ^ ~
    return cleanSpecialChars(str).replace(/[^A-Za-z0-9._\s]+/g, '-');
}
database.removeSpecialChars = removeSpecialChars;

/**
 * Converts GUID from azure to byte array
 * used to calculate a SID from GUID
 * @param {string} guid 
 * @returns {array} byte array of guid
 */
function guidToBytes(guid) {
    const bytes = [];
    const parts = guid.split('-');

    for (let i = 0; i < parts.length; i++) {
        const bytesInChar = i < 3 ? parts[i].match(/.{1,2}/g).reverse() : parts[i].match(/.{1,2}/g);
        for (let j = 0; j < bytesInChar.length; j++) {
            bytes.push(parseInt(bytesInChar[j], 16));
        }
    }

    return bytes;
}
database.guidToBytes = guidToBytes;

/**
 * Generate SIDs for the LDAP entries
 * @param {number} 
 * undefined: use hash for SID
 * false: use hash*2+1001 (always odd) for groups
 * false: use hash*2+1000 (always even) for users
 * true: use existing objectId for groups
 * true: use existing objectId for users
 * @param {number} level 0 = groups; 1 = users;
 * @param {*} smbaSIDbase 
 * @param {*} hash 
 * @param {*} objectId 
 * @returns {string} SID for user or group
 */
function generateSID(modus, level, smbaSIDbase, hash, objectId) {
    let sid;

    if (!modus) {
        const suffix = level === 0 ? hash * 2 + 1001 : hash * 2 + 1000;
        sid = `${smbaSIDbase}-${suffix}`;
    } else {
        // use existing SID for groups
        if (level === 0) sid = objectId;
        else {
            const bytes = guidToBytes(objectId);
            const d = new Uint32Array(4);

            for (let i = 0, len = d.length; i < len; i++) {
                let data = bytes.slice(4 * i, 4 * i + 4);
                let u8 = new Uint8Array(data); // original array
                let u32bytes = u8.buffer.slice(-4); // last four bytes as a new `ArrayBuffer`
                d[i] = new Uint32Array(u32bytes)[0];
            }

            sid = `S-1-12-1-${d.join('-')}`;
        }
    }
    return sid;
}
database.generateSID = generateSID;

/**
 * Renames an entry in the database with a given UUID to a new key name,
 * if the entry was previously named differently.
 *
 * @param {Object} db - The database object.
 * @param {string} UUID - The UUID of the entry to be renamed.
 * @param {string} newEntryDN - The new key name for the renamed entry.
 */
function renameEntryByUUID(db, UUID, newEntryDN) {
    let mergeBASEDN = Object.values(db).find(g => g.entryUUID === UUID && g.entryDN != newEntryDN);
    if (mergeBASEDN) {
        db[newEntryDN] = mergeBASEDN;
        delete db[db[newEntryDN].entryDN];
    }
}
database.renameEntryByUUID = renameEntryByUUID;

/**
 * Create and/or merge the root LDAP entry for BASEDN (domain)
 * @param {Object} db existing db to merge
 */
function mergeDnBase(db) {

    renameEntryByUUID(db, 'e927be8d-aab8-42f2-80c3-b2762415aed1', config.LDAP_BASEDN);

    db[config.LDAP_BASEDN] = {
        // default values     
        "objectClass": "domain",
        "dc": config.LDAP_BASEDN.replace('dc=', '').split(",")[0],
        "entryDN": config.LDAP_BASEDN,
        "entryUUID": "e927be8d-aab8-42f2-80c3-b2762415aed1",
        "namingContexts": config.LDAP_BASEDN,
        "structuralObjectClass": "domain",
        "hasSubordinates": "TRUE",
        "subschemaSubentry": "cn=subschema",
        "entryCSN": helper.ldap_now() + ".000000Z#000000#000#000000",
        "modifyTimestamp": helper.ldap_now() + "Z",
        "createTimestamp": helper.ldap_now() + "Z",

        // merge existing values
        ...db[config.LDAP_BASEDN],

        // overwrite values from before        
        "objectClass": "domain",
        "dc": config.LDAP_BASEDN.replace('dc=', '').split(",")[0],
        "entryDN": config.LDAP_BASEDN,
        "entryUUID": "e927be8d-aab8-42f2-80c3-b2762415aed1",
        "namingContexts": config.LDAP_BASEDN,
        "structuralObjectClass": "domain",
        "hasSubordinates": "TRUE",
        "subschemaSubentry": "cn=subschema",
        "entryCSN": helper.ldap_now() + ".000000Z#000000#000#000000",
        "modifyTimestamp": helper.ldap_now() + "Z",
    };
}


/**
 * Create and/or merge the LDAP entry for sambaDomainName
 * @param {Object} db existing db to merge
 */
function mergeDnSambaDomainName(db) {

    var sambaDomainName = config.LDAP_SAMBADOMAINNAME;
    var LDAP_SAMBA = "sambaDomainName=" + sambaDomainName + "," + config.LDAP_BASEDN;
    LDAP_SAMBA = LDAP_SAMBA.toLowerCase();

    renameEntryByUUID(db, '1af6e064-8a89-4ea0-853b-c5476a50877f', LDAP_SAMBA);

    db[LDAP_SAMBA] = {
        // default values
        "objectclass": "sambaDomain",
        "sambaDomainName": sambaDomainName.toUpperCase(), /* must be uppercase */
        "sambaLogonToChgPwd": 0,
        "sambaLockoutObservationWindow": 30,
        "sambaMaxPwdAge": -1,
        "sambaRefuseMachinePwdChange": 0,
        "sambaLockoutThreshold": 0,
        "sambaMinPwdAge": 0,
        "sambaForceLogoff": -1,
        "sambaLockoutDuration": 30,
        "sambaSID": config.LDAP_SAMBASIDBASE,
        "sambaPwdHistoryLength": 0,
        "sambaMinPwdLength": 1,
        "structuralObjectClass": "sambaDomain",
        "entryUUID": "1af6e064-8a89-4ea0-853b-c5476a50877f",
        "entryDN": LDAP_SAMBA,
        "createTimestamp": helper.ldap_now() + "Z",
        "entryCSN": helper.ldap_now() + ".000000Z#000000#000#000000",
        "modifyTimestamp": helper.ldap_now() + "Z",

        // merge existing values
        ...db[LDAP_SAMBA],

        // overwrite values from before
        "sambaDomainName": sambaDomainName.toUpperCase(), /* must be uppercase */
        "entryDN": LDAP_SAMBA,
        "sambaSID": config.LDAP_SAMBASIDBASE,
        "entryCSN": helper.ldap_now() + ".000000Z#000000#000#000000",
        "modifyTimestamp": helper.ldap_now() + "Z",
    };

}

/**
 * Create and/or merge the LDAP entry for Users
 * @param {Object} db existing db to merge
 */
function mergeDnUsers(db) {

    renameEntryByUUID(db, '3e01f47d-96a1-4cb4-803f-7dd17991c6bd', config.LDAP_USERSDN);

    db[config.LDAP_USERSDN] = {
        // default values
        "objectClass": "organizationalRole",
        "cn": config.LDAP_USERSDN.replace("," + config.LDAP_BASEDN, '').replace('cn=', ''),
        "entryDN": config.LDAP_USERSDN,
        "entryUUID": "3e01f47d-96a1-4cb4-803f-7dd17991c6bd",
        "structuralObjectClass": "organizationalRole",
        "hasSubordinates": "TRUE",
        "subschemaSubentry": "cn=subschema",
        "createTimestamp": helper.ldap_now() + "Z",
        "entryCSN": helper.ldap_now() + ".000000Z#000000#000#000000",
        "modifyTimestamp": helper.ldap_now() + "Z",

        // merge existing values
        ...db[config.LDAP_USERSDN],

        // overwrite values from before
        "cn": config.LDAP_USERSDN.replace("," + config.LDAP_BASEDN, '').replace('cn=', ''),
        "entryDN": config.LDAP_USERSDN,
        "entryCSN": helper.ldap_now() + ".000000Z#000000#000#000000",
        "modifyTimestamp": helper.ldap_now() + "Z",
    };
}

/**
 * Create and/or merge the LDAP entry for Groups
 * @param {Object} db existing db to merge
 */
function mergeDnGroups(db) {

    renameEntryByUUID(db, '39af84ac-8e5a-483e-9621-e657385b07b5', config.LDAP_GROUPSDN);

    db[config.LDAP_GROUPSDN] = {
        // default values
        "cn": config.LDAP_GROUPSDN.replace("," + config.LDAP_BASEDN, '').replace('cn=', ''),
        "entryDN": config.LDAP_GROUPSDN,
        "objectClass": "organizationalRole",
        "entryUUID": "39af84ac-8e5a-483e-9621-e657385b07b5",
        "structuralObjectClass": "organizationalRole",
        "hasSubordinates": "TRUE",
        "subschemaSubentry": "cn=subschema",
        "createTimestamp": helper.ldap_now() + "Z",
        "entryCSN": helper.ldap_now() + ".000000Z#000000#000#000000",
        "modifyTimestamp": helper.ldap_now() + "Z",

        // merge existing values
        ...db[config.LDAP_GROUPSDN],

        // overwrite values from before
        "cn": config.LDAP_GROUPSDN.replace("," + config.LDAP_BASEDN, '').replace('cn=', ''),
        "entryDN": config.LDAP_GROUPSDN,
        "entryCSN": helper.ldap_now() + ".000000Z#000000#000#000000",
        "modifyTimestamp": helper.ldap_now() + "Z",
    };
}

/**
 * Create and/or merge the LDAP entry for the default group of all users
 * @param {Object} db existing db to merge
 */
function mergeDnUserDefaultGroup(db) {

    renameEntryByUUID(db, '938f7407-8e5a-48e9-a852-d862fa3bb1bc', config.LDAP_USERSGROUPSBASEDN);

    var usersGroupDn_hash = (db[config.LDAP_USERSGROUPSBASEDN]
        && db[config.LDAP_USERSGROUPSBASEDN].hasOwnProperty('gidNumber')) ? (db[config.LDAP_USERSGROUPSBASEDN].gidNumber.toString()) : Math.abs(encode().value(config.LDAP_USERSGROUPSBASEDN)).toString();

    db[config.LDAP_USERSGROUPSBASEDN] = {
        // default values
        "objectClass": [
            "top",
            "posixGroup",
            "extensibleObject",
            "apple-group",
            "sambaGroupMapping",
            "sambaIdmapEntry"
        ],
        "cn": config.LDAP_USERSGROUPSBASEDN.replace("," + config.LDAP_GROUPSDN, '').replace('cn=', ""),
        "description": "Users default group",
        "displayName": config.LDAP_USERSGROUPSBASEDN.replace("," + config.LDAP_GROUPSDN, '').replace('cn=', ""),
        "entryDN": config.LDAP_USERSGROUPSBASEDN,
        "entryUUID": "938f7407-8e5a-48e9-a852-d862fa3bb1bc",
        "apple-generateduid": "938f7407-8e5a-48e9-a852-d862fa3bb1bc",
        "gidNumber": usersGroupDn_hash,
        "member": [],
        "memberUid": [],
        "sambaGroupType": 2,
        "sambaSID": generateSID(false, 0, config.LDAP_SAMBASIDBASE, usersGroupDn_hash),
        "structuralObjectClass": "posixGroup",
        "hasSubordinates": "FALSE",
        "subschemaSubentry": "cn=subschema",
        "createTimestamp": helper.ldap_now() + "Z",
        "entryCSN": helper.ldap_now() + ".000000Z#000000#000#000000",
        "modifyTimestamp": helper.ldap_now() + "Z",

        // merge existing values
        ...db[config.LDAP_USERSGROUPSBASEDN],

        // overwrite values from before
        "cn": config.LDAP_USERSGROUPSBASEDN.replace("," + config.LDAP_GROUPSDN, '').replace('cn=', ""),
        "entryDN": config.LDAP_USERSGROUPSBASEDN,
        "displayName": config.LDAP_USERSGROUPSBASEDN.replace("," + config.LDAP_GROUPSDN, '').replace('cn=', ""),
        "member": [],
        "memberUid": [],
        "sambaSID": generateSID(false, 0, config.LDAP_SAMBASIDBASE, usersGroupDn_hash),
        "entryCSN": helper.ldap_now() + ".000000Z#000000#000#000000",
        "modifyTimestamp": helper.ldap_now() + "Z",
    };

    db[config.LDAP_USERSGROUPSBASEDN] = customizer.ModifyLDAPGroup(db[config.LDAP_USERSGROUPSBASEDN], {});
}

/**
 * Create and/or merge the LDAP entry for Users
 * @param {Object} db existing db to merge
 */
function cleanUpOldEntries(db, compDate) {
    if (config.LDAP_DAYSTOKEEPDELETEDUSERS >= 0) {
        for (const [key, value] of Object.entries(db)) {
            if (value.hasOwnProperty('sAMAccountName') && (!value.hasOwnProperty('modifyTimestamp') ||
                (value.hasOwnProperty('modifyTimestamp') && helper.ldap_now_2_date(value.modifyTimestamp) < compDate))) {
                helper.forceLog('database.js', 'cleanUpOldEntries', 'deleted user:', { entryDN: value.entryDN, modifyTimestamp: helper.ldap_now_2_date(value.modifyTimestamp), compDate: compDate });
                delete db[key];
            } else if (value.hasOwnProperty('sambaGroupType') && (!value.hasOwnProperty('modifyTimestamp') ||
                (value.hasOwnProperty('modifyTimestamp') && helper.ldap_now_2_date(value.modifyTimestamp) < compDate))) {
                helper.forceLog('database.js', 'cleanUpOldEntries', 'deleted group:', { entryDN: value.entryDN, modifyTimestamp: helper.ldap_now_2_date(value.modifyTimestamp), compDate: compDate });
                delete db[key];
            }
        }
    }
}


/**
 * refresh database entries
 * - clear dbEntries
 * - refresh data from azure via graph-API
 * - save entries from static file
 * - add static schema
 */
async function refreshDBentries() {
    if (Date.now() > lastRefresh + refreshInterval) {
        helper.log("database.js", "refreshDBentries", "refresh dbEntries()");

        // init newDbEntries from file or empty
        let newDbEntries = helper.ReadJSONfile(config.LDAP_DATAFILE);

        // Compare date to remove users/groups in the wrapper if they were deleted in azure.
        // It is set at the beginning of the function so that values added later have a more recent date.
        let compDate = helper.ldap_now_2_date(helper.ldap_now(-1 * config.LDAP_DAYSTOKEEPDELETEDUSERS));

        // add required basic entries
        if (config.VARS_VALIDATED) {
            mergeDnBase(newDbEntries); // domain        
            mergeDnSambaDomainName(newDbEntries); // samba
            mergeDnUsers(newDbEntries); // users
            mergeDnGroups(newDbEntries); // groups
            mergeDnUserDefaultGroup(newDbEntries); // default group for all users
            await mergeAzureEntries(newDbEntries);  // load and append users and groups from azure
        }

        cleanUpOldEntries(newDbEntries, compDate);

        // save the data file
        newDbEntries = customizer.ModifyLDAPGlobal(newDbEntries);
        helper.SaveJSONtoFile(newDbEntries, config.LDAP_DATAFILE);
        helper.log("database.js", "refreshDBentries", "end");

        // overwrite dbEntries with newDbEntries
        dbEntries = newDbEntries;
        lastRefresh = Date.now();
    }
}

/**
 * Create and/or merge the LDAP entries for Azure Groups
 * @param {Object} db existing db to merge
 */
async function mergeAzureGroupEntries(db) {

    const groups = await fetch.getGroups();

    if (groups.length > 0) {
        helper.SaveJSONtoFile(groups, './.cache/groups.json');
        helper.log("database.js", "groups.json saved.");
    }

    db['tmp_user_to_groups'] = [];
    db['tmp_nested_groups'] = [];

    for (let i = 0, len = groups.length; i < len; i++) {
        let group = groups[i];
        let groupDisplayName = group.displayName; //.replace(/\s/g, '');
        let groupDisplayNameClean = removeSpecialChars(groupDisplayName);

        if (groupDisplayName !== groupDisplayNameClean) {
            helper.warn("database.js", 'group names may not contain any special chars. We are using ', groupDisplayNameClean, 'instead of', groupDisplayName);
        }

        let gpName = "cn=" + groupDisplayNameClean + "," + config.LDAP_GROUPSDN;
        gpName = gpName.toLowerCase();

        renameEntryByUUID(db, group.id, gpName);

        let group_hash = (db[gpName] && db[gpName].hasOwnProperty('gidNumber')) ? (db[gpName].gidNumber.toString()) : Math.abs(encode().value(group.id)).toString();

        db[gpName] = {
            // default values
            "objectClass": [
                "top",
                "posixGroup",
                "extensibleObject",
                "apple-group",
                "sambaGroupMapping",
                "sambaIdmapEntry"
            ],
            "cn": groupDisplayNameClean.toLowerCase(),
            "description": (group.description || ""),
            "displayName": groupDisplayName,
            "entryDN": gpName,
            "entryUUID": group.id,
            "apple-generateduid": group.id,
            "gidNumber": group_hash,
            "member": [],
            "memberUid": [],
            "sambaGroupType": 2,
            // "sambaSID": group.securityIdentifier,
            "sambaSID": generateSID(config.LDAP_SAMBA_USEAZURESID, 0, config.LDAP_SAMBASIDBASE, group_hash, group.securityIdentifier),
            "structuralObjectClass": "posixGroup",
            "hasSubordinates": "FALSE",
            "subschemaSubentry": "cn=subschema",
            "createTimestamp": helper.ldap_now() + "Z",
            "entryCSN": helper.ldap_now() + ".000000Z#000000#000#000000",
            "modifyTimestamp": helper.ldap_now() + "Z",

            // merge existing values
            ...db[gpName],

            // overwrite values from before
            "cn": groupDisplayNameClean.toLowerCase(),
            "entryDN": gpName,
            "member": [],
            "memberUid": [],
            "displayName": groupDisplayName,
            "description": (group.description || ""),
            "sambaSID": generateSID(config.LDAP_SAMBA_USEAZURESID, 0, config.LDAP_SAMBASIDBASE, group_hash, group.securityIdentifier),
            "entryCSN": helper.ldap_now() + ".000000Z#000000#000#000000",
            "modifyTimestamp": helper.ldap_now() + "Z",
        };

        db[gpName] = customizer.ModifyLDAPGroup(db[gpName], group);

        helper.log("database.js", "try fetching the members for group: ", group.displayName);
        const members = await fetch.getMembers(group); // await graph_azure.callApi(graph_azure.apiConfig.mri, graph_azureResponse.accessToken, { id: group.id });

        if (members.length > 0) {
            // members.sort((a, b) => a.userPrincipalName.localeCompare(b.userPrincipalName));
            helper.SaveJSONtoFile(members, './.cache/members_' + groupDisplayName + '.json');
            helper.log("database.js", 'members_' + groupDisplayName + '.json' + " saved.");
        }

        for (let t = 0, tlen = members.length; t < tlen; t++) {
            let member = members[t];
            if (member['@odata.type'] == '#microsoft.graph.user') {
                db['tmp_user_to_groups'][member.id] = db['tmp_user_to_groups'][member.id] || [];
                db['tmp_user_to_groups'][member.id].push(gpName);
            }
            if (member['@odata.type'] == '#microsoft.graph.group') {
                db['tmp_nested_groups'][member.id] = db['tmp_nested_groups'][member.id] || [];
                db['tmp_nested_groups'][member.id].push(gpName);
            }
        }
    }

    for (let i = 0, len = groups.length; i < len; i++) {
        let group = groups[i];
        if (db['tmp_nested_groups'][group.id]) {
            for (let j = 0, jlen = db['tmp_nested_groups'][group.id].length; j < jlen; j++) {
                let g = db['tmp_nested_groups'][group.id][j];
                let gpName = Object.values(db).find(g => g.entryUUID === group.id && g.objectClass.includes('posixGroup')).entryDN;
                if (gpName && g !== gpName) { db[g].member.push(gpName); }
            }
        }
    }

    delete db['tmp_nested_groups'];
}

/**
 * Create and/or merge the LDAP entries for Azure Users
 * @param {Object} db existing db to merge
 */
async function mergeAzureUserEntries(db) {

    helper.log("database.js", "mergeAzureUserEntries", "try fetching the users");
    const users = await fetch.getUsers(); // await graph_azure.callApi(graph_azure.apiConfig.uri, graph_azureResponse.accessToken);

    if (users.length > 0) {
        // users.sort((a, b) => a.userPrincipalName.localeCompare(b.userPrincipalName));
        helper.SaveJSONtoFile(users, './.cache/users.json');
        helper.log("database.js", 'users.json' + " saved.");
    }

    for (let i = 0, len = users.length; i < len; i++) {
        let user = users[i];
        let userPrincipalName = user.userPrincipalName;
        let AzureADuserExternal = 0;

        let isGuestOrExternalUser = (user.userType == "Guest") || user.identities.filter(x => x.hasOwnProperty('issuer') && x.issuer == 'ExternalAzureAD').length > 0;
        let isExternalUserStateAccepted = (user.externalUserState == "Accepted");
        let isMicrosoftAccount = (isGuestOrExternalUser && user.hasOwnProperty('identities') &&
            user.identities.filter(x => x.hasOwnProperty('issuer') && x.issuer == 'ExternalAzureAD')
                .length == 0);

        // guest has not joined (yet) - so we cannot know if the user has a login for MicrosoftAccount or ExternalAzureAD 
        if (isGuestOrExternalUser && !isExternalUserStateAccepted) {
            helper.warn("database.js", "mergeAzureUserEntries", 'Guest user (#EXT#) has not yet accepted invitation',
                {
                    mail: user.mail,
                    userPrincipalName: user.userPrincipalName,
                    info: 'RPOC is not possible for Guest usery without accepted invitation'
                });
        }
        // ignore personal microsoft accounts, because RPOC is not possible 
        else if (isMicrosoftAccount) {
            helper.warn("database.js", "mergeAzureUserEntries", 'Guest user (#EXT#) ignored',
                {
                    mail: user.mail,
                    userPrincipalName: user.userPrincipalName,
                    info: 'RPOC is not possible for personal microsoft accounts'
                });
        }
        else {

            // try handling "#EXT#"-user
            if (isGuestOrExternalUser && user.hasOwnProperty('mail')) {
                let old_userPrincipalName = user.userPrincipalName;
                user.userPrincipalName = user.mail;
                if (userPrincipalName.indexOf("#EXT#") > -1) {
                    userPrincipalName = userPrincipalName.substring(0, userPrincipalName.indexOf("#EXT#"));
                } else {

                    let issuers = user.identities.filter(x => x.hasOwnProperty('issuer') && x.signInType == 'userPrincipalName');
                    issuers.forEach(issuer => userPrincipalName = userPrincipalName.replace('@' + issuer.issuer, ''));
                    userPrincipalName = userPrincipalName.replace('#EXT#', '');
                }

                AzureADuserExternal = 1;

                helper.log("database.js", "mergeAzureUserEntries", '#EXT#-user special treatment',
                    {
                        old_userPrincipalName: old_userPrincipalName,
                        new_userPrincipalName: user.mail,
                        AzureADuserExternal: 1,
                        upn: userPrincipalName,
                        info: 'userPrincipalName overwritten'
                    });
            }

            userPrincipalName = userPrincipalName.replace("@" + config.LDAP_DOMAIN, '');
            if (userPrincipalName.indexOf("@") > -1) {
                userPrincipalName = userPrincipalName.substring(0, userPrincipalName.indexOf("@"));
            }

            let userPrincipalNameClean = removeSpecialChars(userPrincipalName);
            if (userPrincipalName !== userPrincipalNameClean) {
                helper.warn("database.js", "mergeAzureUserEntries", 'userPrincipalNames may not contain any special chars. In a future version we are maybe using ', userPrincipalNameClean, 'instead of', userPrincipalName);
                // userPrincipalName = userPrincipalNameClean;
            }


            userPrincipalName = helper.escapeLDAPspecialChars(userPrincipalName);

            let upName = config.LDAP_USERRDN + "=" + userPrincipalName + "," + config.LDAP_USERSDN;
            upName = upName.toLowerCase();

            renameEntryByUUID(db, user.id, upName);

            let user_hash = (db[upName] && db[upName].hasOwnProperty('uidNumber')) ? (db[upName].uidNumber.toString()) : Math.abs(encode().value(user.id)).toString();
            let sambaNTPassword = (db[upName] && db[upName].hasOwnProperty('sambaNTPassword')) ? db[upName].sambaNTPassword : "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
            let sambaPwdLastSet = (db[upName] && db[upName].hasOwnProperty('sambaPwdLastSet')) ? db[upName].sambaPwdLastSet : 0;

            if (typeof db['tmp_user_to_groups'][user.id] === 'undefined' || !db['tmp_user_to_groups'][user.id]) {
                helper.log("database.js", "no groups found for user", upName);
                db['tmp_user_to_groups'][user.id] = [];
            }

            // add default `users`-group
            db['tmp_user_to_groups'][user.id].push(config.LDAP_USERSGROUPSBASEDN);           

            for (let j = 0, jlen = db['tmp_user_to_groups'][user.id].length; j < jlen; j++) {
                let g = db['tmp_user_to_groups'][user.id][j];
                db[g].member.push(upName);
                db[g].memberUid.push(userPrincipalName);
            }

            db[upName] = {
                // default values
                "objectClass": [
                    "top",
                    "posixAccount",
                    "shadowAccount",
                    "person",
                    "organizationalPerson",
                    "inetOrgPerson",
                    "apple-user",
                    "sambaSamAccount",
                    "sambaIdmapEntry",
                    "extensibleObject"
                ],
                "apple-generateduid": user.id,
                "authAuthority": ";basic;",
                "cn": userPrincipalName.toLowerCase(),
                "AzureADuserPrincipalName": user.userPrincipalName,
                "AzureADuserExternal": AzureADuserExternal,
                "displayName": user.displayName,
                "entryDN": upName,
                "entryUUID": user.id,
                "gidNumber": db[config.LDAP_USERSGROUPSBASEDN].gidNumber,
                "givenName": user.givenName,
                "homeDirectory": "/home/" + userPrincipalName,
                "loginShell": "/bin/sh",
                "mail": user.mail,
                "memberOf": db['tmp_user_to_groups'][user.id],
                "sambaAcctFlags": "[U          ]",
                "sambaLMPassword": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
                "sambaNTPassword": sambaNTPassword,
                "sambaPasswordHistory": "0000000000000000000000000000000000000000000000000000000000000000",
                "sambaPwdLastSet": sambaPwdLastSet,
                //"sambaSID": "S-1-5-21-" + user_hash + "-" + user_hash + "-" + user_hash,
                "sambaSID": generateSID(config.LDAP_SAMBA_USEAZURESID, 1, config.LDAP_SAMBASIDBASE, user_hash, user.id),
                "sambaPrimaryGroupSID": db[config.LDAP_USERSGROUPSBASEDN].sambaSID,
                "sAMAccountName": userPrincipalName,
                "shadowExpire": -1,
                "shadowFlag": 0,
                "shadowInactive": 0,
                "shadowLastChange": 17399,
                "shadowMax": 99999,
                "shadowMin": 0,
                "shadowWarning": 7,
                "sn": user.surname,
                "uid": userPrincipalName,
                "uidNumber": user_hash,
                "structuralObjectClass": "inetOrgPerson",
                "hasSubordinates": "FALSE",
                "subschemaSubentry": "cn=subschema",
                "createTimestamp": helper.ldap_now() + "Z",
                "entryCSN": helper.ldap_now() + ".000000Z#000000#000#000000",
                "modifyTimestamp": helper.ldap_now() + "Z",

                // merge existing values
                ...db[upName],

                // overwrite values from before
                "cn": userPrincipalName.toLowerCase(),
                "AzureADuserPrincipalName": user.userPrincipalName,
                "AzureADuserExternal": AzureADuserExternal,
                "entryDN": upName,
                "uid": userPrincipalName,
                "displayName": user.displayName,
                "sambaSID": generateSID(config.LDAP_SAMBA_USEAZURESID, 1, config.LDAP_SAMBASIDBASE, user_hash, user.id),
                "sAMAccountName": userPrincipalName,
                "givenName": user.givenName,
                "sn": user.surname,
                "homeDirectory": "/home/" + userPrincipalName,
                "mail": user.mail,
                "memberOf": db['tmp_user_to_groups'][user.id],
                "gidNumber": db[config.LDAP_USERSGROUPSBASEDN].gidNumber,
                "sambaPrimaryGroupSID": db[config.LDAP_USERSGROUPSBASEDN].sambaSID,
                "entryCSN": helper.ldap_now() + ".000000Z#000000#000#000000",
                "modifyTimestamp": helper.ldap_now() + "Z",
            };

            db[upName] = customizer.ModifyLDAPUser(db[upName], user);
        }
    }

    delete db['tmp_user_to_groups'];
}

/**
 * Create and/or merge the LDAP entries for Azure Users and Groups
 * @param {Object} db existing db to merge
 */
async function mergeAzureEntries(db) {
    try {
        await fetch.initAccessToken();
        await mergeAzureGroupEntries(db);
        await mergeAzureUserEntries(db);
    } catch (error) {
        helper.error('database.js', 'mergeAzureEntries', error);
    }
}

/**
 * Initialize database entries
 * refresh entries as configured
 */
database.init = async function (callback) {
    helper.log("database.js", "init database");

    await refreshDBentries();

    callback();

    const interval_func = async function () {
        helper.forceLog("database.js", "every", config.LDAP_SYNC_TIME, "minutes refreshDBentries()");
        await refreshDBentries();
        callback();
    };

    helper.forceLog("database.js", "every", refreshInterval, "ms refreshDBentries()");

    if (refreshInterval > 0)
        return setInterval(interval_func, refreshInterval);
    else return null;
};

/**
 * Returns all database entries
 * @returns {Object} All database entries
 */
database.getEntries = function () { return dbEntries; };

/**
 * Returns all schema entries
 * @returns {Object} All schema entries
 */
database.getSchemaEntries = function () { return schemaEntries; };

// return database
module.exports = database;