'use strict';

const helper = require('./helper');
const config = require('./config');

if (!helper.checkEnvVars()) return;

const ldapwrapper = require('./ldapwrapper');
const ldap = require('ldapjs');
const ldap_overwrites = require('./ldapjs_overwrites.js');
ldap_overwrites(ldap);

const graph = require('./graph_azuread');

/* build schema */
var schemaDB = {
    "objectClass": ["top", "subentry", "subschema", "extensibleObject"],
    "cn": "subschema",
    "structuralObjectClass": "subentry",
    "entryDN": "cn=subschema",
    "createTimestamp": "20220301211408Z",
    "modifyTimestamp": "20220301211408Z",
    "ldapSyntaxes": "",
    "matchingRules": "",
    "matchingRuleUse": "",
    "attributeTypes": "",
    "objectClasses": "",
    "subschemaSubentry": "cn=subschema"
};
// source: https://www.iana.org/assignments/ldap-parameters/ldap-parameters.xhtml#ldap-parameters-8
// schemaDB["ldapSyntaxes"] = helper.ReadCSVfile('./schema/ldapSyntaxes.csv', function (row) { return '(' + row[0] + ' DESC ' + row[1] + ')'; });
// source: extraced via ./schema/ldap_seacher.ps1
schemaDB["ldapSyntaxes"] = helper.ReadCSVfile('./schema/ldapSyntaxes.csv', function (row) { if (Array.isArray(row)) return row.join(","); else return row; });
schemaDB["matchingRules"] = helper.ReadCSVfile('./schema/matchingRules.csv', function (row) { if (Array.isArray(row)) return row.join(","); else return row; });
schemaDB["matchingRuleUse"] = helper.ReadCSVfile('./schema/matchingRuleUse.csv', function (row) { if (Array.isArray(row)) return row.join(","); else return row; });
schemaDB["attributeTypes"] = helper.ReadCSVfile('./schema/attributeTypes.csv', function (row) { if (Array.isArray(row)) return row.join(","); else return row; });
schemaDB["objectClasses"] = helper.ReadCSVfile('./schema/objectClasses.csv', function (row) { if (Array.isArray(row)) return row.join(","); else return row; });

var db = helper.ReadJSONfile(config.LDAP_DATAFILE);
db["cn=subschema"] = schemaDB;

var lastRefresh = 0;
var tlsOptions = {};
//if(config.LDAPS_CERTIFICATE && config.LDAPS_KEY)
tlsOptions = { certificate: helper.ReadFile(config.LDAPS_CERTIFICATE), key: helper.ReadFile(config.LDAPS_KEY) };
var server = ldap.createServer(tlsOptions);


const interval = config.LDAP_SYNC_TIME /*minutes*/ * 60 * 1000;

async function refreshDB() {
    helper.log("server.js", "refreshDB()", "func called");
    if (Date.now() > lastRefresh + interval) {
        db = await ldapwrapper.do();
        db["cn=subschema"] = schemaDB;
        lastRefresh = Date.now();
    }
    if (!db) {
        db = helper.ReadJSONfile(config.LDAP_DATAFILE);
        db["cn=subschema"] = schemaDB;
    }
}



// init data from azure before starting the server
refreshDB();


const interval_func = function () {
    helper.forceLog("server.js", "every", config.LDAP_SYNC_TIME, "minutes refreshDB()");
    try {
        refreshDB();
    } catch (error) {
        helper.error("server.js", "interval_func", error);
    }
};
setInterval(interval_func, interval);


