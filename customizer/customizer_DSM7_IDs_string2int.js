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
    /*
    let tmpKey = "cn=synoconf,"+config.LDAP_BASEDN;
    tmpKey=tmpKey.toLowerCase(); all[tmpKey] = {}; all[tmpKey].entryDN=tmpKey;
    all[tmpKey].dn = tmpKey;
    all[tmpKey].cn = "synoconf"; all[tmpKey].cn = all[tmpKey].cn.toLowerCase();
    all[tmpKey].objectClass ="organizationalRole";
    all[tmpKey].structuralObjectClass="organizationalRole";
    all[tmpKey].entryUUID="3555318e-2a3b-40bc-806f-6a3781e511f7";
    
    tmpKey = "cn=MinID,cn=synoconf,"+config.LDAP_BASEDN;
    tmpKey=tmpKey.toLowerCase(); all[tmpKey] = {}; all[tmpKey].entryDN=tmpKey;
    all[tmpKey].dn = tmpKey;
    all[tmpKey].cn = "MinID"; all[tmpKey].cn = all[tmpKey].cn.toLowerCase();
    all[tmpKey].uidNumber= 1000000;
    all[tmpKey].gidNumber= 1000000;
    all[tmpKey].objectClass= ["organizationalRole", "sambaUnixIdPool"];
    all[tmpKey].structuralObjectClass= "organizationalRole";
    all[tmpKey].entryUUID= "3eff9f3a-f731-4c01-b320-61ebb971e097";

    tmpKey = "cn=connection,cn=synoconf,"+config.LDAP_BASEDN;
    tmpKey=tmpKey.toLowerCase(); all[tmpKey] = {}; all[tmpKey].entryDN=tmpKey;
    all[tmpKey].objectClass= "synoConnectionSetting";
    all[tmpKey].cn= "connection"; all[tmpKey].cn = all[tmpKey].cn.toLowerCase();
    all[tmpKey].synoIdleTimeout= 60;
    all[tmpKey].structuralObjectClass= "synoConnectionSetting";
    all[tmpKey].entryUUID= "196b3dfb-0048-447e-a7b3-a0b2e6d73662";

    tmpKey = "cn=MaxID,cn=synoconf,"+config.LDAP_BASEDN;
    tmpKey=tmpKey.toLowerCase(); all[tmpKey] = {}; all[tmpKey].entryDN=tmpKey;
    all[tmpKey].cn= "MaxID"; all[tmpKey].cn = all[tmpKey].cn.toLowerCase();
    all[tmpKey].uidNumber= 2097151;
    all[tmpKey].gidNumber= 2097151;
    all[tmpKey].objectClass= ["organizationalRole",  "sambaUnixIdPool"]
    all[tmpKey].structuralObjectClass= "organizationalRole";
    all[tmpKey].entryUUID= "aab58760-7309-4b44-9f02-9863a44fa42a";

    tmpKey = "cn=CurID,cn=synoconf,"+config.LDAP_BASEDN;
    tmpKey=tmpKey.toLowerCase(); all[tmpKey] = {}; all[tmpKey].entryDN=tmpKey;
    all[tmpKey].cn= "CurID"; all[tmpKey].cn = all[tmpKey].cn.toLowerCase();
    all[tmpKey].objectClass= ["organizationalRole", "sambaUnixIdPool"];
    all[tmpKey].structuralObjectClass= "organizationalRole";
    all[tmpKey].entryUUID= "b22cb0b3-8695-40c5-b4b6-98c438f007dc";
    all[tmpKey].gidNumber= 1000006;
    all[tmpKey].uidNumber= 1000004;

    tmpKey = "cn=MaxNum,cn=synoconf,"+config.LDAP_BASEDN;
    tmpKey=tmpKey.toLowerCase(); all[tmpKey] = {}; all[tmpKey].entryDN=tmpKey;
    all[tmpKey].cn= "MaxNum"; all[tmpKey].cn = all[tmpKey].cn.toLowerCase();
    all[tmpKey].uidNumber= 20000
    all[tmpKey].gidNumber= 20000
    all[tmpKey].objectClass= ["organizationalRole", "sambaUnixIdPool"];
    all[tmpKey].structuralObjectClass= "organizationalRole";
    all[tmpKey].entryUUID= "b8d6f930-ab2b-43aa-a83b-cf2fbef9bced";

    tmpKey = "ou=pwpolicies,"+config.LDAP_BASEDN;
    tmpKey=tmpKey.toLowerCase(); all[tmpKey] = {}; all[tmpKey].entryDN=tmpKey;
    all[tmpKey].objectClass= ["organizationalUnit", "top"];
    all[tmpKey].ou= "pwpolicies";
    all[tmpKey].description= "Password Policies";
    all[tmpKey].structuralObjectClass= "organizationalUnit";
    all[tmpKey].entryUUID= "0200e2d6-8c8b-4a58-9d0d-5fa4f8d28fe0";

    tmpKey = "cn=default,ou=pwpolicies,"+config.LDAP_BASEDN;
    tmpKey=tmpKey.toLowerCase(); all[tmpKey] = {}; all[tmpKey].entryDN=tmpKey;
    all[tmpKey].objectClass= ["organizationalRole", "pwdPolicy", "pwdPolicyChecker"];
    all[tmpKey].cn= "default"
    all[tmpKey].pwdAttribute= "userPassword";
    all[tmpKey].pwdCheckQuality= 2;
    all[tmpKey].pwdExpireWarning= 0;
    all[tmpKey].pwdGraceAuthNLimit= 0;
    all[tmpKey].pwdMustChange= "TRUE";
    all[tmpKey].pwdAllowUserChange= "TRUE";
    all[tmpKey].pwdSafeModify= "FALSE";
    all[tmpKey].pwdCheckModule= "/lib/libsynoppolicychecker.so";
    all[tmpKey].structuralObjectClass= "organizationalRole";
    all[tmpKey].entryUUID= "a187aa5e-b6f8-4dcf-956b-a4433ac66f78";
    all[tmpKey].pwdMinLength= 0;
    all[tmpKey].pwdInHistory= 0;
    all[tmpKey].pwdLockout= "FALSE";
    all[tmpKey].pwdMaxFailure= 0;
    all[tmpKey].pwdFailureCountInterval= 0;
    all[tmpKey].pwdLockoutDuration= 0;
    all[tmpKey].pwdMinAge= 0;
    all[tmpKey].pwdMaxAge= 0;

    tmpKey = "cn=noexpire,ou=pwpolicies,"+config.LDAP_BASEDN;
    tmpKey=tmpKey.toLowerCase(); all[tmpKey] = {}; all[tmpKey].entryDN=tmpKey;
    all[tmpKey].objectClass= ["organizationalRole", "pwdPolicy", "pwdPolicyChecker"];
    all[tmpKey].cn= "noexpire";
    all[tmpKey].pwdAttribute= "userPassword";
    all[tmpKey].pwdMaxAge= 0;
    all[tmpKey].pwdCheckQuality= 2;
    all[tmpKey].pwdExpireWarning= 0;
    all[tmpKey].pwdGraceAuthNLimit= 0;
    all[tmpKey].pwdMustChange= "TRUE";
    all[tmpKey].pwdAllowUserChange= "TRUE";
    all[tmpKey].pwdSafeModify= "FALSE";
    all[tmpKey].pwdCheckModule= "/lib/libsynoppolicychecker.so";
    all[tmpKey].structuralObjectClass= "organizationalRole";
    all[tmpKey].entryUUID= "4dd128c1-936b-4f26-bffb-3d362be614e2";
    all[tmpKey].pwdMinLength= 0;
    all[tmpKey].pwdInHistory= 0;
    all[tmpKey].pwdLockout= "FALSE";
    all[tmpKey].pwdMaxFailure= 0;
    all[tmpKey].pwdFailureCountInterval= 0;
    all[tmpKey].pwdLockoutDuration= 0;
    all[tmpKey].pwdMinAge= 0;

    tmpKey = "cn=synopwpolicy,cn=synoconf,"+config.LDAP_BASEDN;
    tmpKey=tmpKey.toLowerCase(); all[tmpKey] = {}; all[tmpKey].entryDN=tmpKey;
    all[tmpKey].objectClass= ["organizationalRole", "pwdPolicy", "pwdPolicyChecker", "synoPwdPolicy"];
    all[tmpKey].pwdAttribute= "userPassword";
    all[tmpKey].pwdCheckQuality= 2;
    all[tmpKey].pwdExpireWarning= 0;
    all[tmpKey].pwdGraceAuthNLimit= 0;
    all[tmpKey].pwdMustChange= "TRUE";
    all[tmpKey].pwdAllowUserChange= "TRUE";
    all[tmpKey].pwdSafeModify= "FALSE";
    all[tmpKey].pwdCheckModule= "/lib/libsynoppolicychecker.so";
    all[tmpKey].structuralObjectClass= "organizationalRole";
    all[tmpKey].cn= "synopwpolicy";
    all[tmpKey].entryUUID= "29c143f9-a32c-4d35-a5b9-4360f0eda0a8";
    all[tmpKey].pwdMinAge= 0;
    all[tmpKey].pwdMaxAge= 0;
    all[tmpKey].pwdInHistory= 0;
    all[tmpKey].pwdMinLength= 8;
    all[tmpKey].pwdLockout= "FALSE";
    all[tmpKey].pwdLockoutDuration= 0;
    all[tmpKey].pwdMaxFailure= 0;
    all[tmpKey].pwdFailureCountInterval= 0;
    all[tmpKey].pwdSynoExcludeNameDesc= "TRUE";
    all[tmpKey].pwdSynoExcludeCommonPwd= "FALSE";
    all[tmpKey].pwdSynoMixedCase= "TRUE";
    all[tmpKey].pwdSynoNumber= "TRUE";
    all[tmpKey].pwdSynoSpecialChar= "FALSE";
    all[tmpKey].pwdSynoExpireChange= "FALSE";
    all[tmpKey].pwdSynoExpireMail= "FALSE";
    all[tmpKey].pwdSynoLoginFailInfo= "FALSE";
    all[tmpKey].pwdSynoPwdChangeOnly= "FALSE";
    all[tmpKey].pwdSynoPwdExpire= "FALSE";
    all[tmpKey].pwdSynoStrongPwd= "FALSE";
    all[tmpKey].pwdSynoLockoutExpire= "FALSE";
    all[tmpKey].pwdSynoMinAgeEnable= "FALSE";
    all[tmpKey].pwdSynoInHistoryEnable= "FALSE";
    all[tmpKey].pwdSynoMinLengthEnable= "TRUE";
    all[tmpKey].pwdSynoPwdReset= "FALSE";
    all[tmpKey].pwdSynoExpireWarningEnable= "FALSE";
    all[tmpKey].pwdSynoExpireWarning= 0;
    all[tmpKey].pwdSynoMailTaskId= -1;
    all[tmpKey].pwdSynoExpireMailTime= "00:00";
    all[tmpKey].pwdSynoExpireMailBeforeDays= 0;

    tmpKey = "cn=Directory Operators,cn=groups,"+config.LDAP_BASEDN;
    tmpKey=tmpKey.toLowerCase(); all[tmpKey] = {}; all[tmpKey].entryDN=tmpKey;
    all[tmpKey].objectClass= ["top", "posixGroup", "extensibleObject","apple-group","sambaGroupMapping", "sambaIdmapEntry"];
    all[tmpKey].cn= "Directory Operators"; all[tmpKey].cn = all[tmpKey].cn.toLowerCase();
    all[tmpKey].gidNumber= 1000000;
    all[tmpKey].description= "Directory default admin group";
    all[tmpKey]["apple-generateduid"] = "3E84DE41-CAC0-4F1F-B731-2A680C7F197C";
    all[tmpKey].sambaSID= "S-1-5-21-2512079242-2738141314-2079552257-1001";
    all[tmpKey].displayName= "Directory Operators";
    all[tmpKey].sambaGroupType= 2;
    all[tmpKey].structuralObjectClass= "posixGroup";
    all[tmpKey].entryUUID= "a15792d3-639f-4492-bbf3-13d07f43a220";
    
    tmpKey = "cn=Directory Clients,cn=groups,"+config.LDAP_BASEDN;
    tmpKey=tmpKey.toLowerCase(); all[tmpKey] = {}; all[tmpKey].entryDN=tmpKey;
    all[tmpKey].objectClass= ["top", "posixGroup", "extensibleObject","apple-group","sambaGroupMapping", "sambaIdmapEntry"];
    all[tmpKey].cn= "Directory Clients"; all[tmpKey].cn = all[tmpKey].cn.toLowerCase();
    all[tmpKey].gidNumber= 2097149;
    all[tmpKey].description= "Directory default client group";
    all[tmpKey]["apple-generateduid"]= "742F0981-08BC-4466-835F-990706E239A5";
    all[tmpKey].sambaSID= "S-1-5-21-2512079242-2738141314-2079552257-1002";
    all[tmpKey].displayName= "Directory Clients";
    all[tmpKey].sambaGroupType= 2;
    all[tmpKey].structuralObjectClass= "posixGroup";
    all[tmpKey].entryUUID= "b49e68bd-2c6d-4472-afd6-be7645301ea8";

    tmpKey = "cn=Directory Consumers,cn=groups,"+config.LDAP_BASEDN;
    tmpKey=tmpKey.toLowerCase(); all[tmpKey] = {}; all[tmpKey].entryDN=tmpKey;
    all[tmpKey].objectClass= ["top", "posixGroup", "extensibleObject","apple-group","sambaGroupMapping", "sambaIdmapEntry"];    
    all[tmpKey].cn= "Directory Consumers"; all[tmpKey].cn = all[tmpKey].cn.toLowerCase();
    all[tmpKey].gidNumber= 2097150;
    all[tmpKey].description= "Directory default consumer group";
    all[tmpKey]["apple-generateduid"]= "87F561A8-5137-4E34-AC74-5D62BFE3C5D0";
    all[tmpKey].sambaSID= "S-1-5-21-2512079242-2738141314-2079552257-1003";
    all[tmpKey].displayName= "Directory Consumers";
    all[tmpKey].sambaGroupType= 2;
    all[tmpKey].structuralObjectClass= "posixGroup";
    all[tmpKey].entryUUID= "dc88181e-fc2b-4c4e-b12e-f66ca2d29deb";
*/
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