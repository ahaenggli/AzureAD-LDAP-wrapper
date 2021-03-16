const config = require('./config');

const helper = require('./helper');
const creator = require('./create_ldap_entries');
const ldap = require('ldapjs');
const graph = require('./graph_azure');

var nthash = require('smbhash').nthash;
//var lmhash = require('smbhash').lmhash;

// defines
var db = helper.ReadJSONfile(config.dataFile);
var lastRefresh = 0;
var server = ldap.createServer();

async function refreshDB() {
    if (Date.now() > lastRefresh + 30 * 60 * 1000) {
        db = await creator.do();
        lastRefresh = Date.now();
    }
}

refreshDB();

const interval = 30 /*minutes*/ * 60 * 1000;
const interval_func = function () {
    console.log("I am doing my 30 minutes refreshDB().");
    refreshDB();
    setInterval(interval_func, interval);
};
setInterval(interval_func, interval);

// Auth via azure for binding
server.bind('', (req, res, next) => {
    var dn = req.dn.toString().replace(/ /g, '');

    //console.log('bind => ', dn);
    //console.log(req.credentials);

    // dn bind
    var username = dn.replace(config.userRdn + "=", '').replace("," + config.usersDnSuffix, '');;
    var pass = req.credentials;

    if (config.LDAP_BINDUSER && config.LDAP_BINDUSER == username + '|' + pass) {
        //console.log("binduser, you shall pass");
        res.end();
        return next();
    }

    if (config.removeDomainFromCn == true && username.indexOf("@") == -1)
        username = username + "@" + config.azureDomain;

    var check = graph.loginWithUsernamePassword(username, pass);
    check.then(function (check) {
        //console.log('check => ', check);

        if (check) {
            //console.log("you shall pass");
            //return next(new ldap.InvalidCredentialsError());
            var userAtts = db[dn];
            //console.log(userAtts);
            if (userAtts && userAtts.hasOwnProperty("sambaNTPassword")) {
                var userNtHash = nthash(pass);
                if (userAtts["sambaNTPassword"] != userNtHash) {
                    console.log("Saving NT password hash for user " + dn);
                    userAtts["sambaNTPassword"] = userNtHash;
                    userAtts["sambaPwdLastSet"] = Math.floor(Date.now() / 1000);
                    db[dn] = userAtts;
                    // save the data file
                    helper.SaveJSONtoFile(db, config.dataFile);
                }
            }

            res.end();
            return next();
        }
        else {
            //console.log(username + ": Failed login");
            return next(new ldap.InvalidCredentialsError());
        }
    });
});


// search
server.search('', (req, res, next) => {
    var dn = req.dn.toString().replace(/ /g, '');
    if (!dn) dn = config.baseDn;

    //console.log('Search for => DB: ' + dn + '; Scope: ' + req.scope + '; Filter: ' + req.filter + '; Attributes: ' + req.attributes + ';');

    var schemadb = ['cn=SubSchema', 'cn=schema,cn=config'].map(v => v.toLowerCase());
    if (schemadb.indexOf(dn.toLowerCase()) > -1) {

        // source: https://www.iana.org/assignments/ldap-parameters/ldap-parameters.xhtml#ldap-parameters-8
        var ldapSyntaxes = helper.ReadCSVfile('./data/ldapSyntaxes.csv', function (row) { return '(' + row[0] + ' DESC ' + row[1] + ')'; });

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
            return;
        if (req.filter.matches(db[key])) {
            res.send({
                dn: key,
                attributes: db[key]
            });
        }
    }

    res.end();
    return next();
});


server.listen(config.LDAP_PORT, function () {
    console.log('LDAP server up at: %s', server.url);
});