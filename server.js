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
    if (Date.now() > lastRefresh + 30 * 60 * 1000) {
        db = await ldapwrapper.do();
        lastRefresh = Date.now();
    }
    if (!db) db = helper.ReadJSONfile(config.dataFile);
}

// init data from azure before starting the server
refreshDB();

const interval = 30 /*minutes*/ * 60 * 1000;
const interval_func = function () {
    helper.log("every 30 minutes refreshDB()");
    try {
        refreshDB();
    } catch (error) {
        helper.error("interval_func", error);
    }
};
setInterval(interval_func, interval);

// source: https://www.iana.org/assignments/ldap-parameters/ldap-parameters.xhtml#ldap-parameters-8
const ldapSyntaxes = helper.ReadCSVfile('./data/ldapSyntaxes.csv', function (row) { return '(' + row[0] + ' DESC ' + row[1] + ')'; });

// Auth via azure for binding
server.bind('', (req, res, next) => {
    try {
        var dn = req.dn.toString().replace(/ /g, '');

        helper.log("server.bind", dn);

        // dn bind
        var username = dn.replace(config.userRdn + "=", '').replace("," + config.usersDnSuffix, '');
        var pass = req.credentials;

        if (config.LDAP_BINDUSER && config.LDAP_BINDUSER.toString().split("||").indexOf(username + '|' + pass) > -1) {
            helper.log("server.bind", username, "binduser, you shall pass");
            res.end();
            return next();
        } else {

            if (config.removeDomainFromCn == true && username.indexOf("@") == -1)
                username = username + "@" + config.azureDomain;

            var userAttributes = db[dn];

            if (!userAttributes || !userAttributes.hasOwnProperty("sambaNTPassword")) {
                helper.log("server.bind", username, "Failed login -> mybe not synced yet?");
                return next(new ldap.InvalidCredentialsError());
            } else {

                var check = graph.loginWithUsernamePassword(username, pass);
                var userNtHash = nthash(pass);

                check.then(function (check) {

                    if (check === 1) {
                        helper.log("server.bind", username, "check=true: you shall pass");

                        //helper.log(userAttributes);
                        if (userAttributes && userAttributes.hasOwnProperty("sambaNTPassword")) {

                            if (userAttributes["sambaNTPassword"] != userNtHash) {
                                helper.log("server.bind", username, "Saving NT password hash for user " + dn);
                                userAttributes["sambaNTPassword"] = userNtHash;
                                userAttributes["sambaPwdLastSet"] = Math.floor(Date.now() / 1000);
                                db[dn] = userAttributes;
                                // save the data file
                                helper.SaveJSONtoFile(db, config.dataFile);
                            }
                        }

                        res.end();
                        return next();
                    }
                    else if (check === 2 && config.LDAP_ALLOWCACHEDLOGINONFAILURE) {
                        helper.error("server.bind", username, "wrong password, retry against sambaNTPassword");
                        if (userAttributes && userAttributes.hasOwnProperty("sambaNTPassword")) {
                            if (userAttributes["sambaNTPassword"] === userNtHash) {
                                res.end();
                                return next();
                            }
                        }
                        return next(new ldap.InvalidCredentialsError());
                    }
                    else {
                        helper.error("server.bind", username, " -> Failed login");
                        return next(new ldap.InvalidCredentialsError());
                    }
                });
            }
        }
    }
    catch (error) {
        helper.error("server.bind", error);
        return next(new ldap.InvalidCredentialsError());
    }
});

function removeSensitiveAttributes(binduser, dn, attributes) {
    var allowSensitiveAttributes = false;

    if (binduser.equals(dn)) allowSensitiveAttributes = true;

    if (config.LDAP_BINDUSER) {
        for (var u of config.LDAP_BINDUSER.toString().split("||")) {
            u = u.split("|")[0];
            var username = binduser.toString().toLowerCase().replace(/ /g, '').replace(config.userRdn + "=", '').replace("," + config.usersDnSuffix, '');
            if (u === username) allowSensitiveAttributes = true;
        }
    }

    if (!allowSensitiveAttributes) {
        if (attributes && attributes.hasOwnProperty("sambaNTPassword")) attributes.sambaNTPassword = "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
        if (attributes && attributes.hasOwnProperty("sambaPwdLastSet")) attributes.sambaPwdLastSet = 0;
    }
    return attributes;
}


// search
server.search('', (req, res, next) => {
    try {
        var dn = req.dn.toString().toLowerCase().replace(/ /g, '');
        if (!dn) dn = config.baseDn;

        helper.log("server.search", 'Search for => DB: ' + dn + '; Scope: ' + req.scope + '; Filter: ' + req.filter + '; Attributes: ' + req.attributes + ';');

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
        helper.error("server.search", error);
    }
});

server.on("uncaughtException", (error) => {
    helper.error("!!! uncaughtException !!!", error);
})

server.listen(config.LDAP_PORT, function () {
    console.log('LDAP server up at: ', server.url);
});

