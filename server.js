'use strict';

const helper = require('./helper');
const config = require('./config');

var env_check = true;

if (!config.AZURE_APP_ID) { helper.error("config", "env var `AZURE_APP_ID` must be set"); env_check = false; }
if (!config.AZURE_APP_SECRET) { helper.error("config", "env var `AZURE_APP_SECRET` must be set"); env_check = false; }
if (!config.AZURE_TENANTID) { helper.error("config", "env var `AZURE_TENANTID` must be set"); env_check = false; }

if (!config.LDAP_DOMAIN) { helper.error("config", "env var `LDAP_DOMAIN` must be set"); env_check = false; }
if (!config.LDAP_BASEDN) { helper.error("config", "env var `LDAP_BASEDN` must be set"); env_check = false; }
if (config.LDAP_BASEDN.indexOf(",") < 0) { helper.warn("config", "env var `LDAP_BASEDN` has the wrong format: `dc=DOMAIN,dc=TLD`"); }
if (config.LDAP_BASEDN.indexOf(" ") > -1) { helper.warn("config", "env var `LDAP_BASEDN` should not have spaces in it"); }

if (!config.LDAP_PORT) { helper.error("config", "env var `LDAP_PORT` must be set"); env_check = false; }
if (!config.LDAP_BINDUSER) helper.forceLog("config", "env var `LDAP_BINDUSER` is not set; If you plan to handle multiple synced users on a Synology-NAS you should set it to bind your NAS with it.");

if (!config.LDAP_GROUPSDN) { helper.error("config", "env var `LDAP_GROUPSDN` not set correctly"); env_check = false; }
if (!config.LDAP_USERSDN) { helper.error("config", "env var `LDAP_USERSDN` not set correctly"); env_check = false; }
if (!config.LDAP_USERSGROUPSBASEDN) { helper.error("config", "env var `LDAP_USERSGROUPSBASEDN` not set correctly"); env_check = false; }
if (!config.LDAP_USERRDN) { helper.error("config", "env var `LDAP_USERRDN` not set correctly"); env_check = false; }
if (!config.LDAP_DATAFILE) { helper.error("config", "env var `LDAP_DATAFILE` not set correctly"); env_check = false; }
if (!config.LDAP_SYNC_TIME) { helper.error("config", "env var `LDAP_SYNC_TIME` not set correctly"); env_check = false; }

if (isNaN(parseInt(config.LDAP_SAMBANTPWD_MAXCACHETIME))) { helper.error("config", "env var `LDAP_SAMBANTPWD_MAXCACHETIME` must be a number."); env_check = false; }

if ((config.LDAPS_CERTIFICATE || config.LDAPS_KEY) && !(config.LDAPS_CERTIFICATE && config.LDAPS_KEY)) { helper.error("config", "env var `LDAPS_CERTIFICATE` AND `LDAPS_KEY` must be set."); env_check = false; }
if (config.LDAPS_CERTIFICATE && config.LDAPS_KEY && config.LDAP_PORT != 636) { helper.warn("config", "LDAPS usually runs on port 636. So you may need to set the env var `LDAP_PORT` to 636."); }
if (!env_check) return;

const ldapwrapper = require('./ldapwrapper');
const ldap = require('ldapjs');
const graph = require('./graph_azuread');

var nthash = require('smbhash').nthash;


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
    /* Any user may search after bind, only cn=root has full power */
    var bindi = req.connection.ldap.bindDN.toString().replace(/ /g, '');
    var username = bindi.toLowerCase().replace(config.LDAP_USERRDN + "=", '').replace("," + config.LDAP_USERSDN, '');

    const isSearch = (req instanceof ldap.SearchRequest);
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

    if (attributes && attributes.hasOwnProperty("sambaNTPassword")) {
        var allowSensitiveAttributes = false;

        if (binduser.equals(dn)) allowSensitiveAttributes = true;
        if (isUserENVBindUser(binduser)) allowSensitiveAttributes = true;

        if (config.LDAP_SAMBANTPWD_MAXCACHETIME && attributes["sambaPwdLastSet"])
            if (config.LDAP_SAMBANTPWD_MAXCACHETIME != -1)
                if ((attributes["sambaPwdLastSet"] + config.LDAP_SAMBANTPWD_MAXCACHETIME * 60) < Math.floor(Date.now() / 1000))
                    allowSensitiveAttributes = false;

        if (!allowSensitiveAttributes) {
            attributes["sambaNTPassword"] = "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
            attributes["sambaPwdLastSet"] = 0;
        }

    }

    return attributes;
}


