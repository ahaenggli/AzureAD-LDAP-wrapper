'use strict';

const fs = require('fs');

if (!process.env["SKIP_DOTENV"])
    require('dotenv').config();

const config = {};
let validated = true;
let errors = [];

function nonWhiteSpaceLowerCase(val) { return (val === undefined || val === null) ? val : val.toLowerCase().replace(/ /g, ''); }
function nonWhiteSpaceUpperCase(val) { return val.toUpperCase().replace(/ /g, ''); }

function validateDN(val) {
    let res = true;
    if (val.indexOf(",") < 0) {
        res = false;
        errors.push("Format wrong. It should be: `dc=DOMAIN,dc=TLD`");
    }
    return res;
}

const allConfigs = {
    // Azure
    AZURE_APP_ID: { format: "String", required: true, default: null, transform: (val) => (val === "*secret*") ? null : val },
    AZURE_APP_SECRET: { format: "String", required: true, default: null, transform: (val) => (val === "*secret*") ? null : val },
    AZURE_TENANTID: { format: "String", required: true, default: null, transform: (val) => (val === "*secret*") ? null : val },
    AZURE_ENDPOINT: { format: "String", required: true, default: 'https://login.microsoftonline.com/', transform: (url) => url.replace(/\/$/, '') },

    // GRAPH
    GRAPH_ENDPOINT: { format: "String", required: true, default: 'https://graph.microsoft.com/', transform: (url) => url.replace(/\/$/, '') },
    GRAPH_API_VERSION: { format: "String", required: true, default: 'v1.0', transform: (url) => url.replace(/\/$/, '') },

    GRAPH_FILTER_USERS: { format: "String", required: false, default: null, transform: "TRIM" },
    GRAPH_FILTER_GROUPS: { format: "String", required: false, default: null, transform: "TRIM" },
    GRAPH_IGNORE_MFA_ERRORS: { format: "Boolean", required: false, default: true },
    LDAP_SYNC_TIME: { format: "Integer", required: false, default: 30 /* minutes */ },
    LDAP_DAYSTOKEEPDELETEDUSERS: { format: "Integer", required: false, default: 7 /* days */ },

    //LDAP
    LDAP_PORT: { format: "Integer", required: true, default: 389, validate: "PORT" },
    LDAP_BINDUSER: { format: "String", required: true, default: null, validate: (val) => { return ((val || "").indexOf("|") > -1); } },
    LDAP_DOMAIN: { format: "String", required: true, default: "example.net", transform: nonWhiteSpaceLowerCase },
    LDAP_BASEDN: { format: "String", required: true, default: () => "dc=" + config.LDAP_DOMAIN.split(".").join(",dc="), transform: nonWhiteSpaceLowerCase, validate: validateDN },

    //
    LDAP_ANONYMOUSBIND: { format: "enum", required: true, default: "domain", enum: ["domain", "all", "none"], transform: nonWhiteSpaceLowerCase },
    LDAP_SENSITIVE_ATTRIBUTES: { format: "String", required: false, transform: nonWhiteSpaceLowerCase },
    LDAP_SECURE_ATTRIBUTES: { format: "String", required: false, transform: nonWhiteSpaceLowerCase },
    LDAP_ALLOWCACHEDLOGINONFAILURE: { format: "Boolean", required: false, default: true },

    LDAP_GROUPSDN: { format: "String", required: true, default: () => "cn=groups," + config.LDAP_BASEDN, transform: nonWhiteSpaceLowerCase, validate: validateDN },
    LDAP_USERSDN: { format: "String", required: true, default: () => "cn=users," + config.LDAP_BASEDN, transform: nonWhiteSpaceLowerCase, validate: validateDN },
    LDAP_USERSGROUPSBASEDN: { format: "String", required: true, default: () => "cn=users," + config.LDAP_GROUPSDN, transform: nonWhiteSpaceLowerCase, validate: validateDN },

    LDAP_USERRDN: { format: "String", required: true, default: "uid", transform: nonWhiteSpaceLowerCase },
    LDAP_DATAFILE: { format: "String", required: true, default: "./.cache/azure.json", transform: "TRIM" },

    // LDAPS
    LDAPS_CERTIFICATE: { format: "String", required: false, default: null },
    LDAPS_KEY: { format: "String", required: false, default: null },

    // SAMBA
    LDAP_SAMBADOMAINNAME: { format: "String", required: true, default: () => config.LDAP_BASEDN.split(",")[0].replace("dc=", "") },
    LDAP_SAMBASIDBASE: { format: "String", required: true, default: "S-1-5-21-2475342291-1480345137-508597502", transform: nonWhiteSpaceUpperCase },
    LDAP_SAMBA_USEAZURESID: { format: "Boolean", required: false, default: true },
    LDAP_SAMBANTPWD_MAXCACHETIME: { format: "Integer", required: false, default: -1 },

    // misc
    DSM7: { format: "Boolean", default: true },
    LDAP_DEBUG: { format: "Boolean", default: false },
};

