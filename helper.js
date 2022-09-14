'use strict';

const config = require('./config');
const fs = require('fs');

var helper = {};

var log = console.log;
var error = console.error;
var warn = console.warn;
helper.log = function () {
    if (config.LDAP_DEBUG) {
        var parameters = Array.prototype.slice.call(arguments);
        log.apply(console, ['INFO: ' + new Date().toISOString() + ": "].concat(parameters));
    }
};
helper.forceLog = function () {
    var parameters = Array.prototype.slice.call(arguments);
    log.apply(console, ['INFO: ' + new Date().toISOString() + ": "].concat(parameters));
};
helper.error = function () {
    var parameters = Array.prototype.slice.call(arguments);
    error.apply(console, ['ERROR: ' + new Date().toISOString() + ": "].concat(parameters));
};
helper.warn = function () {
    var parameters = Array.prototype.slice.call(arguments);
    warn.apply(console, ['WARN: ' + new Date().toISOString() + ": "].concat(parameters));
};

helper.SaveJSONtoFile = function (content, file, encoding = 'utf8') {
    delete content["cn=subschema"];
    content = JSON.stringify(content, null, 2);
    fs.writeFile(file, content, encoding, function (err) {
        if (err) {
            helper.error("helper.js", "error in SaveJSONtoFile for file", file);
            helper.error("helper.js", err);
            return false;
        }
    });
    return true;
};

helper.ReadJSONfile = function (file, encoding = 'utf8') {
    let content;
    if (fs.existsSync(file)) content = fs.readFileSync(file, encoding);
    else return {};

    if (!content || content == "") return {};
    else return JSON.parse(content);
};

helper.ReadCSVfile = function (file, func = null, encoding = 'utf8', ignorelines = 0) {
    var fileContents = fs.readFileSync(file, encoding);
    var result = [];
    var lines = fileContents.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
        if (i > ignorelines && lines[i].toString() != '') {
            let row = lines[i].toString().split(',');
            if (func) row = func(row);
            result.push(row);
        }
    }

    return result;
};

helper.ReadFile = function (file, encoding = 'utf8') {
    if (fs.existsSync(file)) return fs.readFileSync(file, encoding);
    else return "";
};

helper.escapeLDAPspecialChars = function escapeLDAPspecialChars(str) {
    return str.replace(/[,=+<>#;\\]/g, '\\$&');
};

helper.unescapeLDAPspecialChars = function escapeLDAPspecialChars(str) {
    return str.replace(/\\([,=+<>#;\\])/g, '$1');
};



function guidToBytes(guid) {
    var bytes = [];
    guid.split('-').map((number, index) => {
        var bytesInChar = index < 3 ? number.match(/.{1,2}/g).reverse() : number.match(/.{1,2}/g);
        bytesInChar.map((byte) => { bytes.push(parseInt(byte, 16)); });
    });
    return bytes;
}

helper.generateSID = function (modus, level, smbaSIDbase, hash, objectId) {

    // groups
    if (level == 0) {

        if (modus == undefined)
            return "S-1-5-21-" + hash + "-" + hash + "-" + hash;

        if (!modus)
            return smbaSIDbase + "-" + (hash * 2 + 1001);

        if (modus)
            return objectId;

    }
    // users
    else if (level == 1) {

        if (modus == undefined)
            return "S-1-5-21-" + hash + "-" + hash + "-" + hash;

        if (!modus)
            return smbaSIDbase + "-" + (hash * 2 + 1000);

        if (modus) {

            let str = objectId;
            //console.log(str);

            // $d=[UInt32[]]::new(4);
            let d = new Uint32Array(4);
            //console.log(d);

            // [Guid]::Parse($ObjectId).ToByteArray()
            let bytes = guidToBytes(str);
            //console.log(bytes);

            for (let i = 0, len = d.length; i < len; i++) {
                let data = bytes.slice(4 * i, 4 * i + 4);
                // console.log(data);
                let u8 = new Uint8Array(data); // original array
                let u32bytes = u8.buffer.slice(-4); // last four bytes as a new `ArrayBuffer`
                d[i] = new Uint32Array(u32bytes)[0];
            }

            // let b = new ArrayBuffer(bytes);//.copy(d, 0, 0, 16);
            // d = b.slice(0, 16);
            // console.log(d);

            return "S-1-12-1-" + d.join("-");
        }

    }

};

helper.ldap_now = function (offsetDays = 0) {
    let d = new Date();
    if (offsetDays != 0) {
        d.setDate(d.getDate() + offsetDays);
    }
    return d.toISOString().replace(/T/, ' ').replace(/\..+/, '').replaceAll('-', '').replaceAll(':', '').replaceAll(' ', '');
};

helper.ldap_now_2_date = function (vari) {
    if(vari == undefined || vari == "") return;
    const dateString = vari.toString();
    let year = dateString.substring(0, 4);
    let month = dateString.substring(4, 6);
    let day = dateString.substring(6, 8);
    let hours = dateString.substring(8, 10);
    let minutes = dateString.substring(10, 12);
    let seconds = dateString.substring(12, 14);

    return new Date(year, month - 1, day, hours, minutes, seconds);
};

helper.checkEnvVars = function () {
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

    if (!(["none", "domain", "all"].includes(config.LDAP_ANONYMOUSBIND))) {
        helper.error("config", "env var `LDAP_ANONYMOUSBIND` is invalid");
        env_check = false;
    }

    if (fs.existsSync("/app/.cache/IshouldNotExist.txt") && config.LDAP_SAMBANTPWD_MAXCACHETIME != 0) {
        helper.error("config", "The volume /app/.cache/ is not mapped in the Docker container. You will lose your cached credentials from time to time and therefore have problems with Samba access. If you do not intend to cache the credentials, set the environment variable LDAP_SAMBANTPWD_MAXCACHETIME to 0.");
        env_check = false;
    }

    return env_check;
};

module.exports = helper;