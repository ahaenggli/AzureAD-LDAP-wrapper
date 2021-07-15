'use strict';

// read in env settings
const graph_azure = require('./graph_azuread');
const config = require('./config');
const helper = require('./helper');
const fs = require('fs');
var diacritic = require('diacritic');

var encode = require('hashcode').hashCode;

var ldapwrapper = {};

function removeSpecialChars(str) {
  return diacritic.clean(str).replace(/[^A-Za-z0-9._\s]+/g, '-');
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

    const graph_azureResponse = await graph_azure.getToken(graph_azure.tokenRequest);
    if (!graph_azureResponse) helper.error("ldapwrapper.js", "graph_azureResponse missing");

    //var domains = [];
    //domains = await graph_azure.callApi(graph_azure.apiConfig.dri, graph_azureResponse.accessToken);

    let mergeBASEDN = Object.values(db).filter(g => g.entryUUID == 'e927be8d-aab8-42f2-80c3-b2762415aed1' && g.entryDN != config.LDAP_BASEDN);
    if (mergeBASEDN.length == 1) {
      db[config.LDAP_BASEDN] = mergeBASEDN[0];
      delete db[db[config.LDAP_BASEDN].entryDN];
    }

    db[config.LDAP_BASEDN] = {
      "objectClass": "domain",
      "dc": config.LDAP_BASEDN.replace('dc=', '').split(",")[0],
      "entryDN": config.LDAP_BASEDN,
      "entryUUID": "e927be8d-aab8-42f2-80c3-b2762415aed1",
      "namingContexts": config.LDAP_BASEDN,
      "structuralObjectClass": "domain",
      "hasSubordinates": "TRUE",
      "subschemaSubentry": "cn=Subschema"
    };

    var sambaDomainName = config.LDAP_BASEDN.split(",")[0].replace("dc=", "");
    var LDAP_SAMBA = "sambaDomainName="+sambaDomainName+"," + config.LDAP_BASEDN;
    LDAP_SAMBA = LDAP_SAMBA.toLowerCase();

    let mergeSambaDN = Object.values(db).filter(g => g.entryUUID == '1af6e064-8a89-4ea0-853b-c5476a50877f' && g.entryDN != LDAP_SAMBA);
    if (mergeSambaDN.length == 1) {
      db[LDAP_SAMBA] = mergeSambaDN[0];
      delete db[db[LDAP_SAMBA].entryDN];
    }

    db[LDAP_SAMBA] = {
       "sambaDomainName": sambaDomainName
      ,"sambaLogonToChgPwd": 0
      ,"sambaLockoutObservationWindow": 30
      ,"sambaMaxPwdAge": -1
      ,"sambaRefuseMachinePwdChange": 0
      ,"sambaLockoutThreshold": 0
      ,"sambaMinPwdAge": 0
      ,"sambaForceLogoff": -1
      ,"sambaLockoutDuration": 30
      ,"sambaSID": "S-1-5-21-2475342291-1480345137-508597502"
      ,"sambaPwdHistoryLength": 0
      ,"sambaMinPwdLength": 1
      ,"objectClass": "sambaDomain"
      ,"structuralObjectClass": "sambaDomain"
      ,"entryUUID": "1af6e064-8a89-4ea0-853b-c5476a50877f"
      ,"entryDN": LDAP_SAMBA
    };

    let mergeUSERSDN = Object.values(db).filter(g => g.entryUUID == '3e01f47d-96a1-4cb4-803f-7dd17991c6bd' && g.entryDN != config.LDAP_USERSDN);
    if (mergeUSERSDN.length == 1) {
      db[config.LDAP_USERSDN] = mergeUSERSDN[0];
      delete db[db[config.LDAP_USERSDN].entryDN];
    }

    db[config.LDAP_USERSDN] = {
      "objectClass": "organizationalRole",
      "cn": config.LDAP_USERSDN.replace("," + config.LDAP_BASEDN, '').replace('cn=', ''),
      "entryDN": config.LDAP_USERSDN,
      "entryUUID": "3e01f47d-96a1-4cb4-803f-7dd17991c6bd",
      "structuralObjectClass": "organizationalRole",
      "hasSubordinates": "TRUE",
      "subschemaSubentry": "cn=Subschema"
    };

    let mergeGROUPSDN = Object.values(db).filter(g => g.entryUUID == '39af84ac-8e5a-483e-9621-e657385b07b5' && g.entryDN != config.LDAP_GROUPSDN);
    if (mergeGROUPSDN.length == 1) {
      db[config.LDAP_GROUPSDN] = mergeGROUPSDN[0];
      delete db[db[config.LDAP_GROUPSDN].entryDN];
    }

    db[config.LDAP_GROUPSDN] = {
      "objectClass": "organizationalRole",
      "cn": config.LDAP_GROUPSDN.replace("," + config.LDAP_BASEDN, '').replace('cn=', ''),
      "entryDN": config.LDAP_GROUPSDN,
      "entryUUID": "39af84ac-8e5a-483e-9621-e657385b07b5",
      "structuralObjectClass": "organizationalRole",
      "hasSubordinates": "TRUE",
      "subschemaSubentry": "cn=Subschema"
    };

    var usersGroupDn_hash = Math.abs(encode().value(config.LDAP_USERSGROUPSBASEDN)).toString();

    let mergeUSERSGROUPSBASEDN = Object.values(db).filter(g => g.entryUUID == '938f7407-8e5a-48e9-a852-d862fa3bb1bc' && g.entryDN != config.LDAP_USERSGROUPSBASEDN);
    if (mergeUSERSGROUPSBASEDN.length == 1) {
      db[config.LDAP_USERSGROUPSBASEDN] = mergeUSERSGROUPSBASEDN[0];
      delete db[db[config.LDAP_USERSGROUPSBASEDN].entryDN];
    }

    if (db[config.LDAP_USERSGROUPSBASEDN] && db[config.LDAP_USERSGROUPSBASEDN].hasOwnProperty('gidNumber')) usersGroupDn_hash = (db[config.LDAP_USERSGROUPSBASEDN].gidNumber.toString());

    db[config.LDAP_USERSGROUPSBASEDN] = {
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
      "sambaSID": "S-1-5-21-" + usersGroupDn_hash + "-" + usersGroupDn_hash + "-" + usersGroupDn_hash,
      "structuralObjectClass": "posixGroup",
      "hasSubordinates": "FALSE",
      "subschemaSubentry": "cn=Subschema"
    };

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

      db[gpName] = {
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
        "sambaSID": group.securityIdentifier,
        "structuralObjectClass": "posixGroup",
        "hasSubordinates": "FALSE",
        "subschemaSubentry": "cn=Subschema"
      };

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

    for (let i = 0, len = users.length; i < len; i++) {
      let user = users[i];
      let userPrincipalName = user.userPrincipalName;
      if (config.LDAP_REMOVEDOMAIN) userPrincipalName = userPrincipalName.replace("@" + config.LDAP_DOMAIN, '');

      // ignore external users
      if (userPrincipalName.indexOf("#EXT#") > -1) {
        helper.warn("ldapwrapper.js", '#EXT#-user ignored:', userPrincipalName);
        helper.log("ldapwrapper.js", '#EXT#-users may be included in a future version');
      }
      else {
        let userPrincipalNameClean = removeSpecialChars(userPrincipalName);

        if (userPrincipalName.indexOf("@") > -1 && userPrincipalName.indexOf("@" + config.LDAP_DOMAIN) === -1) {
          helper.warn("ldapwrapper.js", 'userPrincipalName', userPrincipalName, 'does not contain your `LDAP_DOMAIN`', config.LDAP_DOMAIN, '. This can cause some unexpected problems.');
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

        db[upName] = {
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
          "sambaSID": "S-1-5-21-" + user_hash + "-" + user_hash + "-" + user_hash,
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
          "subschemaSubentry": "cn=Subschema"
        };

      }
    }

    // save the data file
    helper.SaveJSONtoFile(db, config.LDAP_DATAFILE);
    helper.log("ldapwrapper.js", "end");

  } catch (error) {
    helper.error("ldapwrapper.js", error);
    return db || {};
  }
  return db;
};

module.exports = ldapwrapper;