///--- Shared handlers
const SUFFIX = '';
function authorize(req, res, next) {

    var bindi = req.connection.ldap.bindDN.toString().replace(/ /g, '');
    var username = bindi.toLowerCase().replace(config.LDAP_USERRDN + "=", '').replace("," + config.LDAP_USERSDN, '');

    const isSearch = (req instanceof ldap.SearchRequest);
    const isAnonymous = req.connection.ldap.bindDN.equals('cn=anonymous');

    if (config.LDAP_ANONYMOUSBIND == "none" && isAnonymous) {
        helper.error("server.js", "authorize - denied because of env var `LDAP_ANONYMOUSBIND` ", bindi);
        return next(new ldap.InsufficientAccessRightsError());
    }

    /* Any user may search after bind, only cn=root has full power */


    var isAdmin = false;

    if (config.LDAP_BINDUSER) {
        for (var u of config.LDAP_BINDUSER.toString().split("||")) {
            u = u.split("|")[0];
            if (u === username) isAdmin = true;
        }
    }

    if (!isAdmin && !isSearch) {
        helper.error("server.js", "authorize - denied for => ", username, bindi);

        return next(new ldap.InsufficientAccessRightsError());
    }

    return next();
}

function isUserENVBindUser(binduser) {
    var allowSensitiveAttributes = false;
    if (config.LDAP_BINDUSER) {
        for (var u of config.LDAP_BINDUSER.toString().split("||")) {
            u = u.split("|")[0];
            var username = binduser.toString().toLowerCase().replace(/ /g, '').replace(config.LDAP_USERRDN + "=", '').replace("," + config.LDAP_USERSDN, '');
            if (u === username) allowSensitiveAttributes = true;
        }
    }
    return allowSensitiveAttributes;
}

function removeSensitiveAttributes(binduser, dn, attributes) {

    if (!attributes) return attributes;
    const isEnvBindUser = isUserENVBindUser(binduser);
    var allowSensitiveAttributes = (binduser.equals(dn) || isEnvBindUser);

    // samba is special, the own user must have access to them
    if (attributes.hasOwnProperty("sambaNTPassword")) {

        if (config.LDAP_SAMBANTPWD_MAXCACHETIME && attributes["sambaPwdLastSet"] && config.LDAP_SAMBANTPWD_MAXCACHETIME != -1)
            // time is up
            if ((attributes["sambaPwdLastSet"] + config.LDAP_SAMBANTPWD_MAXCACHETIME * 60) < Math.floor(Date.now() / 1000)) {
                attributes["sambaNTPassword"] = "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
                attributes["sambaPwdLastSet"] = 0;
            }

        // user is not allowed to see
        if (!allowSensitiveAttributes) {
            attributes["sambaNTPassword"] = "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
            attributes["sambaPwdLastSet"] = 0;
        }
    }

    // secure attributes - only the respective user and superusers are allowed to see them
    if (!allowSensitiveAttributes) {
        if (config.LDAP_SENSITIVE_ATTRIBUTES != "") {
            const sensitiveAttributes = config.LDAP_SENSITIVE_ATTRIBUTES.split("|");
            // remove all sensitive attributes from the env var
            let attKeys = Object.keys(attributes);
            sensitiveAttributes.forEach(sensAttName => {
                let foundAttNames = attKeys.filter((key) => key.match(new RegExp(sensAttName, "gi")));
                foundAttNames.forEach(found => {
                    delete attributes[found];
                });
            });
        }
    }

    // secure attributes - only superusers are allowed to see them
    if (!isEnvBindUser && config.LDAP_SECURE_ATTRIBUTES != "") {
        const secureAttributes = config.LDAP_SECURE_ATTRIBUTES.split("|");
        // remove all sensitive attributes from the env var
        let attKeys = Object.keys(attributes);
        secureAttributes.forEach(sensAttName => {
            let foundAttNames = attKeys.filter((key) => key.match(new RegExp(sensAttName, "gi")));
            foundAttNames.forEach(found => {
                delete attributes[found];
            });
        });
    }

    return attributes;
}


