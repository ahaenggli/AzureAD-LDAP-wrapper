'use strict';

const config = require('./config');
const helper = require('./helper');

const msal = require('@azure/msal-node');
const axios = require('axios');

const TOKEN_ENDPOINT = 'https://login.microsoftonline.com/' + config.AZURE_TENANTID + '';
const MS_GRAPH_SCOPE = 'https://graph.microsoft.com/';

const aIdentity = require("@azure/identity");

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
    //dri: MS_GRAPH_SCOPE + 'v1.0/domains',
    uri: MS_GRAPH_SCOPE + 'v1.0/users',
    gri: MS_GRAPH_SCOPE + 'v1.0/groups',
    mri: MS_GRAPH_SCOPE + 'v1.0/groups/{id}/members',
};


/**
 * Initialize a confidential client application. For more info, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/initialize-confidential-client-application.md
 */
const cca = new msal.ConfidentialClientApplication({
    auth: {
        clientId: config.AZURE_APP_ID,
        authority: TOKEN_ENDPOINT,
        clientSecret: config.AZURE_APP_SECRET,
    }
});
/**
 * Acquires token with client credentials.
 * @param {object} tokenRequest
 */
graph.getToken = async function getToken(tokenRequest) {
    return await cca.acquireTokenByClientCredential(tokenRequest);
}

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
        const response = await axios.default.get(endpoint, options);
        return response.data.value;
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

    let credential = new aIdentity.UsernamePasswordCredential(
        config.AZURE_TENANTID,
        config.AZURE_APP_ID,
        username,
        encodeURIComponent(password)
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