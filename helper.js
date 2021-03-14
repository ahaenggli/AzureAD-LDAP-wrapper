const fs = require('fs');

var helper = {};

helper.SaveJSONtoFile = function (content, file, encoding = 'utf8') {
    content = JSON.stringify(content, null, 2);
    fs.writeFile(file, content, encoding, function (err) {
        if (err) {
            console.log(err);
            return false;
        }
    });
    return true;
};

helper.ReadJSONfile = function (file, encoding = 'utf8') {
    if (fs.existsSync(file))
        return JSON.parse(fs.readFileSync(file, encoding));
    else return {};
};

helper.ReadCSVfile = function (file, func = null, encoding = 'utf8', ignorelines = 0) {
    var fileContents = fs.readFileSync(file, encoding);
    var result = [];

    var lines = fileContents.toString().split('\n');

    for (var i = 0; i < lines.length; i++) {
        if (i > ignorelines && lines[i].toString() != '') {
            row = lines[i].toString().split(',');
            if (func) row = func(row);
            result.push(row);
        }
    }

    return result;
};

module.exports = helper;