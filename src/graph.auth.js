'use strict';

const config = require('./config');
const helper = require('./helper');
const fs = require('node:fs');
const crypto = require('node:crypto');

const msal = require('@azure/msal-node');
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

const TOKEN_ENDPOINT = `${config.AZURE_ENDPOINT}/${config.AZURE_TENANTID}/`;

const auth = {};

if (msal.LogLevel == undefined) {
    msal.LogLevel = {
        Error: 0,
        Warning: 1,
        Info: 2,
        Verbose: 3,
        Trace: 4,
    };
}
// Scope to get a ConfidentialClientApplication Token 
auth.tokenRequest = {
    scopes: [`${config.GRAPH_ENDPOINT}/.default`],
};

/**
 * Calculate SHA1 thumbprint from certificate
 * @param {string} certificate - Certificate content in PEM format
 * @returns {string} - SHA1 thumbprint in uppercase hex format
 */
function calculateThumbprint(certificate) {
    // Remove PEM headers and whitespace
    const certContent = certificate
        .replace(/-----BEGIN CERTIFICATE-----/g, '')
        .replace(/-----END CERTIFICATE-----/g, '')
        .replace(/\s/g, '');
    
    // Decode base64 and calculate SHA1
    const certBuffer = Buffer.from(certContent, 'base64');
    const thumbprint = crypto.createHash('sha1').update(certBuffer).digest('hex').toUpperCase();
    
    return thumbprint;
}

// Build auth configuration based on authentication method
const authConfig = {
    clientId: config.AZURE_APP_ID,
    authority: TOKEN_ENDPOINT,
    knownAuthorities: [TOKEN_ENDPOINT],
};

// Use certificate authentication if certificate paths are provided
if (config.AZURE_APP_CERTIFICATE_PATH && config.AZURE_APP_CERTIFICATE_KEY_PATH) {
    try {
        // Read certificate and private key files
        const certificate = fs.readFileSync(config.AZURE_APP_CERTIFICATE_PATH, 'utf8');
        const privateKey = fs.readFileSync(config.AZURE_APP_CERTIFICATE_KEY_PATH, 'utf8');
        
        // Calculate certificate thumbprint (SHA1)
        const thumbprint = calculateThumbprint(certificate);
        
        // Configure certificate authentication
        authConfig.clientCertificate = {
            thumbprint: thumbprint,
            privateKey: privateKey,
        };
        
        helper.log('graph.auth.js', 'authConfig', `Using certificate authentication (thumbprint: ${thumbprint})`);
    } catch (error) {
        helper.error('graph.auth.js', 'authConfig', `Failed to load certificate files: ${error.message}`);
        throw error;
    }
} else {
    // Use secret authentication (default)
    authConfig.clientSecret = config.AZURE_APP_SECRET;
    helper.log('graph.auth.js', 'authConfig', 'Using secret authentication');
}

auth.msalConfig = {
    auth: authConfig,
    system: {
        loggerOptions: {
            loggerCallback: function (loglevel, message, containsPii) {
                switch (loglevel) {
                    case msal.LogLevel.Error:
                        helper.error('graph.auth.js', 'system.logger', message, containsPii);
                        break;
                    case msal.LogLevel.Warning:
                        helper.warn('graph.auth.js', 'system.logger', message, containsPii);
                        break;
                    default:
                        helper.log('graph.auth.js', 'system.logger', loglevel, message, containsPii);
                        break;
                }
            },
            piiLoggingEnabled: false,
            // additional outputs in debug mode
            logLevel: (config.LDAP_DEBUG) ? msal.LogLevel.Verbose : msal.LogLevel.Error,
        },
        //proxyUrl: proxyUrl, //customAgentOptions: {},
    }
};

// set networkClient only if proxyUrl is defined
if (proxyUrl !== '') {
    auth.msalConfig.system.networkClient = require('./graph.proxyClient.js');
}

