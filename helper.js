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
        bytesInChar.map((byte) => { bytes.push(parseInt(byte, 16)); })
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
        
    if (modus){
        
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

         return "S-1-12-1-"+d.join("-");        
    }

    }

};

module.exports = helper;