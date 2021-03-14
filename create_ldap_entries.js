// read in env settings
const graph_azure = require('./graph_azure');
const config = require('./config');
const helper = require('./helper');

var encode = require('hashcode').hashCode;
var creator = {};

creator.do = async function () {
  try {

    const graph_azureResponse = await graph_azure.getToken(graph_azure.tokenRequest);
    const db = helper.ReadJSONfile(config.dataFile);
    ldapgroup = {};

    ldapgroup[config.baseDn] = {
      "objectClass": "domain",
      "dc": config.baseDn.replace('dc=', '').split(",")[0],
      "entryDN": config.baseDn,
      "hasSubordinates": "TRUE",
      "structuralObjectClass": "domain",
      "subschemaSubentry": "cn=Subschema",
      "namingContexts": config.baseDn
    };

    ldapgroup[config.usersDnSuffix] = {
      "objectClass": "organizationalRole",
      "cn": config.usersDnSuffix.replace("," + config.baseDn, '').replace('cn=', ''),
      "entryDN": config.usersDnSuffix,
      "hasSubordinates": "TRUE",
      "structuralObjectClass": "organizationalRole",
      "subschemaSubentry": "cn=Subschema"
    };

    ldapgroup[config.groupDnSuffix] = {
      "objectClass": "organizationalRole",
      "cn": config.groupDnSuffix.replace("," + config.baseDn, '').replace('cn=', ''),
      "entryDN": config.groupDnSuffix,
      "hasSubordinates": "TRUE",
      "structuralObjectClass": "organizationalRole",
      "subschemaSubentry": "cn=Subschema"
    };

    var hash = Math.abs(encode().value(config.usersGroupDnSuffix)).toString();
    ldapgroup[config.usersGroupDnSuffix] = {
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
      "gidNumber": hash,
      "sambaGroupType": "2",
      "sambaSID": "S-1-5-21-" + hash + "-" + hash + "-" + hash,
      "member": [],
      "memberUid": [],
      "hasSubordinates": "FALSE",
      "structuralObjectClass": "posixGroup",
      "subschemaSubentry": "cn=Subschema"
    };

    var groups = await graph_azure.callApi(graph_azure.apiConfig.gri, graph_azureResponse.accessToken);
    helper.SaveJSONtoFile(groups, './.cache/groups.json');

    var user_to_groups = [];

    for (var i = 0, len = groups.length; i < len; i++) {
      group = groups[i];
      gpName = "cn=" + group.displayName.replace(/\s/g, '') + "," + config.groupDnSuffix;
      var hash = Math.abs(encode().value(group.id)).toString();
      ldapgroup[gpName] = {
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
        "gidNumber": hash,
        "sambaGroupType": "2",
        "sambaSID": group.securityIdentifier,
        "member": [],
        "memberUid": [],
        "hasSubordinates": "FALSE",
        "structuralObjectClass": "posixGroup",
        "subschemaSubentry": "cn=Subschema"
      };

      var members = await graph_azure.callApi(graph_azure.apiConfig.mri, graph_azureResponse.accessToken, { id: group.id });

      for (var t = 0, tlen = members.length; t < tlen; t++) {
        var member = members[t];
        if (member.id != group.id) {
          user_to_groups[member.id] = user_to_groups[member.id] || [config.usersGroupDnSuffix];
          user_to_groups[member.id].push(gpName);
        }
      }

      helper.SaveJSONtoFile(members, './.cache/members_' + group.displayName + '.json');

    }

    var users = await graph_azure.callApi(graph_azure.apiConfig.uri, graph_azureResponse.accessToken);
    helper.SaveJSONtoFile(users, './.cache/users.json');

    for (var i = 0, len = users.length; i < len; i++) {
      user = users[i];
      userPrincipalName = user.userPrincipalName.replace("@" + config.azureDomain, '');

      // ignore external users
      if (userPrincipalName.indexOf("#EXT#") == -1) {
        upName = config.userRdn + "=" + userPrincipalName.replace(/\s/g, '') + "," + config.usersDnSuffix;
        var hash = Math.abs(encode().value(user.id)).toString();

        for (var j = 0, jlen = user_to_groups[user.id].length; j < jlen; j++) {
          let g = user_to_groups[user.id][j];
          ldapgroup[g].member = ldapgroup[g].member || [];
          ldapgroup[g].memberUid = ldapgroup[g].memberUid || [];
          ldapgroup[g].member.push(upName);
          ldapgroup[g].memberUid.push(userPrincipalName);
        }

        ldapgroup[upName] = {
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
          "cn": userPrincipalName,
          "entryDN": upName,
          "sn": user.surname,
          "givenName": user.givenName,
          "displayName": user.displayName,
          "uid": userPrincipalName,
          "uidNumber": hash,
          "gidNumber": ldapgroup[config.usersGroupDnSuffix].gidNumber,
          "homeDirectory": "/home/" + userPrincipalName,
          "sambaSID": "S-1-5-21-" + hash + "-" + hash + "-" + hash,
          "loginShell": "/bin/sh",
          "mail": user.mail,
          "memberOf": user_to_groups[user.id],
          "sambaAcctFlags": "[U          ]",
          "sambaLMPassword": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
          "sambaNTPassword": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
          "sambaPasswordHistory": "0000000000000000000000000000000000000000000000000000000000000000",
          "sambaPwdLastSet": 0,
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

        let userAttr = db[upName];
        if (userAttr && userAttr.hasOwnProperty("sambaNTPassword")) {
          ldapgroup[upName].sambaLMPassword = userAttr.sambaLMPassword;
          ldapgroup[upName].sambaNTPassword = userAttr.sambaNTPassword;
          ldapgroup[upName].sambaPwdLastSet = userAttr.sambaPwdLastSet;
        }

      }

    }

    // save the data file
    helper.SaveJSONtoFile(ldapgroup, config.dataFile);
    return ldapgroup;

  } catch (error) {
    console.error(error);
    return {};
  }
};

module.exports = creator;