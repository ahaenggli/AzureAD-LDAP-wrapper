'use strict';

const config = require('./config');
const helper = require('./helper');
const customizer = require('./customizer/customizer');

const proxyUrl = (process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "");
const proxyClient = require('./proxyClient.js');

const msal = require('@azure/msal-node');
const aIdentity = require("@azure/identity");
const axios = require('axios');

const TOKEN_ENDPOINT = `https://login.microsoftonline.com/${config.AZURE_TENANTID}/`;
const MS_GRAPH_SCOPE = 'https://graph.microsoft.com/';

var graph = {};
/**
 * With client credentials flows permissions need to be granted in the portal by a tenant administrator.
 * The scope is always in the format '<resource>/.default'. For more, visit:
 * https://docs.microsoft.com/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow
 */
graph.tokenRequest = {
    scopes: [MS_GRAPH_SCOPE + '.default'],
};

graph.apiConfig = {
    uri: MS_GRAPH_SCOPE + 'v1.0/users?$select=businessPhones,displayName,givenName,jobTitle,mail,mobilePhone,officeLocation,preferredLanguage,surname,userPrincipalName,id,identities,userType,externalUserState' + config.GRAPH_FILTER_USERS,
    gri: MS_GRAPH_SCOPE + 'v1.0/groups?' + config.GRAPH_FILTER_GROUPS,
    mri: MS_GRAPH_SCOPE + 'v1.0/groups/{id}/members',
};

graph.apiConfig = customizer.modifyGraphApiConfig(graph.apiConfig, MS_GRAPH_SCOPE);

/**
 * Initialize a confidential client application. For more info, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/initialize-confidential-client-application.md
 */

const msalConfig = {
    auth: {
        clientId: config.AZURE_APP_ID,
        authority: TOKEN_ENDPOINT,                
        knownAuthorities: [TOKEN_ENDPOINT],        
        clientSecret: config.AZURE_APP_SECRET
        },
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
                if(!containsPii)
                helper.log("graph_azuread.js", "system.loggerOptions", loglevel, message);
            },
            piiLoggingEnabled: false,
            logLevel: msal.LogLevel.Verbose,
        },
    }
};

/**
 * Proxy support
 *  - set MSAL networkClient to proxyClient
 *  - set defaults axios proxy 
 */
if (proxyUrl != "") {
    msalConfig.system.networkClient = proxyClient;
    const HttpsProxyAgent = require('https-proxy-agent');
    axios.defaults.proxy = false;
    axios.defaults.httpsAgent = new HttpsProxyAgent(proxyUrl);
}

const cca = new msal.ConfidentialClientApplication(msalConfig);



/**
 * Acquires token with client credentials.
 * @param {object} tokenRequest
 */
graph.getToken = async function getToken(tokenRequest) {
    return await cca.acquireTokenByClientCredential(tokenRequest);
};

/**
 * Calls the endpoint with authorization bearer token.
 * @param {string} endpoint
 * @param {string} accessToken
 */
graph.callApi = async function callApi(endpoint, accessToken, opts = {}) {

    const options = {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    };

    if (opts.id)
        endpoint = endpoint.replace('{id}', opts.id);

    try {
        let data = [];
        let response = await axios.default.get(endpoint, options);
        data = [...data, ...response.data.value];

        // call nextLink as long as it exists, so all data should be fetched
        while (response.data.hasOwnProperty('@odata.nextLink')) {
            helper.log('graph_azuread.js', "callApi", { endpoint: endpoint, '@odata.nextLink': response.data['@odata.nextLink'] });
            response = await axios.default.get(response.data['@odata.nextLink'], options);
            // concat previous (nextLink-)data with current nextLink-data
            data = [...data, ...response.data.value];
        }

        return data;
    } catch (error) {
        helper.error('graph_azuread.js', 'callApi-error', error);
        helper.error('graph_azuread.js', 'callApi-endpoint', endpoint);
        helper.error('graph_azuread.js', 'callApi-opts', opts);
        return error;
    }
};



/**
 * Try login with username and password
 * @param {string} username
 * @param {string} password
 */
graph.loginWithUsernamePassword = async function loginWithUsernamePassword(username, password) {

    /* 
    * AAD errors are masked by misleading "network_error" from MSAL node
    * So, some needed informations are missing - change to this if it is fixed 
    * https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/4878
    */
    /*
        const pca = new msal.PublicClientApplication(msalConfig);
        const usernamePasswordRequest = {
            scopes: ["user.read"],
            username: username, // Add your username here
            password: password, // Add your password here
        };
        
        pca.acquireTokenByUsernamePassword(usernamePasswordRequest).then((response) => {
            console.log("acquired token by password grant");
        }).catch((error) => {
            console.log(error);
        });
    */

        let credential = new aIdentity.UsernamePasswordCredential(
            config.AZURE_TENANTID,
            config.AZURE_APP_ID,
            username,
            password
        );
    
        var check = 0;
    
        try {
    
            await credential.getToken('.default').then(() => {
                check = 1;
            }).catch((error) => {
    
                // 50126: wrong credentials
                if (error.toString().includes("AADSTS50126")) {
                    helper.error('graph_azuread.js', "loginWithUsernamePassword", { error: "wrong credentials", username: username });
                }
                // 50057: account disabled
                else if (error.toString().includes("AADSTS50057")) {
                    helper.error('graph_azuread.js', "loginWithUsernamePassword", { error: "account disabled", username: username });
                }
                // 7000218: RPOC (The request body must contain the following parameter: 'client_assertion' or 'client_secret')
                else if (error.toString().includes("AADSTS7000218")) {
                    helper.error('graph_azuread.js', "loginWithUsernamePassword", { error: "RPOC disabled - please enable `Allow public client flows`!" });
                    helper.error('graph_azuread.js', "loginWithUsernamePassword", error);
                }
                else {
                    helper.error('graph_azuread.js', "loginWithUsernamePassword", { error: "fallback", username: username, detail: error });
                    // fallback: try it with cached passwords
                    check = 2;
                }
            });
    
        } catch (error) {
            check = 2;
            helper.error('graph_azuread.js', "loginWithUsernamePassword", error);
        }
        return check;
        
};

// exports
module.exports = graph;