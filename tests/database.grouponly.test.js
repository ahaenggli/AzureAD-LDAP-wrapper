'use strict';

// process.env["SKIP_DOTENV"] = "true";
const fs = require('fs');

const originalEnv = process.env;
const dotenv = require('dotenv');

let database;

describe.each`
EnvName          | EnvVal                     | validResult | envSuffix | syncTime
${'LDAP_USERS_SYNCONLYINGROUP'}  | ${'sécu'}              | ${true}     | ${''}| ${'2'}
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

        fs.copyFileSync('./tests/azure.test.json', './tests/tmp_azure.test.json');
        process.env['LDAP_DATAFILE'] = './tests/tmp_azure.test.json';
        process.env['LDAP_SYNC_TIME'] = syncTime;
        process.env[EnvName] = EnvVal;

        database = require('../src/database');
        jest.useFakeTimers();
        jest.spyOn(global, 'setInterval');
    });

    afterEach(() => {
        delete process.env[EnvName];
        process.env = originalEnv;
        console.log.mockRestore();
        console.warn.mockRestore();
        console.error.mockRestore();

        if (fs.existsSync('./tests/tmp_azure.test.json'))
            fs.unlinkSync('./tests/tmp_azure.test.json');

        if (fs.existsSync('./tests/tmp_azure_empty.test.json'))
            fs.unlinkSync('./tests/tmp_azure_empty.test.json');
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

        expect(database.getEntries()).not.toHaveProperty('uid=lynner,cn=users,dc=domain,dc=tld');
        expect(database.getEntries()).toHaveProperty('uid=pradeepg,cn=users,dc=domain,dc=tld');

    }, 10000);

});