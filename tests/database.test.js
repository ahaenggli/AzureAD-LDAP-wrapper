'use strict';

// process.env["SKIP_DOTENV"] = "true";
const fs = require('fs');

const originalEnv = process.env;
const dotenv = require('dotenv');

let database;

describe.each`
EnvName          | EnvVal                     | validResult | envSuffix | syncTime
${'everything'}  | ${'okay'}                  | ${true}     | ${''}| ${'0'}
${'GRAPH_FILTER_USERS'}  | ${''}              | ${true}     | ${''}| ${'0'}
${'LDAP_DAYSTOKEEPDELETEDUSERS'} | ${'-1'} | ${false}    | ${''}| ${'0'}
${'HTTP_PROXY'} | ${'http://127.0.0.1:3128'}| ${false}| ${''}| ${'0'}
${'AZURE_TENANTID'} | ${'xxx-xxx-xxx'}| ${false}| ${''}¨| ${'0'}
${'GRAPH_FILTER_GROUPS'} | ${''}| ${false}| ${''}¨| ${'0'}
${'AZURE_APP_ID'} | ${'xxx-xxx-xxx'}| ${false}| ${''}| ${'0'}
${'AZURE_APP_ID'} | ${'xxx/xxx-xxx'}| ${false}| ${''}| ${'0'}
${'AZURE_APP_ID'} | ${''}| ${false}| ${''}| ${'0'}
${'AZURE_APP_SECRET'} | ${'xxx-xxx-xxx'}| ${false}| ${''}| ${'0'}
${'AAD_Permissions'} | ${'not granted'} | ${false}| ${'-notgranted'}| ${'0'}
${'AZURE_ENDPOINT'} | ${'https://i-shall-not.exist/'}| ${false}| ${''}| ${'0'}
${'AZURE_ENDPOINT'} | ${'https://:1234/'}| ${false}| ${''}| ${'0'}
${'everything2'} | ${'okay2'} | ${true}| ${''}| ${'1'}
`('test database.js with $EnvName=$EnvVal', ({ EnvName, EnvVal, validResult, envSuffix, syncTime }) => {

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
        process.env['LDAP_SYNC_TIME'] = syncTime;

        fs.copyFileSync('./tests/azure.test.json', './tests/tmp_azure.test.json');

        process.env['LDAP_DATAFILE'] = './tests/tmp_azure.test.json';
        database = require('../database');
        jest.useFakeTimers();
        jest.spyOn(global, 'setInterval');
    });

    afterEach(() => {
        delete process.env[EnvName];
        process.env = originalEnv;
        console.log.mockRestore();
        console.warn.mockRestore();
        console.error.mockRestore();
        fs.unlinkSync('./tests/tmp_azure.test.json');
    });

    test('callback should be called', async () => {
        // Run your test here
        let wasCalled = false;
        const timer = await database.init(() => { wasCalled = true; });
        expect(wasCalled).toBe(true);
        wasCalled = false;
        expect(wasCalled).toBe(false);

        if (syncTime > 0) {
            expect(setInterval).toHaveBeenCalledTimes(1);
            expect(setInterval).toHaveBeenLastCalledWith(expect.any(Function), syncTime * 60 * 1000);
            jest.advanceTimersByTime(syncTime * 60 * 1000);
            await Promise.resolve(); // allow any pending jobs in the PromiseJobs queue to run
            expect(wasCalled).toBe(true);
            clearInterval(timer);
        }

    });


    test('schema data', () => {
        // Run your test here
        expect(database.getSchemaEntries()).toHaveProperty('ldapSyntaxes');
        expect(database.getSchemaEntries()).toHaveProperty('matchingRules');
        expect(database.getSchemaEntries()).toHaveProperty('matchingRuleUse');
        expect(database.getSchemaEntries()).toHaveProperty('attributeTypes');
        expect(database.getSchemaEntries()).toHaveProperty('objectClasses');
        expect(database.getSchemaEntries()).toHaveProperty('entryDN', 'cn=subschema');
    });

    test('databaseEntry data', () => {
        // Run your test here
        expect(database.getEntries()).not.toHaveProperty('dc=domain,dc=tld');
        expect(database.getEntries()).not.toHaveProperty('sambadomainname=domain,dc=domain,dc=tld');
        expect(database.getEntries()).not.toHaveProperty('cn=users,dc=domain,dc=tld');
        expect(database.getEntries()).not.toHaveProperty('cn=groups,dc=domain,dc=tld');
        expect(database.getEntries()).not.toHaveProperty('cn=users,cn=groups,dc=domain,dc=tld');
    });

    test('special functions', () => {
        // Run your test here
        expect(database.removeSpecialChars('äöü.fétch&test')).toBe('aou.fetch-test');
        expect(database.guidToBytes('da5df179-edd3-4195-95b3-20021ab1627e')).toStrictEqual([121, 241, 93, 218, 211, 237, 149, 65, 149, 179, 32, 2, 26, 177, 98, 126]);

        expect(database.generateSID(true, 1, null, null, 'da5df179-edd3-4195-95b3-20021ab1627e')).toBe('S-1-12-1-3663589753-1100344787-35697557-2120397082');
        expect(database.generateSID(true, 0, null, null, 'S-1-2-3')).toBe('S-1-2-3');
        expect(database.generateSID(false, 0, 'S-1-2-3', 13, null)).toBe('S-1-2-3-1027');
        expect(database.generateSID(false, 1, 'S-1-2-3', 13, null)).toBe('S-1-2-3-1026');

        const entry1 = { 'cn=oldName': { entryDN: 'cn=oldName', entryUUID: 'abc123', key1: 'value1', key2: 'value2' } };
        const entry2 = { 'cn=newName': { entryDN: 'cn=oldName', entryUUID: 'abc123', key1: 'value1', key2: 'value2' } };
        database.renameEntryByUUID(entry1, 'abc123', 'cn=newName');
        expect(entry1).toStrictEqual(entry2);
    });

});



//         test('databaseEntry data', () => {
//             // Run your test here
//             expect(database.getEntries()).toHaveProperty('dc=domain,dc=tld');
//             expect(database.getEntries()).toHaveProperty('sambadomainname=domain,dc=domain,dc=tld');
//             expect(database.getEntries()).toHaveProperty('cn=users,dc=domain,dc=tld');
//             expect(database.getEntries()).toHaveProperty('cn=groups,dc=domain,dc=tld');
//             expect(database.getEntries()).toHaveProperty('cn=users,cn=groups,dc=domain,dc=tld');
//         });
//     });
// });