// Auth via azure for binding
server.bind(SUFFIX, async (req, res, next) => {
    try {
        var dn = req.dn.toString().replace(/ /g, '');

        helper.log("server.js", "server.bind", dn);

        // dn bind
        var username = dn.replace(config.LDAP_USERRDN + "=", '').replace("," + config.LDAP_USERSDN, '');
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
                let searchDN = Object.values(db).filter(g => (g.hasOwnProperty("AzureADuserPrincipalName"))).filter(g => g.AzureADuserPrincipalName == username);
                if (searchDN.length == 1) dn = searchDN[0]["entryDN"];
            }

            var userAttributes = db[dn]; // removeSensitiveAttributes(req.dn, dn, db[dn]);//

            if (!userAttributes || !userAttributes.hasOwnProperty("sambaNTPassword") || !userAttributes.hasOwnProperty("AzureADuserPrincipalName")) {
                helper.log("server.js", "server.bind", username, "Failed login -> mybe not synced yet?");
                return next(new ldap.InvalidCredentialsError());
            } else {

                var check = await graph.loginWithUsernamePassword(userAttributes["AzureADuserPrincipalName"], pass);
                helper.log("server.js", "server.bind", "check", check);

                var userNtHash = nthash(pass);

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

                        // save the data file
                        db[dn] = userAttributes;
                        helper.SaveJSONtoFile(db, config.LDAP_DATAFILE);
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
        var dn = req.dn.toString().toLowerCase().replace(/ /g, '');
        if (!dn) dn = config.LDAP_BASEDN;

        helper.log("server.js", "server.search", 'Search for => DB: ' + dn + '; Scope: ' + req.scope + '; Filter: ' + req.filter + '; Attributes: ' + req.attributes + ';');

        if (['cn=SubSchema', 'cn=schema,cn=config', 'cn=schema,cn=configuration'].map(v => v.toLowerCase()).indexOf(dn.toLowerCase()) > -1) {
            res.send({
                dn: dn,
                attributes: schemaDB
            });
            res.end();
            return next();
        }

        if (!db[dn])
            return next(new ldap.NoSuchObjectError(dn));

        let scopeCheck;

        let bindDN = req.connection.ldap.bindDN;

        switch (req.scope) {
            case 'base':

                if (req.filter.matches(removeSensitiveAttributes(bindDN, dn, db[dn]))) {
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

        const keys = Object.keys(db);
        for (const key of keys) {
            if (!scopeCheck(key))
                continue;

            if (req.filter.matches(removeSensitiveAttributes(bindDN, key, db[key]))) {
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
    const dn = req.dn.toString().toLowerCase().replace(/  /g, ' ').replace(/, /g, ',');

    if (!db[dn])
        return next(new ldap.NoSuchObjectError(dn));

    // case in-sensitive
    req.attribute = Object.keys(db[dn]).find(key => key.toLowerCase() === req.attribute.toLowerCase()) || req.attribute;

    if (!db[dn][req.attribute])
        return next(new ldap.NoSuchAttributeError(req.attribute));

    const matches = false;
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
    const dn = req.dn.toString().toLowerCase().replace(/  /g, ' ').replace(/, /g, ',');

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
    const dn = req.dn.toString().toLowerCase().replace(/  /g, ' ').replace(/, /g, ',');

    if (!db[dn]) {
        helper.error("server.js", "del", "NoSuchObjectError", dn);
        return next(new ldap.NoSuchObjectError(dn));
    }

    delete db[dn];

    helper.SaveJSONtoFile(db, config.LDAP_DATAFILE);
    res.end();
    return next();
});

// edit entries
server.modify(SUFFIX, authorize, (req, res, next) => {
    const dn = req.dn.toString().toLowerCase().replace(/  /g, ' ').replace(/, /g, ',');

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

        // change search attribute(s) to make it "case in-sensitive"
        var modType = Object.keys(entry).find(key => key.toLowerCase() === mod.type.toLowerCase()) || mod.type;
        var modVals = mod.vals;

        // modifiy array to single entry
        if (['objectclass', 'memberuid', 'member', 'memberof'].indexOf(modType.toLowerCase()) === -1 && modVals.length == 1) {
            modVals = modVals[0];
        }

        //helper.error("server.js", "modify", "modVals2", modVals);
        switch (change.operation) {
            case 'replace':
                if (!entry[modType]) {
                    helper.error("server.js", "modify", "NoSuchAttributeError", modType);
                    return next(new ldap.NoSuchAttributeError(modType));
                }
                //helper.error("server.js", "modify", "Info", modType);
                //helper.error("server.js", "modify", "Info", modVals);


                if (!modVals || !modVals.length) {
                    delete entry[modType];
                } else {
                    entry[modType] = modVals;
                }

                break;

            case 'add':
                if (!entry[modType]) {
                    entry[modType] = modVals;
                } else {
                    for (const v of modVals) {
                        if (entry[modType].indexOf(v) === -1)
                            entry[modType].push(v);
                    }
                }

                break;

            case 'delete':
                if (!entry[modType]) {
                    helper.error("server.js", "modify", "NoSuchAttributeError", modType);
                    return next(new ldap.NoSuchAttributeError(modType));
                } else {
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
})

server.on("uncaughtException", (error) => {
    helper.error("server.js", "!!! uncaughtException !!!", error);
})

server.listen(config.LDAP_PORT, function () {
    console.log("server.js", '---->  LDAP server up at: ', server.url);
});