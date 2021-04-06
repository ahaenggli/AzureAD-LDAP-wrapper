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

    var lines = fileContents.toString().split('\n');

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


module.exports = helper;