/**
 * Returns the ConfidentialClientApplication object used for acquiring tokens.
 * If the object has not been initialized, it will be created using the provided init parameter
 * or the default msal.ConfidentialClientApplication constructor with the auth.msalConfig.
 * @param {msal.ConfidentialClientApplication} [init] - Optional initialization parameter for creating the ConfidentialClientApplication object
 * @returns {msal.ConfidentialClientApplication} - The ConfidentialClientApplication object used for acquiring tokens
 */
let confidentialClientApplication = null;
auth.getCCA = function (init) {
    if (!confidentialClientApplication) {
        // Initialize client applications
        confidentialClientApplication = init || new msal.ConfidentialClientApplication(auth.msalConfig);
    }
    return confidentialClientApplication;
};


/**
 * Acquires access token using client credentials.
 * @async
 * @param {object} [tokenRequest=auth.tokenRequest] - Token request object containing scopes.
 * @returns {Promise<string>} - Access token.
 */
auth.getToken = async function getToken(tokenRequest = auth.tokenRequest) {
    const { accessToken } = await auth.getCCA().acquireTokenByClientCredential(tokenRequest);
    return accessToken;
};

/**
 * Try login with username and password
 * @async
 * @param {string} username
 * @param {string} password
 * @returns {number} - 0=login failed; 1=login successfull; 2=special error, use cache;
 */
auth.loginWithUsernamePassword = async function loginWithUsernamePassword(username, password) {

    const usernamePasswordRequest = {
        scopes: ["user.read"],
        username: username,
        password: password,
    };

    let checkCredentials = 0;

    try {

        const response = await auth.getCCA().acquireTokenByUsernamePassword(usernamePasswordRequest);
        if (response.accessToken) {
            checkCredentials = 1;

        } else {
            checkCredentials = 2;
            helper.error('graph_azuread.js', "loginWithUsernamePassword", "unhandled exception?");
        }

    } catch (fullError) {
        const error = fullError.errorMessage || fullError;

        // 50126: wrong credentials
        if (error.toString().includes("AADSTS50126")) {
            helper.error('graph_azuread.js', "loginWithUsernamePassword", { error: "wrong credentials", username: username, details: error });
        }
        // 50057: account disabled
        else if (error.toString().includes("AADSTS50057")) {
            helper.error('graph_azuread.js', "loginWithUsernamePassword", { error: "account disabled", username: username, details: error });
        }
        // 7000218: RPOC (The request body must contain the following parameter: 'client_assertion' or 'client_secret')
        else if (error.toString().includes("AADSTS7000218")) {
            helper.error('graph_azuread.js', "loginWithUsernamePassword", { error: "RPOC disabled - please enable `Allow public client flows`!" });
            helper.error('graph_azuread.js', "loginWithUsernamePassword", error);
        }
        // if MFA-related errors can be ignored, handle AADSTS50076 (Security defaults) and AADSTS50079 (Per-user MFA, Conditional Access) as successful logins
        else if (config.GRAPH_IGNORE_MFA_ERRORS && (error.toString().includes("AADSTS50076") || error.toString().includes("AADSTS50079") || error.toString().includes("AADSTS50158"))) {
            helper.log('graph_azuread.js', "loginWithUsernamePassword", { info: "MFA ignored", username: username, details: error });
            checkCredentials = 1;
        }  
        // Conditional Access errors caused by MFA (APP cannot be exclueded from MFA manuelly)
        else if (config.GRAPH_IGNORE_MFA_ERRORS && (error.toString().includes("AADSTS53003"))) {
            helper.log('graph_azuread.js', "loginWithUsernamePassword", { info: "MFA (conditional access) ignored", username: username, details: error });
            checkCredentials = 1;
        }   
        else {
            helper.error('graph_azuread.js', "loginWithUsernamePassword", { error: "fallback", username: username, details: error });
            // fallback: try it with cached passwords
            checkCredentials = 2;
        }
    }

    return checkCredentials;
};

// exports
module.exports = auth;