// Auth via azure for binding
server.bind(SUFFIX, async (req, res, next) => {
    try {
        var dn = req.dn.toString().toLowerCase().replace(/ /g, '');

        helper.log("server.js", "server.bind", dn);

        // dn bind
        var username = helper.unescapeLDAPspecialChars(dn.replace(config.LDAP_USERRDN + "=", '').replace("," + config.LDAP_USERSDN, ''));
        var pass = req.credentials;

        if (config.LDAP_BINDUSER && config.LDAP_BINDUSER.toString().split("||").indexOf(username + '|' + pass) > -1) {
            helper.log("server.js", "server.bind", username, "binduser, you shall pass");
            res.end();
            return next();
        } else {

            if (config.LDAP_REMOVEDOMAIN == true && username.indexOf("@") == -1)
                username = username + "@" + config.LDAP_DOMAIN;

            if (!db.hasOwnProperty(dn)) {
                // helper.warn("server.js", "server.bind", "hmpf", dn);
                let searchDN = Object.values(db).filter(g => (g.hasOwnProperty("AzureADuserPrincipalName"))).filter(g => g.AzureADuserPrincipalName.toLowerCase() == username);
                if (searchDN.length == 1) dn = searchDN[0]["entryDN"];
            }

            var userAttributes = db[dn]; // removeSensitiveAttributes(req.dn, dn, db[dn]);//

            if (!userAttributes || !userAttributes.hasOwnProperty("sambaNTPassword") || !userAttributes.hasOwnProperty("AzureADuserPrincipalName")) {
                helper.log("server.js", "server.bind", username, "Failed login -> mybe not synced yet?");
                return next(new ldap.InvalidCredentialsError());
            } else {

                var check = await graph.loginWithUsernamePassword(userAttributes["AzureADuserPrincipalName"], pass);
                helper.log("server.js", "server.bind", "check", check);

                var userNtHash = helper.md4(pass);

                if (check === 1) {
                    helper.log("server.js", "server.bind", username, "check=true: you shall pass");

                    //helper.log("server.js", userAttributes);
                    if (userAttributes && userAttributes.hasOwnProperty("sambaNTPassword")) {

                        if (userAttributes["sambaNTPassword"] != userNtHash) {
                            helper.log("server.js", "server.bind", username, "Saving NT password hash for user ", dn);
                            userAttributes["sambaNTPassword"] = userNtHash;
                        }

                        helper.log("server.js", "server.bind", username, "Saving PwdLastSet for user ", dn);
                        userAttributes["sambaPwdLastSet"] = Math.floor(Date.now() / 1000);

                        // save the data file, except LDAP_SAMBANTPWD_MAXCACHETIME is set to 0 
                        if(config.LDAP_SAMBANTPWD_MAXCACHETIME != 0)
                        {
                            db[dn] = userAttributes;                        
                            helper.SaveJSONtoFile(db, config.LDAP_DATAFILE);
                        }
                    }

                    res.end();
                    return next();
                }
                else if (check === 2 && config.LDAP_ALLOWCACHEDLOGINONFAILURE) {
                    helper.error("server.js", "server.bind", username, "wrong password, retry against sambaNTPassword");
                    if (userAttributes && userAttributes.hasOwnProperty("sambaNTPassword")) {
                        if (userAttributes["sambaNTPassword"] === userNtHash) {
                            res.end();
                            return next();
                        }
                    }
                    return next(new ldap.InvalidCredentialsError());
                }
                else {
                    helper.error("server.js", "server.bind", username, " -> Failed login");
                    return next(new ldap.InvalidCredentialsError());
                }
            }
        }
    }
    catch (error) {
        helper.error("server.js", "server.bind", error);
        return next(new ldap.InvalidCredentialsError());
    }
});