// Check that all required settings are defined
Object.keys(allConfigs).forEach((key) => {

    try {
        if (allConfigs[key].default instanceof Function)
            allConfigs[key].default = allConfigs[key].default();
    } catch (error) {
        validated = false;
        allConfigs[key].default = null;
    }
    let value = (process.env[key] || allConfigs[key].default || "");
    value = value.toString().trim();

    if (allConfigs[key].format === "Integer") {
        value = parseInt(value);
        if (isNaN(value)) {
            value = null || allConfigs[key].default;
            validated = false;
            errors.push(`Environment variable '${key}' must be a number.`);
        }
    }
    else if (allConfigs[key].format === "Boolean") {
        value = (value === true || value.toLowerCase() == "true" || value.toLowerCase() == "1");
    }
    else if (allConfigs[key].format === "enum") {
        if (allConfigs[key].enum.indexOf(value) === -1) {
            value = null;
            validated = false;
            errors.push(`Environment variable '${key}' must be one of the following values: `, allConfigs[key].enum);
        }
    }

    if (value === undefined || value === null || value.length == 0) value = null;

    if (allConfigs[key].hasOwnProperty("transform")) {
        if (allConfigs[key].transform === "TRIM") {
            value = (value || "").trim();
        }
        if (allConfigs[key].transform instanceof Function) {
            value = allConfigs[key].transform(value);
        }

        if (value === undefined || value === null || value.length == 0) value = null;
    }

    if (allConfigs[key].hasOwnProperty("validate")) {

        if (allConfigs[key].validate === "PORT") {
            if (value < 0 || value > 65536) {
                validated = false;
                errors.push(`Environment variable '${key}' is a port. Port number must be set between 1 and 65536.`);
                value = null;
            }
        }

        if (allConfigs[key].validate instanceof Function) {
            if (!allConfigs[key].validate(value)) {
                validated = false;
                errors.push(`Environment variable '${key}' validation failed. Value '${value}' is invalid.`);
                value = null;
            }
        }
    }

    if (allConfigs[key].required && value === null) {
        validated = false;
        errors.push(`Required environment variable '${key}' is missing.`);
    }

    config[key] = value;

});

// validateLDAPS
if ((config.LDAPS_CERTIFICATE || config.LDAPS_KEY) && !(config.LDAPS_CERTIFICATE && config.LDAPS_KEY)) {
    errors.push("config", "env var `LDAPS_CERTIFICATE` AND `LDAPS_KEY` must be set.");
    validated = false;
}
if (config.LDAPS_CERTIFICATE && config.LDAPS_KEY && config.LDAP_PORT != 636) {
    errors.push("config", "LDAPS usually runs on port 636. So you may need to set the env var `LDAP_PORT` to 636.");
}

// validateMAXcacheTime
if (fs.existsSync("./.cache/IshouldNotExist.txt") && config.LDAP_SAMBANTPWD_MAXCACHETIME != 0) {
    errors.push("config", "The volume /app/.cache/ is not mapped in the Docker container. You will lose your cached credentials from time to time and therefore have problems with Samba access. If you do not intend to cache the credentials, set the environment variable LDAP_SAMBANTPWD_MAXCACHETIME to 0.");
    validated = false;
}


config['VARS_VALIDATED'] = validated;
config['VARS_ERRORS'] = errors;

// Export the config object
module.exports = config;
