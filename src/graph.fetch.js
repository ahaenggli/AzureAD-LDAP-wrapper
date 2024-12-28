'use strict';

const axios = require('axios');
const proxyUrl = (process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "");

const config = require('./config');
const helper = require('./helper');
const customizer = require('./customizer');

const auth = require('./graph.auth');

let accessToken = null;

const fetch = {};

function addFilter(val) { return (val === undefined || val === null) ? '' : "&$filter=" + encodeURIComponent(val); }

// Default settings
fetch.apiConfig = {
    uri: `${config.GRAPH_ENDPOINT}/${config.GRAPH_API_VERSION}/users?$count=true&$select=businessPhones,displayName,givenName,jobTitle,mail,mobilePhone,officeLocation,preferredLanguage,surname,userPrincipalName,id,identities,userType,externalUserState,accountEnabled,customSecurityAttributes${addFilter(config.GRAPH_FILTER_USERS)}`,
    gri: `${config.GRAPH_ENDPOINT}/${config.GRAPH_API_VERSION}/groups?$count=true${addFilter(config.GRAPH_FILTER_GROUPS)}`,
    mri: `${config.GRAPH_ENDPOINT}/${config.GRAPH_API_VERSION}/groups/{id}/members`,
};

// Settings can be overwritten by a customizer
fetch.apiConfig = customizer.modifyGraphApiConfig(fetch.apiConfig, config.GRAPH_ENDPOINT);


if (proxyUrl != "") {
    const HttpsProxyAgent = require('https-proxy-agent').HttpsProxyAgent;
    axios.defaults.proxy = false;
    axios.defaults.httpsAgent = new HttpsProxyAgent(proxyUrl);
}

/**
 * Initializes the access token by retrieving it from the authentication module.
 * @async
 * @function initAccessToken
 * @returns {Promise<string>} - access Token
 */
fetch.initAccessToken = async function () {
    accessToken = await auth.getToken();
};

/**
 * Fetches all groups from the Graph API.
 * @async
 * @returns {Promise<Array<object>>} A promise that resolves to an array of group objects.
 */
fetch.getGroups = async function () {
    let groups = await fetch.callApi(fetch.apiConfig.gri, accessToken);
    if (groups.length === 0) {
        helper.warn("graph.fetch.js", "getGroups()", "no groups found");
    }
    groups = customizer.ModifyAzureGroups(groups);
    return groups;
};

/**
 * Fetches all members of a group from the Graph API.
 * @async
 * @returns {Promise<Array<object>>} A promise that resolves to an array of group members objects.
 */
fetch.getMembers = async function (group) {
    let members = await fetch.callApi(fetch.apiConfig.mri, accessToken, { id: group.id });
    if (members.length === 0) {
        helper.warn("graph.fetch.js", "getMembers()", "no members found");
    }
    return members;
};

/**
 * Fetches all users from the Graph API.
 * @async
 * @returns {Promise<Array<object>>} A promise that resolves to an array of users objects.
 */
fetch.getUsers = async function () {
    let users = await fetch.callApi(fetch.apiConfig.uri, accessToken);
    if (users.length === 0) {
        helper.warn("graph.fetch.js", "getUsers()", "no users found");
    }
    users = customizer.ModifyAzureUsers(users);
    return users;
};

/**
 * Calls the endpoint with authorization bearer token.
 * @async
 * @param {string} endpoint
 * @param {string} accessToken
 * @returns {Promise<Array<object>>} A promise that resolves to an array of fetched data
 */
fetch.callApi = async function (endpoint, accessToken, opts = {}, skipError = true) {

    const options = {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            ConsistencyLevel: 'eventual'
        }
    };

    if (opts.id)
        endpoint = endpoint.replace('{id}', opts.id);

    try {
        let data = [];
        let response = await axios.get(endpoint, options);
        data = [...data, ...response.data.value];

        // call nextLink as long as it exists, so all data should be fetched
        while (response.data.hasOwnProperty('@odata.nextLink')) {
            helper.log('graph.fetch.js', "callApi", { endpoint: endpoint, '@odata.nextLink': response.data['@odata.nextLink'] });
            response = await axios.get(response.data['@odata.nextLink'], options);
            // concat previous (nextLink-)data with current nextLink-data
            data = [...data, ...response.data.value];
        }

        return data;
    } catch (error) {
        const graphErrorDetail = error?.response?.data?.error ?? null;
        helper.error('graph.fetch.js', 'callApi', 'error with', { endpoint, opts, error: error.message, graphErrorDetail: graphErrorDetail });
        return (skipError) ? [] : { error: error.message };
    }
};

module.exports = fetch;