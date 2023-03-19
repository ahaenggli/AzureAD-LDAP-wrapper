// graph.auth.test.js
'use strict';

const dotenv = require('dotenv');

process.env["SKIP_DOTENV"] = "true";
process.env["GRAPH_FILTER_GROUPS"] = "x=y";

const originalEnv = process.env;
const msal = require('@azure/msal-node');
jest.mock('@azure/msal-node');

var graph_auth;

const usernamePasswordRequest = {
    scopes: ["user.read"],
    username: "user",
    password: "pass",
};

describe.each`
nodeEnv    | expectedPath | debug_log | log_msg
${'Test2'} | ${'./tests/'} | ${0} | ${''}
${'Test3'} | ${'./tests/'} | ${1} | ${'SOME-Info'}
`('graph.auth when ENV="$nodeEnv"', ({ nodeEnv, expectedPath, debug_log, log_msg }) => {

    beforeAll(() => {
        // Set before all tests
    });

    beforeEach(() => {
        jest.resetModules();
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
        process.env = originalEnv;
        dotenv.config({ path: expectedPath + nodeEnv + '.env', override: true });
        if (nodeEnv === 'Test3') {
            process.env['HTTP_PROXY'] = 'http://127.0.0.1:3128';
        }
        graph_auth = require('../graph.auth');
    });

    afterEach(() => {
        process.env = originalEnv;
        console.log.mockRestore();
        console.warn.mockRestore();
        console.error.mockRestore();
    });

    afterAll(() => {
        // Clean up after all tests have run
        // delete process.env.NODE_ENV;
        // delete process.env.LDAP_SYNC_TIME;
        // restore original console log

    });

    //describe('graph.auth', () => {
    test('should get configs', async () => {

        expect(graph_auth.tokenRequest).toStrictEqual({ "scopes": ["https://graph.microsoft.com/.default"] });
        
        const clientApp = new msal.ConfidentialClientApplication(graph_auth.msalConfig);
        const getCCA = graph_auth.getCCA();
        expect(getCCA).not.toBe(clientApp);

        console.error.mockClear();
        graph_auth.msalConfig.system.loggerOptions.loggerCallback(msal.LogLevel.Error, 'SOME-ERROR', true);
        expect(console.error).toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error.mock.calls.toString()).toMatch(/(SOME-ERROR)/i);
    
        console.warn.mockClear();
        graph_auth.msalConfig.system.loggerOptions.loggerCallback(msal.LogLevel.Warning, 'SOME-Warning', false);
        expect(console.warn).toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledTimes(1);
        expect(console.warn.mock.calls.toString()).toMatch(/(SOME-Warning)/i);

        console.log.mockClear();
        graph_auth.msalConfig.system.loggerOptions.loggerCallback(msal.LogLevel.Info, 'SOME-Info', true);
        expect(console.log).toHaveBeenCalledTimes(debug_log);
        let re = new RegExp(`(${log_msg})`, 'i');
        expect(console.log.mock.calls.toString()).toMatch(re);

    });

    test('should get token', async () => {

        const mockToken = 'mockToken';

        const acquireTokenByClientCredential = jest.fn().mockResolvedValue({
            accessToken: mockToken
        });

        // mock the implementation of ConfidentialClientApplication class
        msal.ConfidentialClientApplication.prototype.acquireTokenByClientCredential = acquireTokenByClientCredential;

        //use ConfidentialClientApplication instance to call acquireTokenByClientCredential
        const clientApp = new msal.ConfidentialClientApplication(graph_auth.msalConfig);
        const getCCA = graph_auth.getCCA(clientApp);
        expect(getCCA).toBe(clientApp);

        const result = await graph_auth.getToken();
        expect(result).toBe(mockToken);

        expect(acquireTokenByClientCredential).toHaveBeenCalledWith(graph_auth.tokenRequest);
        expect(msal.ConfidentialClientApplication).toHaveBeenCalledWith(graph_auth.msalConfig);

    });


    test('should get username/password = 1', async () => {

        const mockToken = 'mockToken';

        const acquireTokenByUsernamePassword = jest.fn().mockResolvedValue({
            accessToken: mockToken
        });

        // mock the implementation of ConfidentialClientApplication class
        msal.ConfidentialClientApplication.prototype.acquireTokenByUsernamePassword = acquireTokenByUsernamePassword;

        //use ConfidentialClientApplication instance to call acquireTokenByClientCredential
        const clientApp = new msal.ConfidentialClientApplication(graph_auth.msalConfig);
        const getCCA = graph_auth.getCCA(clientApp);
        expect(getCCA).toBe(clientApp);

        const result = await graph_auth.loginWithUsernamePassword("user", "pass");
        expect(result).toBe(1);

        expect(acquireTokenByUsernamePassword).toHaveBeenCalledWith(usernamePasswordRequest);
        expect(msal.ConfidentialClientApplication).toHaveBeenCalledWith(graph_auth.msalConfig);

    });

    test('should get username/password = 2 (no token, but no error)', async () => {

        const acquireTokenByUsernamePassword = jest.fn().mockResolvedValue({
            accessToken: undefined
        });

        // mock the implementation of ConfidentialClientApplication class
        msal.ConfidentialClientApplication.prototype.acquireTokenByUsernamePassword = acquireTokenByUsernamePassword;

        //use ConfidentialClientApplication instance to call acquireTokenByClientCredential
        const clientApp = new msal.ConfidentialClientApplication(graph_auth.msalConfig);
        const getCCA = graph_auth.getCCA(clientApp);
        expect(getCCA).toBe(clientApp);

        const result = await graph_auth.loginWithUsernamePassword("user", "pass");
        expect(result).toBe(2);

        expect(acquireTokenByUsernamePassword).toHaveBeenCalledWith(usernamePasswordRequest);
        expect(msal.ConfidentialClientApplication).toHaveBeenCalledWith(graph_auth.msalConfig);

    });


    test('should get username/password = 2 despite of random error', async () => {

        const acquireTokenByUsernamePassword = jest.fn().mockRejectedValue(new Error('some random error message'));

        // mock the implementation of ConfidentialClientApplication class
        msal.ConfidentialClientApplication.prototype.acquireTokenByUsernamePassword = acquireTokenByUsernamePassword;

        //use ConfidentialClientApplication instance to call acquireTokenByClientCredential
        const clientApp = new msal.ConfidentialClientApplication(graph_auth.msalConfig);
        const getCCA = graph_auth.getCCA(clientApp);
        expect(getCCA).toBe(clientApp);

        const result = await graph_auth.loginWithUsernamePassword("user", "pass");
        expect(result).toBe(2);

        expect(acquireTokenByUsernamePassword).toHaveBeenCalledWith(usernamePasswordRequest);
        expect(msal.ConfidentialClientApplication).toHaveBeenCalledWith(graph_auth.msalConfig);

    });


    test('should get username/password = 1 despite of MFA error #1 [AADSTS50076]', async () => {

        const acquireTokenByUsernamePassword = jest.fn().mockRejectedValue(new Error('MFA!! AADSTS50076: some random error message'));

        // mock the implementation of ConfidentialClientApplication class
        msal.ConfidentialClientApplication.prototype.acquireTokenByUsernamePassword = acquireTokenByUsernamePassword;

        //use ConfidentialClientApplication instance to call acquireTokenByClientCredential
        const clientApp = new msal.ConfidentialClientApplication(graph_auth.msalConfig);
        const getCCA = graph_auth.getCCA(clientApp);
        expect(getCCA).toBe(clientApp);

        const result = await graph_auth.loginWithUsernamePassword("user", "pass");
        expect(result).toBe(1);

        expect(acquireTokenByUsernamePassword).toHaveBeenCalledWith(usernamePasswordRequest);
        expect(msal.ConfidentialClientApplication).toHaveBeenCalledWith(graph_auth.msalConfig);

    });

    test('should get username/password = 1 despite of MFA error #2 [AADSTS50079]', async () => {

        const acquireTokenByUsernamePassword = jest.fn().mockRejectedValue(new Error('MFA!! AADSTS50079: some random error message'));

        // mock the implementation of ConfidentialClientApplication class
        msal.ConfidentialClientApplication.prototype.acquireTokenByUsernamePassword = acquireTokenByUsernamePassword;

        //use ConfidentialClientApplication instance to call acquireTokenByClientCredential
        const clientApp = new msal.ConfidentialClientApplication(graph_auth.msalConfig);
        const getCCA = graph_auth.getCCA(clientApp);
        expect(getCCA).toBe(clientApp);

        const result = await graph_auth.loginWithUsernamePassword("user", "pass");
        expect(result).toBe(1);

        expect(acquireTokenByUsernamePassword).toHaveBeenCalledWith(usernamePasswordRequest);
        expect(msal.ConfidentialClientApplication).toHaveBeenCalledWith(graph_auth.msalConfig);

    });


    test('should get username/password = 0 because of wrong credentials [AADSTS50126]', async () => {

        const acquireTokenByUsernamePassword = jest.fn().mockRejectedValue(new Error('MFA!! AADSTS50126: some random error message'));

        // mock the implementation of ConfidentialClientApplication class
        msal.ConfidentialClientApplication.prototype.acquireTokenByUsernamePassword = acquireTokenByUsernamePassword;

        //use ConfidentialClientApplication instance to call acquireTokenByClientCredential
        const clientApp = new msal.ConfidentialClientApplication(graph_auth.msalConfig);
        const getCCA = graph_auth.getCCA(clientApp);
        expect(getCCA).toBe(clientApp);

        const result = await graph_auth.loginWithUsernamePassword("user", "pass");
        expect(result).toBe(0);

        expect(acquireTokenByUsernamePassword).toHaveBeenCalledWith(usernamePasswordRequest);
        expect(msal.ConfidentialClientApplication).toHaveBeenCalledWith(graph_auth.msalConfig);

    });

    test('should get username/password = 0 because of account disabled [AADSTS50057]', async () => {

        const acquireTokenByUsernamePassword = jest.fn().mockRejectedValue(new Error('MFA!! AADSTS50057: some random error message'));

        // mock the implementation of ConfidentialClientApplication class
        msal.ConfidentialClientApplication.prototype.acquireTokenByUsernamePassword = acquireTokenByUsernamePassword;

        //use ConfidentialClientApplication instance to call acquireTokenByClientCredential
        const clientApp = new msal.ConfidentialClientApplication(graph_auth.msalConfig);
        const getCCA = graph_auth.getCCA(clientApp);
        expect(getCCA).toBe(clientApp);

        const result = await graph_auth.loginWithUsernamePassword("user", "pass");
        expect(result).toBe(0);

        expect(acquireTokenByUsernamePassword).toHaveBeenCalledWith(usernamePasswordRequest);
        expect(msal.ConfidentialClientApplication).toHaveBeenCalledWith(graph_auth.msalConfig);

    });

    test('should get username/password = 0 because of RPOC disabled [AADSTS7000218]', async () => {

        const acquireTokenByUsernamePassword = jest.fn().mockRejectedValue(new Error('MFA!! AADSTS7000218: some random error message'));

        // mock the implementation of ConfidentialClientApplication class
        msal.ConfidentialClientApplication.prototype.acquireTokenByUsernamePassword = acquireTokenByUsernamePassword;

        //use ConfidentialClientApplication instance to call acquireTokenByClientCredential
        const clientApp = new msal.ConfidentialClientApplication(graph_auth.msalConfig);
        const getCCA = graph_auth.getCCA(clientApp);
        expect(getCCA).toBe(clientApp);

        const result = await graph_auth.loginWithUsernamePassword("user", "pass");
        expect(result).toBe(0);

        expect(acquireTokenByUsernamePassword).toHaveBeenCalledWith(usernamePasswordRequest);
        expect(msal.ConfidentialClientApplication).toHaveBeenCalledWith(graph_auth.msalConfig);

    });

});