// search
server.search(SUFFIX, authorize, (req, res, next) => {
    try {
        const isAnonymous = req.connection.ldap.bindDN.equals('cn=anonymous');
        var dn = req.dn.toString().toLowerCase().replace(/ /g, '') || config.LDAP_BASEDN;

        helper.log("server.js", "server.search", 'Search for => DB: ' + dn + '; Scope: ' + req.scope + '; Filter: ' + req.filter + '; Attributes: ' + req.attributes + ';');

        // search for schema/configuration
        if (['cn=SubSchema', 'cn=schema,cn=config', 'cn=schema,cn=configuration'].map(v => v.toLowerCase()).indexOf(dn.toLowerCase()) > -1) {
            res.send({
                dn: dn,
                attributes: schemaDB
            });
            res.end();
            return next();
        }

        let searchableEntries = JSON.parse(JSON.stringify(db));
        if (config.LDAP_ANONYMOUSBIND == 'domain' && isAnonymous) {
            for (var key of Object.keys(searchableEntries)) {
                if (!searchableEntries[key].hasOwnProperty("namingContexts")) {
                    delete searchableEntries[key];
                }
            }
            helper.log("server.js", "server.search", 'searchableEntries modified for anonymous', Object.keys(searchableEntries).length);
        } else {
            helper.log("server.js", "server.search", 'searchableEntries NOT modified', Object.keys(searchableEntries).length);
        }

        if (!searchableEntries[dn])
            return next(new ldap.NoSuchObjectError(dn));

        let scopeCheck;
        let bindDN = req.connection.ldap.bindDN;

        switch (req.scope) {
            case 'base':

                if (req.filter.matches(removeSensitiveAttributes(bindDN, dn, searchableEntries[dn]))) {
                    res.send({
                        dn: dn,
                        attributes: removeSensitiveAttributes(bindDN, dn, db[dn])
                    });
                }

                res.end();
                return next();

            case 'one':
                scopeCheck = (k) => {
                    if (req.dn.equals(k))
                        return true;

                    const parent = ldap.parseDN(k).parent();
                    return (parent ? parent.equals(req.dn) : false);
                };
                break;

            case 'sub':
                scopeCheck = (k) => {
                    return (req.dn.equals(k) || req.dn.parentOf(k));
                };

                break;
        }

        const keys = Object.keys(searchableEntries);
        for (const key of keys) {
            if (!scopeCheck(key))
                continue;

            if (req.filter.matches(removeSensitiveAttributes(bindDN, key, searchableEntries[key]))) {
                res.send({
                    dn: key,
                    attributes: removeSensitiveAttributes(bindDN, key, db[key])
                });
            }
        }

        res.end();
        return next();
    }
    catch (error) {
        helper.error("server.js", "server.search", error);
    }
});


/* ldapjs modify entries: START */

// compare entries  
server.compare(SUFFIX, authorize, (req, res, next) => {
    const dn = req.dn.toString().toLowerCase().replace(/  {2,}/g, ' ').replace(/, /g, ',');

    if (!db[dn])
        return next(new ldap.NoSuchObjectError(dn));

    // case in-sensitive
    req.attribute = Object.keys(db[dn]).find(key => key.toLowerCase() === req.attribute.toLowerCase()) || req.attribute;

    if (!db[dn][req.attribute])
        return next(new ldap.NoSuchAttributeError(req.attribute));

    var matches = false;
    const vals = db[dn][req.attribute];
    for (const value of vals) {
        if (value === req.value) {
            matches = true;
            break;
        }
    }

    res.end(matches);
    return next();
});

// add entries  
server.add(SUFFIX, authorize, (req, res, next) => {
    const dn = req.dn.toString().toLowerCase().replace(/  {2,}/g, ' ').replace(/, /g, ',');

    if (db[dn]) {
        helper.error("server.js", "add", "EntryAlreadyExistsError", dn);
        return next(new ldap.EntryAlreadyExistsError(dn));
    }

    db[dn] = Object.assign({}, req.toObject().attributes);
    for (var key in db[dn]) {
        if (['objectclass', 'memberuid', 'member', 'memberof'].indexOf(key.toLowerCase()) === -1 && db[dn][key].length == 1) {
            db[dn][key] = db[dn][key][0];
        }
    }

    helper.SaveJSONtoFile(db, config.LDAP_DATAFILE);
    res.end();
    return next();
});


// delete entries
server.del(SUFFIX, authorize, (req, res, next) => {
    const dn = req.dn.toString().toLowerCase().replace(/  {2,}/g, ' ').replace(/, /g, ',');

    if (!db[dn]) {
        helper.error("server.js", "del", "NoSuchObjectError", dn);
        return next(new ldap.NoSuchObjectError(dn));
    }

    delete db[dn];

    helper.SaveJSONtoFile(db, config.LDAP_DATAFILE);
    res.end();
    return next();
});

