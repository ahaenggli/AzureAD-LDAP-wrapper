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

        helper.log("server.bind", 'bind => ', dn);

        // dn bind
        var username = dn.replace(config.userRdn + "=", '').replace("," + config.usersDnSuffix, '');;
        var pass = req.credentials;

        if (config.LDAP_BINDUSER && config.LDAP_BINDUSER == username + '|' + pass) {
            helper.log("server.bind", "binduser, you shall pass");
            res.end();
            return next();
        }

        if (config.removeDomainFromCn == true && username.indexOf("@") == -1)
            username = username + "@" + config.azureDomain;

        var check = graph.loginWithUsernamePassword(username, pass);
        check.then(function (check) {
            //helper.log('check => ', check);

            if (check) {
                helper.log("server.bind", "check=true: you shall pass");
                //return next(new ldap.InvalidCredentialsError());
                var userAttributes = db[dn];
                //helper.log(userAttributes);
                if (userAttributes && userAttributes.hasOwnProperty("sambaNTPassword")) {
                    var userNtHash = nthash(pass);
                    if (userAttributes["sambaNTPassword"] != userNtHash) {
                        helper.log("server.bind", "Saving NT password hash for user " + dn);
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
            else {
                helper.error("server.bind", username + ": Failed login");
                return next(new ldap.InvalidCredentialsError());
            }
        });
    }
    catch (error) {
        helper.error("server.bind", error);
        return next(new ldap.InvalidCredentialsError());
    }
});


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

        switch (req.scope) {
            case 'base':
                if (req.filter.matches(db[dn])) {
                    res.send({
                        dn: dn,
                        attributes: db[dn]
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
            if (req.filter.matches(db[key])) {
                res.send({
                    dn: key,
                    attributes: db[key]
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

server.listen(config.LDAP_PORT, function () {
    helper.log('LDAP server up at: ', server.url);
});