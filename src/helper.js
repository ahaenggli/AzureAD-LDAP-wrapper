'use strict';

const config = require('./config');
const fs = require('fs');
const crypto = require('crypto');

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
helper.trace = function () {
    //if (config.LDAP_DEBUG) {
    var parameters = Array.prototype.slice.call(arguments);
    log.apply(console, ['TRACE: ' + new Date().toISOString() + ": "].concat(parameters));
    //}
};
helper.debug = function () {
    //if (config.LDAP_DEBUG) {
    var parameters = Array.prototype.slice.call(arguments);
    log.apply(console, ['DEBUG: ' + new Date().toISOString() + ": "].concat(parameters));
    //}
};
helper.SaveJSONtoFile = function (content, file, encoding = 'utf8') {
    delete content["cn=subschema"];
    content = JSON.stringify(content, null, 2);
    try {
        fs.writeFileSync(file, content, encoding);
    } catch (err) {

        helper.error("helper.js", "error in SaveJSONtoFile for file", file);
        helper.error("helper.js", err);
        return false;
    }
    return true;
};

helper.IsJsonString = function IsJsonString(str) {
    if (typeof str !== 'string' || str == undefined || str == "") return false;

    try {
        var json = JSON.parse(str);
        return (typeof json === 'object');
    } catch (e) {
        return false;
    }
};

helper.ReadJSONfile = function (file, encoding = 'utf8') {
    let content;
    if (fs.existsSync(file)) content = fs.readFileSync(file, encoding);
    else return {};

    if (!content || content == "") return {};
    else return (helper.IsJsonString(content)) ? JSON.parse(content) : {};
};

helper.ReadCSVfile = function (file, func = null, encoding = 'utf8', ignorelines = -1) {
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


/**
 * 
 * @param {strValue} value to encode as md4 string
 * @returns md4 encoded value
 */
helper.md4 = function (strValue) {
    // convert to unicode (UCS2LE) because of special characters
    strValue = Buffer.from(strValue, 'UCS2');
    // create and return md4
    return crypto.createHash("md4").update(strValue).digest("hex").toUpperCase();
};



/**
 * 
 * @param {offsetDays} days before or after the current date
 * @returns datetime string (UTC)
 */
helper.ldap_now = function (offsetDays = 0) {
    let d = new Date();
    if (offsetDays != 0) {
        d.setDate(d.getDate() + offsetDays);
    }
    return d.toISOString().replace(/T/, ' ').replace(/\..+/, '').replaceAll('-', '').replaceAll(':', '').replaceAll(' ', '');
};

/**
 * 
 * @param {strDate} datetime string
 * @returns Date (UTC)
 */
helper.ldap_now_2_date = function (strDate) {
    if (strDate == undefined || strDate == "") return;
    const dateString = strDate.toString();
    let year = dateString.substring(0, 4);
    let month = dateString.substring(4, 6);
    let day = dateString.substring(6, 8);
    let hours = dateString.substring(8, 10);
    let minutes = dateString.substring(10, 12);
    let seconds = dateString.substring(12, 14);

    return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, 0));
};

module.exports = helper;