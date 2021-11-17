'use strict';

const config = require('./config');
const helper = require('./helper');

const msal = require('@azure/msal-node');
const axios = require('axios');

const TOKEN_ENDPOINT = 'https://login.microsoftonline.com/' + config.AZURE_TENANTID + '';
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
    //dri: MS_GRAPH_SCOPE + 'v1.0/domains',
    uri: MS_GRAPH_SCOPE + 'v1.0/users',
    gri: MS_GRAPH_SCOPE + 'v1.0/groups',
    mri: MS_GRAPH_SCOPE + 'v1.0/groups/{id}/members',
};


/**
 * Configuration object to be passed to MSAL instance on creation.
 * For a full list of MSAL Node configuration parameters, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/configuration.md
 */
const msalConfig = {
    auth: {
        clientId: config.AZURE_APP_ID,
        authority: TOKEN_ENDPOINT,
        clientSecret: config.AZURE_APP_SECRET,
    }
};


/**
 * Initialize a confidential client application. For more info, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/initialize-confidential-client-application.md
 */
const cca = new msal.ConfidentialClientApplication(msalConfig);

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


const msRestNodeauth = require("@azure/ms-rest-nodeauth");
graph.loginWithUsernamePassword = function loginWithUsernamePassword(username, password, func = null) {
    return msRestNodeauth.loginWithUsernamePassword(username, password, { domain: config.AZURE_TENANTID }).then(() => {
        return 1;
    }).catch((error) => {
        helper.error('graph_azuread.js', "loginWithUsernamePassword", error);

        // 50126: wrong credentials
        if (error && error.toString().indexOf('[50126]') > -1) return 0;
        // 50057: account disabled
        else if (error && error.toString().indexOf('[50057]') > -1) return 0;
        // other errors (not wrong credentials)
        else if (error) return 2;

        // fallback...
        return 0;
    });
};


//"@azure/identity": "1.5.2",
/*
const aIdentity = require("@azure/identity");
graph.loginWithUsernamePassword = async function loginWithUsernamePassword(username, password, func = null) {

    try {
        
        
        let credential = new aIdentity.UsernamePasswordCredential(
            config.AZURE_TENANTID,
            config.AZURE_APP_ID,
            username,
            password
        );
                        
        //return new Promise(function(resolve, reject) {resolve(0);reject(0);});
        return  credential.getToken('User.Read.All').then(() => {
            return 1;
        }).catch((error) => {
            // is it an error with ms typical attributes?
            if(error.hasOwnProperty("errorResponse") && error.errorResponse.hasOwnProperty("errorDescription") && error.errorResponse.hasOwnProperty("errorCodes") )
            {
                helper.error('graph_azuread.js', "loginWithUsernamePassword", error.errorResponse);
                // 50126: wrong credentials
                if(error.errorResponse.errorCodes.includes(50126)) {
                    helper.error('graph_azuread.js', "loginWithUsernamePassword", {error: "wrong credentials", username: username});
                    return 0;
                }
                // 50057: account disabled
                if(error.errorResponse.errorCodes.includes(50057)){ 
                    helper.error('graph_azuread.js', "loginWithUsernamePassword", {error: "account disabled", username: username});
                    return 0;
                }
                // sure is sure... 
                helper.error('graph_azuread.js', "loginWithUsernamePassword", error.errorResponse);
                return 0;          
            }

            helper.error('graph_azuread.js', "loginWithUsernamePassword", error);
            // fallback: try it with cached passwords
            return 2;
        });

    } catch (error) {
        helper.error('graph_azuread.js', "loginWithUsernamePassword", error);
        return new Promise(function(resolve, reject) {resolve(2);reject(2);});
    }
};
*/

// exports
module.exports = graph;