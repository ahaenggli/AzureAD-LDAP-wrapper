'use strict';

// read in env settings
const graph_azure = require('./graph_azuread');
const config = require('./config');
const helper = require('./helper');
const fs = require('fs');

var encode = require('hashcode').hashCode;
var creator = {};

creator.do = async function () {
  helper.log("ldapwrapper.js", "start");

  var db = helper.ReadJSONfile(config.dataFile);
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

    db[config.baseDn] = {
      "objectClass": "domain",
      "dc": config.baseDn.replace('dc=', '').split(",")[0],
      "entryDN": config.baseDn,
      "hasSubordinates": "TRUE",
      "structuralObjectClass": "domain",
      "subschemaSubentry": "cn=Subschema",
      "namingContexts": config.baseDn
    };

    db[config.usersDnSuffix] = {
      "objectClass": "organizationalRole",
      "cn": config.usersDnSuffix.replace("," + config.baseDn, '').replace('cn=', ''),
      "entryDN": config.usersDnSuffix,
      "hasSubordinates": "TRUE",
      "structuralObjectClass": "organizationalRole",
      "subschemaSubentry": "cn=Subschema"
    };

    db[config.groupDnSuffix] = {
      "objectClass": "organizationalRole",
      "cn": config.groupDnSuffix.replace("," + config.baseDn, '').replace('cn=', ''),
      "entryDN": config.groupDnSuffix,
      "hasSubordinates": "TRUE",
      "structuralObjectClass": "organizationalRole",
      "subschemaSubentry": "cn=Subschema"
    };

    var usersGroupDn_hash = Math.abs(encode().value(config.usersGroupDnSuffix)).toString();
    if (db[config.usersGroupDnSuffix] && db[config.usersGroupDnSuffix].hasOwnProperty('gidNumber')) usersGroupDn_hash = db[config.usersGroupDnSuffix].gidNumber;

    db[config.usersGroupDnSuffix] = {
      "objectClass": [
        "sambaIdmapEntry",
        "sambaGroupMapping",
        "extensibleObject",
        "posixGroup",
        "top"
      ],
      "cn": "users",
      "entryDN": config.usersGroupDnSuffix,
      "description": "Users default group",
      "displayName": "users",
      "gidNumber": usersGroupDn_hash,
      "sambaGroupType": "2",
      "sambaSID": "S-1-5-21-" + usersGroupDn_hash + "-" + usersGroupDn_hash + "-" + usersGroupDn_hash,
      "member": [],
      "memberUid": [],
      "hasSubordinates": "FALSE",
      "structuralObjectClass": "posixGroup",
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
      let gpName = "cn=" + group.displayName.replace(/\s/g, '') + "," + config.groupDnSuffix;
      gpName = gpName.toLowerCase();

      let group_hash = Math.abs(encode().value(group.id)).toString();
      if (db[gpName] && db[gpName].hasOwnProperty('gidNumber')) group_hash = db[gpName].gidNumber;

      db[gpName] = {
        "objectClass": [
          "sambaIdmapEntry",
          "sambaGroupMapping",
          "extensibleObject",
          "posixGroup",
          "top"
        ],
        "cn": group.displayName.replace(/\s/g, ''),
        "entryDN": gpName,
        "description": group.description,
        "displayName": group.displayName,
        "gidNumber": group_hash,
        "sambaGroupType": "2",
        "sambaSID": group.securityIdentifier,
        "member": [],
        "memberUid": [],
        "hasSubordinates": "FALSE",
        "structuralObjectClass": "posixGroup",
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
        helper.SaveJSONtoFile(members, './.cache/members_' + group.displayName + '.json');
        helper.log("ldapwrapper.js", 'members_' + group.displayName + '.json' + " saved.");
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
      let userPrincipalName = user.userPrincipalName.replace("@" + config.azureDomain, '');

      // ignore external users
      if (userPrincipalName.indexOf("#EXT#") > -1) {
        helper.warn("ldapwrapper.js", '#EXT#-user ignored:', userPrincipalName);
        helper.log("ldapwrapper.js", '#EXT#-users may be included in a future version');
      }
      else {
        let upName = config.userRdn + "=" + userPrincipalName.replace(/\s/g, '') + "," + config.usersDnSuffix;
        upName = upName.toLowerCase();

        let user_hash = Math.abs(encode().value(user.id)).toString();
        let sambaNTPassword = "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
        let sambaPwdLastSet = 0;

        if (db[upName] && db[upName].hasOwnProperty('sambaNTPassword')) sambaNTPassword = db[upName].sambaNTPassword;
        if (db[upName] && db[upName].hasOwnProperty('sambaPwdLastSet')) sambaPwdLastSet = db[upName].sambaPwdLastSet;

        if (typeof user_to_groups[user.id] === 'undefined' || !user_to_groups[user.id]) {
          helper.warn("ldapwrapper.js", "no groups found for user", upName);
          user_to_groups[user.id] = [];
        }

        // default `users`-group
        if (user_to_groups[user.id].indexOf(config.usersGroupDnSuffix) < 0) {
          user_to_groups[user.id].push(config.usersGroupDnSuffix);
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
            "extensibleObject",
            "sambaIdmapEntry",
            "sambaSamAccount",
            "inetOrgPerson",
            "organizationalPerson",
            "person",
            "shadowAccount",
            "posixAccount",
            "top"],
          "cn": user.displayName,
          "entryDN": upName,
          "sn": user.surname,
          "givenName": user.givenName,
          "displayName": user.displayName,
          "uid": userPrincipalName,
          "sAMAccountName": userPrincipalName,
          "uidNumber": user_hash,
          "gidNumber": db[config.usersGroupDnSuffix].gidNumber,
          "homeDirectory": "/home/" + userPrincipalName,
          "sambaSID": "S-1-5-21-" + user_hash + "-" + user_hash + "-" + user_hash,
          "loginShell": "/bin/sh",
          "mail": user.mail,
          "memberOf": user_to_groups[user.id],
          "sambaAcctFlags": "[U          ]",
          "sambaLMPassword": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
          "sambaNTPassword": sambaNTPassword,
          "sambaPasswordHistory": "0000000000000000000000000000000000000000000000000000000000000000",
          "sambaPwdLastSet": sambaPwdLastSet,
          "shadowExpire": "-1",
          "shadowFlag": "0",
          "shadowInactive": "0",
          "shadowLastChange": "17399",
          "shadowMax": "99999",
          "shadowMin": "100000",
          "shadowWarning": "7",
          "hasSubordinates": "FALSE",
          "structuralObjectClass": "inetOrgPerson",
          "subschemaSubentry": "cn=Subschema"
        };

      }
    }

    // save the data file
    helper.SaveJSONtoFile(db, config.dataFile);
    helper.log("ldapwrapper.js", "end");

  } catch (error) {
    helper.error("ldapwrapper.js", error);
    return db || {};
  }
  return db;
};

module.exports = creator;