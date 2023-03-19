'use strict';

process.env["SKIP_DOTENV"] = "true";
const originalEnv = process.env;
const dotenv = require('dotenv');

let checkVars;

describe.each`
EnvName    | EnvVal | validResult | envSuffix
${'everything'} | ${'okay'} | ${true} | ${''}
${'HTTPS_PROXY'} | ${'http://127.0.0.1:3128'}| ${false}| ${''}
${'HTTP_PROXY'} | ${'http://127.0.0.1:3128'}| ${false}| ${''}
${'AZURE_TENANTID'} | ${'xxx-xxx-xxx'}| ${false}| ${''}¨
${'AZURE_TENANTID'} | ${''}| ${false}| ${''}
${'AZURE_TENANTID'} | ${'xxx/xxx-xxx'}| ${false}| ${''}¨
${'AZURE_APP_ID'} | ${'xxx-xxx-xxx'}| ${false}| ${''}
${'AZURE_APP_ID'} | ${'xxx/xxx-xxx'}| ${false}| ${''}
${'AZURE_APP_ID'} | ${''}| ${false}| ${''}
${'AZURE_APP_SECRET'} | ${'xxx-xxx-xxx'}| ${false}| ${''}
${'AAD_Permissions'} | ${'not granted'} | ${false}| ${'-notgranted'}
${'AZURE_ENDPOINT'} | ${'https://i-shall-not.exist/'}| ${false}| ${''}
${'AZURE_ENDPOINT'} | ${'https://:1234/'}| ${false}| ${''}
${'everything2'} | ${'okay2'} | ${true}| ${''}
`('test graph.checkVars with $EnvName=$EnvVal', ({ EnvName, EnvVal, validResult, envSuffix }) => {

    beforeAll(() => { });
    afterAll(() => { });

    beforeEach(() => {
        jest.resetModules();
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
        process.env = originalEnv;
        dotenv.config({ path: `.env${envSuffix}`, override: true });
        process.env[EnvName] = EnvVal;
        checkVars = require('../graph.checkVars');
    });

    afterEach(() => {
        delete process.env[EnvName];
        process.env = originalEnv;
        console.log.mockRestore();
        console.warn.mockRestore();
        console.error.mockRestore();
        // jest.clearAllMocks();
    });

    test(`should be ${validResult} ...`, async () => {
        let valid = await checkVars();
        expect(valid).toBe(validResult);
    });
});
