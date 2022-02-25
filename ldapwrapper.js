'use strict';

// read in env settings
const graph_azure = require('./graph_azuread');
const config = require('./config');
const helper = require('./helper');
const fs = require('fs');

const smbaSIDbase = config.LDAP_SAMBASIDBASE;

var diacritic = require('diacritic');

var encode = require('hashcode').hashCode;

var ldapwrapper = {};

function removeSpecialChars(str) {
  return diacritic.clean(str).replace(/[^A-Za-z0-9._\s]+/g, '-');
}

function escapeLDAPspecialChars(str) {
  return str.replace(/[,=+<>#;\\]/g, '\\$&');
}

ldapwrapper.do = async function () {
  helper.log("ldapwrapper.js", "start");

  var db = helper.ReadJSONfile(config.LDAP_DATAFILE);
  //return db;
  if (typeof db === 'undefined' || db === undefined || db === null || !db) db = {};

  try {

    if (!fs.existsSync('./.cache')) {
      helper.log("ldapwrapper.js", "mkdirSync: .cache");
      fs.mkdirSync('./.cache');
    }
    else {
      helper.log("ldapwrapper.js", "mkdirSync: nothing to do");
    }

    var customizer = {};
    if (config.DSM7 && fs.existsSync('./customizer/customizer_DSM7_IDs_string2int.js')) {
      customizer = require('./customizer/customizer_DSM7_IDs_string2int');
    }
    if (fs.existsSync('./customizer/ldap_customizer.js')) {
      customizer = require('./customizer/ldap_customizer');
    }
    if (typeof customizer.ModifyLDAPUser === "undefined") customizer.ModifyLDAPUser = function (ldapuser, azureuser) { return ldapuser; };
    if (typeof customizer.ModifyLDAPGroup === "undefined") customizer.ModifyLDAPGroup = function (ldapgroup, azuregroup) { return ldapgroup; };
    if (typeof customizer.ModifyLDAPGlobal === "undefined") customizer.ModifyLDAPGlobal = function (all) { return all; };
    if (typeof customizer.ModifyAzureUsers === "undefined") customizer.ModifyAzureUsers = function (azureusers) { return azureusers; };
    if (typeof customizer.ModifyAzureGroups === "undefined") customizer.ModifyAzureGroups = function (azuregroups) { return azuregroups; };

    const graph_azureResponse = await graph_azure.getToken(graph_azure.tokenRequest);
    if (!graph_azureResponse) helper.error("ldapwrapper.js", "graph_azureResponse missing");

    //var domains = [];
    //domains = await graph_azure.callApi(graph_azure.apiConfig.dri, graph_azureResponse.accessToken);

    let mergeBASEDN = Object.values(db).filter(g => g.entryUUID == 'e927be8d-aab8-42f2-80c3-b2762415aed1' && g.entryDN != config.LDAP_BASEDN);
    if (mergeBASEDN.length == 1) {
      db[config.LDAP_BASEDN] = mergeBASEDN[0];
      delete db[db[config.LDAP_BASEDN].entryDN];
    }

    db[config.LDAP_BASEDN] = Object.assign({},
      // merge existing values
      db[config.LDAP_BASEDN],
      // overwrite values from before
      {
        "objectClass": ["domain", "top", "ldapRootDSE", "subEntry"],
        "dc": config.LDAP_BASEDN.replace('dc=', '').split(",")[0],
        "entryDN": config.LDAP_BASEDN,
        "entryUUID": "e927be8d-aab8-42f2-80c3-b2762415aed1",
        "namingContexts": config.LDAP_BASEDN,
        "structuralObjectClass": "domain",
        "hasSubordinates": "TRUE",
        "subSchemaSubentry": "cn=subschema",
      });

    var sambaDomainName = config.LDAP_SAMBADOMAINNAME;
    var LDAP_SAMBA = "sambaDomainName=" + sambaDomainName + "," + config.LDAP_BASEDN;
    LDAP_SAMBA = LDAP_SAMBA.toLowerCase();

    let mergeSambaDN = Object.values(db).filter(g => g.entryUUID == '1af6e064-8a89-4ea0-853b-c5476a50877f' && g.entryDN != LDAP_SAMBA);
    if (mergeSambaDN.length == 1) {
      db[LDAP_SAMBA] = mergeSambaDN[0];
      delete db[db[LDAP_SAMBA].entryDN];
    }

    db[LDAP_SAMBA] = Object.assign({},
      // default values
      {
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
        "sambaSID": smbaSIDbase,
        "sambaPwdHistoryLength": 0,
        "sambaMinPwdLength": 1,
        "structuralObjectClass": "sambaDomain",
        "entryUUID": "1af6e064-8a89-4ea0-853b-c5476a50877f",
        "entryDN": LDAP_SAMBA,
      },
      // merge existing values
      db[LDAP_SAMBA],
      // overwrite values from before
      {
        "sambaDomainName": sambaDomainName.toUpperCase(), /* must be uppercase */
        "entryDN": LDAP_SAMBA,
        "sambaSID": smbaSIDbase,
      }
    );

    let mergeUSERSDN = Object.values(db).filter(g => g.entryUUID == '3e01f47d-96a1-4cb4-803f-7dd17991c6bd' && g.entryDN != config.LDAP_USERSDN);
    if (mergeUSERSDN.length == 1) {
      db[config.LDAP_USERSDN] = mergeUSERSDN[0];
      delete db[db[config.LDAP_USERSDN].entryDN];
    }

    db[config.LDAP_USERSDN] = Object.assign({},
      // default values
      {
        "objectClass": "organizationalRole",
        "cn": config.LDAP_USERSDN.replace("," + config.LDAP_BASEDN, '').replace('cn=', ''),
        "entryDN": config.LDAP_USERSDN,
        "entryUUID": "3e01f47d-96a1-4cb4-803f-7dd17991c6bd",
        "structuralObjectClass": "organizationalRole",
        "hasSubordinates": "TRUE",
        "subSchemaSubentry": "cn=subschema",
      },
      // merge existing values
      db[config.LDAP_USERSDN],
      // overwrite values from before
      {
        "cn": config.LDAP_USERSDN.replace("," + config.LDAP_BASEDN, '').replace('cn=', ''),
        "entryDN": config.LDAP_USERSDN,
      });

    let mergeGROUPSDN = Object.values(db).filter(g => g.entryUUID == '39af84ac-8e5a-483e-9621-e657385b07b5' && g.entryDN != config.LDAP_GROUPSDN);
    if (mergeGROUPSDN.length == 1) {
      db[config.LDAP_GROUPSDN] = mergeGROUPSDN[0];
      delete db[db[config.LDAP_GROUPSDN].entryDN];
    }

    db[config.LDAP_GROUPSDN] = Object.assign({},
      // default values
      {
        "cn": config.LDAP_GROUPSDN.replace("," + config.LDAP_BASEDN, '').replace('cn=', ''),
        "entryDN": config.LDAP_GROUPSDN,
        "objectClass": "organizationalRole",
        "entryUUID": "39af84ac-8e5a-483e-9621-e657385b07b5",
        "structuralObjectClass": "organizationalRole",
        "hasSubordinates": "TRUE",
        "subSchemaSubentry": "cn=subschema",
      },
      // merge existing values
      db[config.LDAP_GROUPSDN],
      // overwrite values from before
      {
        "cn": config.LDAP_GROUPSDN.replace("," + config.LDAP_BASEDN, '').replace('cn=', ''),
        "entryDN": config.LDAP_GROUPSDN,
      });

    var usersGroupDn_hash = Math.abs(encode().value(config.LDAP_USERSGROUPSBASEDN)).toString();

    let mergeUSERSGROUPSBASEDN = Object.values(db).filter(g => g.entryUUID == '938f7407-8e5a-48e9-a852-d862fa3bb1bc' && g.entryDN != config.LDAP_USERSGROUPSBASEDN);
    if (mergeUSERSGROUPSBASEDN.length == 1) {
      db[config.LDAP_USERSGROUPSBASEDN] = mergeUSERSGROUPSBASEDN[0];
      delete db[db[config.LDAP_USERSGROUPSBASEDN].entryDN];
    }

    if (db[config.LDAP_USERSGROUPSBASEDN] && db[config.LDAP_USERSGROUPSBASEDN].hasOwnProperty('gidNumber')) usersGroupDn_hash = (db[config.LDAP_USERSGROUPSBASEDN].gidNumber.toString());

    db[config.LDAP_USERSGROUPSBASEDN] = Object.assign({},
      // default values
      {
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
        //"sambaSID": "S-1-5-21-" + usersGroupDn_hash + "-" + usersGroupDn_hash + "-" + usersGroupDn_hash,
        "sambaSID": smbaSIDbase + "-" + (usersGroupDn_hash * 2 + 1001),
        "structuralObjectClass": "posixGroup",
        "hasSubordinates": "FALSE",
        "subSchemaSubentry": "cn=subschema"
      },
      // merge existing values
      db[config.LDAP_USERSGROUPSBASEDN],
      // overwrite values from before
      {
        "cn": config.LDAP_USERSGROUPSBASEDN.replace("," + config.LDAP_GROUPSDN, '').replace('cn=', ""),
        "entryDN": config.LDAP_USERSGROUPSBASEDN,
        "displayName": config.LDAP_USERSGROUPSBASEDN.replace("," + config.LDAP_GROUPSDN, '').replace('cn=', ""),
        "member": [],
        "memberUid": [],
        "sambaSID": smbaSIDbase + "-" + (usersGroupDn_hash * 2 + 1001),
      });

    db[config.LDAP_USERSGROUPSBASEDN] = customizer.ModifyLDAPGroup(db[config.LDAP_USERSGROUPSBASEDN], {});

    helper.log("ldapwrapper.js", "try fetching the groups");
    var groups = [];
    groups = await graph_azure.callApi(graph_azure.apiConfig.gri, graph_azureResponse.accessToken);
    if (typeof groups === 'undefined' || !groups) {
      helper.warn("ldapwrapper.js", "no groups found");
      groups = [];
    }
    else {
      helper.SaveJSONtoFile(groups, './.cache/groups.json');
      helper.log("ldapwrapper.js", "groups.json saved.");
    }

    groups = customizer.ModifyAzureGroups(groups);
    var user_to_groups = [];

    for (let i = 0, len = groups.length; i < len; i++) {
      let group = groups[i];
      let groupDisplayName = group.displayName; //.replace(/\s/g, '');
      let groupDisplayNameClean = removeSpecialChars(groupDisplayName);

      if (groupDisplayName !== groupDisplayNameClean) {
        helper.warn("ldapwrapper.js", 'group names may not contain any special chars. We are using ', groupDisplayNameClean, 'instead of', groupDisplayName);
        groupDisplayName = groupDisplayNameClean;
      }

      let gpName = "cn=" + groupDisplayName + "," + config.LDAP_GROUPSDN;
      gpName = gpName.toLowerCase();

      let mergeRenamedGroups = Object.values(db).filter(g => g.entryUUID == group.id && g.entryDN != gpName);
      if (mergeRenamedGroups.length == 1) {
        db[gpName] = mergeRenamedGroups[0];
        delete db[db[gpName].entryDN];
      }

      let group_hash = Math.abs(encode().value(group.id)).toString();
      if (db[gpName] && db[gpName].hasOwnProperty('gidNumber')) group_hash = (db[gpName].gidNumber.toString());

      db[gpName] = Object.assign({},
        // default values
        {
          "objectClass": [
            "top",
            "posixGroup",
            "extensibleObject",
            "apple-group",
            "sambaGroupMapping",
            "sambaIdmapEntry"
          ],
          "cn": groupDisplayName.toLowerCase(),
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
          "sambaSID": smbaSIDbase + "-" + (group_hash * 2 + 1001),
          "structuralObjectClass": "posixGroup",
          "hasSubordinates": "FALSE",
          "subSchemaSubentry": "cn=subschema"
        },
        // merge existing values
        db[gpName],
        // overwrite values from before
        {
          "cn": groupDisplayName.toLowerCase(),
          "entryDN": gpName,
          "description": (group.description || ""),
          "sambaSID": smbaSIDbase + "-" + (group_hash * 2 + 1001),
        });

      db[gpName] = customizer.ModifyLDAPGroup(db[gpName], group);

      helper.log("ldapwrapper.js", "try fetching the members for group: ", group.displayName);
      var members = [];
      members = await graph_azure.callApi(graph_azure.apiConfig.mri, graph_azureResponse.accessToken, { id: group.id });
      if (typeof members === 'undefined' || !members) {
        helper.warn("ldapwrapper.js", "no members found for group", group.displayName);
        members = [];
      }
      else {
        helper.SaveJSONtoFile(members, './.cache/members_' + groupDisplayName + '.json');
        helper.log("ldapwrapper.js", 'members_' + groupDisplayName + '.json' + " saved.");
      }

      for (let t = 0, tlen = members.length; t < tlen; t++) {
        let member = members[t];
        if (member.id != group.id) {
          user_to_groups[member.id] = user_to_groups[member.id] || [];
          if (user_to_groups[member.id].indexOf(gpName) < 0) {
            user_to_groups[member.id].push(gpName);
          }
        }
      }
    }

    if (typeof user_to_groups === 'undefined' || !user_to_groups) {
      helper.warn("ldapwrapper.js", "no user-groups found");
      user_to_groups = [];
    }

    helper.log("ldapwrapper.js", "try fetching the users");
    var users = [];
    users = await graph_azure.callApi(graph_azure.apiConfig.uri, graph_azureResponse.accessToken);
    if (typeof users === 'undefined' || !users) {
      helper.warn("ldapwrapper.js", "no users found");
      users = [];
    }
    else {
      helper.SaveJSONtoFile(users, './.cache/users.json');
      helper.log("ldapwrapper.js", 'users.json' + " saved.");
    }

    users = customizer.ModifyAzureUsers(users);

    for (let i = 0, len = users.length; i < len; i++) {
      let user = users[i];
      let userPrincipalName = user.userPrincipalName;
      let AzureADuserExternal = 0;

      let isMicrosoftAccount = (user.hasOwnProperty('identities') &&
        user.identities.filter(x => x.hasOwnProperty('issuer') && x.issuer == 'ExternalAzureAD')
          .length == 0);

      // ignore personal microsoft accounts, because RPOC is not possible 
      if (isMicrosoftAccount) {
        helper.warn("ldapwrapper.js", '#EXT#-user ignored',
          {
            mail: user.mail,
            userPrincipalName: user.userPrincipalName,
            info: 'RPOC is not possible for personal microsoft accounts'
          });
      }
      else {

        // try handling "#EXT#"-user
        if (userPrincipalName.indexOf("#EXT#") > -1 && user.hasOwnProperty('mail')) {
          let old_userPrincipalName = user.userPrincipalName;
          user.userPrincipalName = user.mail;
          userPrincipalName = escapeLDAPspecialChars(userPrincipalName.substring(0, userPrincipalName.indexOf("#EXT#")));
          AzureADuserExternal = 1;

          helper.log("ldapwrapper.js", '#EXT#-user special treatment',
            {
              old_userPrincipalName: old_userPrincipalName,
              new_userPrincipalName: user.mail,
              AzureADuserExternal: 1,
              upn: userPrincipalName,
              info: 'userPrincipalName overwritten'
            });
        }

        if (config.LDAP_REMOVEDOMAIN) userPrincipalName = userPrincipalName.replace("@" + config.LDAP_DOMAIN, '');

        let userPrincipalNameClean = removeSpecialChars(userPrincipalName);

        if (userPrincipalName.indexOf("@") > -1 && userPrincipalName.indexOf("@" + config.LDAP_DOMAIN) === -1) {
          helper.warn("ldapwrapper.js", 'userPrincipalName', userPrincipalName, 'does not contain your `LDAP_DOMAIN`', config.LDAP_DOMAIN, '. This can cause some unexpected problems.');
          let tmpDomain = userPrincipalName;
          userPrincipalName = userPrincipalName.substring(0, userPrincipalName.indexOf("@"));
          tmpDomain = tmpDomain.replace(userPrincipalName, '').replace('@', '');
          helper.warn("ldapwrapper.js", 'userPrincipalName', '... now using ', config.LDAP_DOMAIN, ' instead of ', tmpDomain, ' for this user.');
        } else if (userPrincipalName !== userPrincipalNameClean) {
          helper.warn("ldapwrapper.js", 'userPrincipalNames may not contain any special chars. In a future version we are maybe using ', userPrincipalNameClean, 'instead of', userPrincipalName);
          // userPrincipalName = userPrincipalNameClean;
        }

        let upName = config.LDAP_USERRDN + "=" + userPrincipalName + "," + config.LDAP_USERSDN;
        upName = upName.toLowerCase();

        var mergeRenamed = Object.values(db).filter(u => u.entryUUID == user.id && u.entryDN != upName);
        if (mergeRenamed.length == 1) {
          db[upName] = mergeRenamed[0];
          delete db[db[upName].entryDN];
        }

        let user_hash = Math.abs(encode().value(user.id)).toString();
        let sambaNTPassword = "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
        let sambaPwdLastSet = 0;

        if (db[upName] && db[upName].hasOwnProperty('sambaNTPassword')) sambaNTPassword = db[upName].sambaNTPassword;
        if (db[upName] && db[upName].hasOwnProperty('sambaPwdLastSet')) sambaPwdLastSet = db[upName].sambaPwdLastSet;
        if (db[upName] && db[upName].hasOwnProperty('uidNumber')) user_hash = (db[upName].uidNumber.toString());

        if (typeof user_to_groups[user.id] === 'undefined' || !user_to_groups[user.id]) {
          helper.warn("ldapwrapper.js", "no groups found for user", upName);
          user_to_groups[user.id] = [];
        }

        // default `users`-group
        if (user_to_groups[user.id].indexOf(config.LDAP_USERSGROUPSBASEDN) < 0) {
          user_to_groups[user.id].push(config.LDAP_USERSGROUPSBASEDN);
        }

        for (let j = 0, jlen = user_to_groups[user.id].length; j < jlen; j++) {
          let g = user_to_groups[user.id][j];
          db[g].member = db[g].member || [];
          db[g].memberUid = db[g].memberUid || [];
          if (db[g].member.indexOf(upName) < 0) { db[g].member.push(upName); }
          if (db[g].memberUid.indexOf(userPrincipalName) < 0) { db[g].memberUid.push(userPrincipalName); }
        }

        db[upName] = Object.assign({},
          // default values
          {
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
            "memberOf": user_to_groups[user.id],
            "sambaAcctFlags": "[U          ]",
            "sambaLMPassword": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
            "sambaNTPassword": sambaNTPassword,
            "sambaPasswordHistory": "0000000000000000000000000000000000000000000000000000000000000000",
            "sambaPwdLastSet": sambaPwdLastSet,
            //"sambaSID": "S-1-5-21-" + user_hash + "-" + user_hash + "-" + user_hash,
            "sambaSID": smbaSIDbase + "-" + (user_hash * 2 + 1000),
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
            "subSchemaSubentry": "cn=subschema"
          },
          // merge existing values
          db[upName],
          // overwrite values from before
          {
            "cn": userPrincipalName.toLowerCase(),
            "AzureADuserPrincipalName": user.userPrincipalName,
            "AzureADuserExternal": AzureADuserExternal,
            "entryDN": upName,
            "uid": userPrincipalName,
            "displayName": user.displayName,
            "sambaSID": smbaSIDbase + "-" + (user_hash * 2 + 1000),
            "sAMAccountName": userPrincipalName,
            "givenName": user.givenName,
            "sn": user.surname,
            "homeDirectory": "/home/" + userPrincipalName,
            "mail": user.mail,
            "memberOf": user_to_groups[user.id],
            "gidNumber": db[config.LDAP_USERSGROUPSBASEDN].gidNumber,
            "sambaPrimaryGroupSID": db[config.LDAP_USERSGROUPSBASEDN].sambaSID,
          });

        db[upName] = customizer.ModifyLDAPUser(db[upName], user);


      }
    }

    // save the data file
    db = customizer.ModifyLDAPGlobal(db);
    helper.SaveJSONtoFile(db, config.LDAP_DATAFILE);
    helper.log("ldapwrapper.js", "end");

  } catch (error) {
    helper.error("ldapwrapper.js", error);
    return db || {};
  }
  return db;
};

module.exports = ldapwrapper;