server.modifyDN(SUFFIX, authorize, (req, res, next) => {

    helper.error("server.js", "modifyDN", "not yet implemented");
    return next(new ldap.ProtocolError('not yet implemented'));

    // console.log('DN: ' + req.dn.toString());
    // console.log('new RDN: ' + req.newRdn.toString());
    // console.log('deleteOldRDN: ' + req.deleteOldRdn);
    // console.log('new superior: ' +(req.newSuperior ? req.newSuperior.toString() : ''));
    // res.end();

});

// edit entries
server.modify(SUFFIX, authorize, (req, res, next) => {
    const dn = req.dn.toString().toLowerCase().replace(/  {2,}/g, ' ').replace(/, /g, ',');

    if (!req.changes.length) {
        helper.error("server.js", "modify", "ProtocolError", req.changes);
        return next(new ldap.ProtocolError('changes required'));
    }

    if (!db[dn]) {
        helper.error("server.js", "modify", "NoSuchObjectError", dn);
        return next(new ldap.NoSuchObjectError(dn));
    }

    const entry = db[dn];

    helper.log("server.js", "modify", "dn", dn);
    helper.log("server.js", "modify", "req.changes", req.changes);

    for (const change of req.changes) {

        var mod = change.modification;

        // search change/add/delete attribute(s) in lowercase, so the first CamelCase variante is kept
        var modType = Object.keys(entry).find(key => key.toLowerCase() === mod.type.toLowerCase()) || mod.type;
        var modVals = mod.vals;

        helper.log("server.js", "modify", "req.changes -> change-details", { operation: change.operation, modType: modType, modVals: modVals });

        //helper.error("server.js", "modify", "modVals2", modVals);
        switch (change.operation) {
            case 'replace':
                if (!entry[modType]) {
                    helper.error("server.js", "modify", "NoSuchAttributeError", modType);
                    return next(new ldap.NoSuchAttributeError(modType));
                }

                if (!modVals || !modVals.length) {
                    delete entry[modType];
                } else {
                    entry[modType] = modVals;

                    //modifiy array to single entry
                    if (['objectclass', 'memberuid', 'member', 'memberof'].indexOf(modType.toLowerCase()) === -1 && entry[modType].length == 1) {
                        entry[modType] = entry[modType][0];
                    }

                }

                break;

            case 'add':
                if (!entry[modType]) {
                    entry[modType] = modVals;
                } else {
                    if (!Array.isArray(entry[modType])) entry[modType] = [entry[modType]];
                    for (const v of modVals) {
                        if (entry[modType].indexOf(v) === -1)
                            entry[modType].push(v);
                    }
                }

                //modifiy array to single entry
                if (['objectclass', 'memberuid', 'member', 'memberof'].indexOf(modType.toLowerCase()) === -1 && entry[modType].length == 1) {
                    entry[modType] = entry[modType][0];
                }
                break;

            case 'delete':
                if (!entry[modType]) {
                    helper.error("server.js", "modify", "NoSuchAttributeError", modType);
                    return next(new ldap.NoSuchAttributeError(modType));
                } else {
                    if (!Array.isArray(entry[modType])) entry[modType] = [entry[modType]];

                    for (const v of modVals) {
                        let idx = entry[modType].indexOf(v);
                        if (idx > -1)
                            entry[modType].splice(idx, 1);
                    }

                    if (entry[modType].length == 0 || !modVals || modVals.length == 0)
                        delete entry[modType];
                }
                break;
        }
    }

    db[dn] = entry;

    helper.SaveJSONtoFile(db, config.LDAP_DATAFILE);
    res.end();
    return next();
});

/* ldapjs modify entries: ENDE */

server.on("error", (error) => {
    helper.error("server.js", "!!! error !!!", error);
});

server.on("uncaughtException", (error) => {
    helper.error("server.js", "!!! uncaughtException !!!", error);
});

server.listen(config.LDAP_PORT, function () {
    console.log("server.js", '---->  LDAP server up at: ', server.url);
    var packagejson = require('./package.json');
    console.log("server.js", '----> ', packagejson.name, 'version:', packagejson.version);
});