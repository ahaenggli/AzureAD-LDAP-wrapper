'use strict';

const config = require('./config');

const helper = require('./helper');
const ldapwrapper = require('./ldapwrapper');
const ldap = require('ldapjs');
const graph = require('./graph_azuread');

var nthash = require('smbhash').nthash;

var db = helper.ReadJSONfile(config.dataFile);
var lastRefresh = 0;
var server = ldap.createServer();

async function refreshDB() {
    helper.log("server.js", "refreshDB()", "func called");
    if (Date.now() > lastRefresh + 30 * 60 * 1000) {
        db = await ldapwrapper.do();
        lastRefresh = Date.now();
    }
    if (!db) db = helper.ReadJSONfile(config.dataFile);
}

if (!config.AZURE_APP_ID) helper.error("config", "env var `AZURE_APP_ID` must be set");
if (!config.AZURE_APP_SECRET) helper.error("config", "env var `AZURE_APP_SECRET` must be set");
if (!config.AZURE_TENANTID) helper.error("config", "env var `AZURE_TENANTID` must be set");

if (!config.azureDomain) helper.error("config", "env var `LDAP_DOMAIN` must be set");
if (!config.baseDn) helper.error("config", "env var `LDAP_BASEDN` must be set");
if (config.baseDn.indexOf(",") < 0) helper.warn("config", "env var `LDAP_BASEDN` has the wrong format: `dc=DOMAIN,dc=TLD`");
if (config.baseDn.indexOf(" ") > -1) helper.warn("config", "env var `LDAP_BASEDN` should not have spaces in it");

if (!config.LDAP_PORT) helper.error("config", "env var `LDAP_PORT` must be set");
if (!config.LDAP_BINDUSER) helper.forceLog("config", "env var `LDAP_BINDUSER` is not set; If you plan to handle multiple synced users on a Synology-NAS you should set it to bind your NAS with it.");

if (!config.groupDnSuffix) helper.error("config", "env var `LDAP_GROUPSDN` not set correctly");
if (!config.usersDnSuffix) helper.error("config", "env var `LDAP_USERSDN` not set correctly");
if (!config.usersGroupDnSuffix) helper.error("config", "env var `LDAP_USERSGROUPSBASEDN` not set correctly");
if (!config.userRdn) helper.error("config", "env var `LDAP_USERRDN` not set correctly");
if (!config.dataFile) helper.error("config", "env var `LDAP_DATAFILE` not set correctly");

if (isNaN(parseInt(config.LDAP_SAMBANTPWD_MAXCACHETIME))) helper.error("config", "env var `LDAP_SAMBANTPWD_MAXCACHETIME` must be a number.");

// init data from azure before starting the server
refreshDB();

const interval = 30 /*minutes*/ * 60 * 1000;
const interval_func = function () {
    helper.forceLog("server.js", "every 30 minutes refreshDB()");
    try {
        refreshDB();
    } catch (error) {
        helper.error("server.js", "interval_func", error);
    }
};
setInterval(interval_func, interval);

// source: https://www.iana.org/assignments/ldap-parameters/ldap-parameters.xhtml#ldap-parameters-8
const ldapSyntaxes = helper.ReadCSVfile('./data/ldapSyntaxes.csv', function (row) { return '(' + row[0] + ' DESC ' + row[1] + ')'; });

// Auth via azure for binding
server.bind('', (req, res, next) => {
    try {
        var dn = req.dn.toString().replace(/ /g, '');

        helper.log("server.js", "server.bind", dn);

        // dn bind
        var username = dn.replace(config.userRdn + "=", '').replace("," + config.usersDnSuffix, '');
        var pass = req.credentials;

        if (config.LDAP_BINDUSER && config.LDAP_BINDUSER.toString().split("||").indexOf(username + '|' + pass) > -1) {
            helper.log("server.js", "server.bind", username, "binduser, you shall pass");
            res.end();
            return next();
        } else {

            if (config.removeDomainFromCn == true && username.indexOf("@") == -1)
                username = username + "@" + config.azureDomain;

            var userAttributes = removeSensitiveAttributes(req.dn, dn, db[dn]);// db[dn];

            if (!userAttributes || !userAttributes.hasOwnProperty("sambaNTPassword")) {
                helper.log("server.js", "server.bind", username, "Failed login -> mybe not synced yet?");
                return next(new ldap.InvalidCredentialsError());
            } else {

                var check = graph.loginWithUsernamePassword(username, pass);
                var userNtHash = nthash(pass);

                check.then(function (check) {

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
                            helper.SaveJSONtoFile(db, config.dataFile);
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
                });
            }
        }
    }
    catch (error) {
        helper.error("server.js", "server.bind", error);
        return next(new ldap.InvalidCredentialsError());
    }
});

function removeSensitiveAttributes(binduser, dn, attributes) {

    if (attributes && attributes.hasOwnProperty("sambaNTPassword")) {
        var allowSensitiveAttributes = false;

        if (binduser.equals(dn)) allowSensitiveAttributes = true;

        if (config.LDAP_BINDUSER) {
            for (var u of config.LDAP_BINDUSER.toString().split("||")) {
                u = u.split("|")[0];
                var username = binduser.toString().toLowerCase().replace(/ /g, '').replace(config.userRdn + "=", '').replace("," + config.usersDnSuffix, '');
                if (u === username) allowSensitiveAttributes = true;
            }
        }

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

// search
server.search('', (req, res, next) => {
    try {
        var dn = req.dn.toString().toLowerCase().replace(/ /g, '');
        if (!dn) dn = config.baseDn;

        helper.log("server.js", "server.search", 'Search for => DB: ' + dn + '; Scope: ' + req.scope + '; Filter: ' + req.filter + '; Attributes: ' + req.attributes + ';');

        var schemadb = ['cn=SubSchema', 'cn=schema,cn=config'].map(v => v.toLowerCase());
        if (schemadb.indexOf(dn.toLowerCase()) > -1) {

            res.send({
                dn: dn,
                attributes: {
                    ldapSyntaxes: ldapSyntaxes
                }
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

server.on("uncaughtException", (error) => {
    helper.error("server.js", "!!! uncaughtException !!!", error);
})

server.listen(config.LDAP_PORT, function () {
    console.log("server.js", '---->  LDAP server up at: ', server.url);
});