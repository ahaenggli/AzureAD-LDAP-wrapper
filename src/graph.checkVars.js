'use strict';

const helper = require('./helper');

const axios = require('axios');
const proxyUrl = (process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "");

if (proxyUrl != "") {
    const HttpsProxyAgent = require('https-proxy-agent');
    axios.defaults.proxy = false;
    axios.defaults.httpsAgent = new HttpsProxyAgent(proxyUrl);
}

const auth = require('./graph.auth');
const fetch = require('./graph.fetch');

const checkVars = async function () {
    let cVars = true;

    const cTenant = await checkTenant(auth.msalConfig.auth.authority);
    if (cTenant) {
        const cApp = await checkApp();
        if (cApp !== false) {
            cVars = await checkPermissions(cApp);
        } else cVars = false;
    }
    else cVars = false;

    return cVars;
};

// check if tenant exists
async function checkTenant(tenant) {
    const tenantURL = `${tenant}v2.0/.well-known/openid-configuration`;

    return axios.get(tenantURL).then(() => {
        return true;
    }).catch((error) => {

        const errResp = error.response || { status: null, statusText: null, data: error.cause };

        helper.error('graph.checkVars.js', 'checkTenant',
            {
                message:
                    'There are some errors with your `AZURE_TENANTID` or your network. Please check your settings.',
                testetUrl: tenantURL,
                errorStatus: errResp.status,
                errorStatusText: errResp.statusText,
                errorDetail: errResp.data
            }
        );

        // check for further DNS errors
        if (!errResp.status) {
            if (error.request && error.request._options)
                checkDNS(error.request._options.hostname);
        }

        return false;
    });
}

// check DNS settings and name resolution (called on specific checkTenant errors)
function checkDNS(url) {
    const dns = require('node:dns');
    helper.log('graph.checkVars.js', 'checkDNS', 'dnsServers', dns.getServers());
    return dns.lookup(url, (err, address, family) => {
        helper.forceLog('graph.checkVars.js', 'checkDNS',
            {
                host: url,
                dnsServers: dns.getServers(),
                address: address,
                ipv: family,
                err: err
            });
    });
}

// try fetch a token to validate AppId and AppSecret for this tenant
async function checkApp() {
    let cApp = false;

    try {
        cApp = await auth.getToken();
    }
    catch (errToken) {
        // failed, no token, something must be wrong
        cApp = false;
        helper.error('graph.checkVars.js', 'checkApp', {
            errorCode: errToken.errorCode,
            errorMessage: errToken.errorMessage,
            subError: errToken.subError || null,
        });
    }

    return cApp;
}

// check permissions `Group.Read.All` and `User.Read.All` for the application
async function checkPermissions(token) {
    let cPermissions = true;

    const groupCount = await fetch.callApi(fetch.apiConfig.gri, token, {}, false);
    const errGroup = groupCount.response || { status: null, statusText: null, data: groupCount };
    if (errGroup.data.hasOwnProperty("error")) {
        cPermissions = false;
        helper.error('graph.checkVars.js', 'checkPermissions:',
            'Probably missing permission `Group.Read.All` for the Application.',
            errGroup.data.error
        );
    }

    const userCount = await fetch.callApi(fetch.apiConfig.uri, token, {}, false);
    const errUser = userCount.response || { status: null, statusText: null, data: userCount };
    if (errUser.data.hasOwnProperty("error")) {
        cPermissions = false;
        helper.error('graph.checkVars.js', 'checkPermissions:',
            'Probably missing permission `User.Read.All` for the Application.',
            errUser.data.error
        );
    }

    return cPermissions;
}

// exports
module.exports = checkVars;