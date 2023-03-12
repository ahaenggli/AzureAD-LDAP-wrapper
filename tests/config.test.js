'use strict';

const fs = require('fs');
const dotenv = require('dotenv');

const originalEnv = process.env;
var config;

describe('config tests', () => {
    //${'Test3'}  | ${'./tests/'}    |    ${13389} | ${null}     | ${null}       | ${false}

    describe.each`
    nodeEnv    | expectedPath  | exPort | exAnonBind  | exBind        | exVali  | exDebug | exAz     | exDN                 | exDomain
    ${'Test1'} | ${'./tests/'} | ${389} | ${'domain'} | ${'root|root'}| ${true} | ${false}| ${'none'}| ${'dc=domain,dc=tld'}| ${'domain'}
    ${'Test2'} | ${'./tests/'} | ${389} | ${null}     | ${null}       | ${false}| ${false}| ${null}  | ${null}              | ${null}
    ${'Test3'} | ${'./tests/'} | ${null}| ${null}     | ${'root|root'}| ${false}| ${true} | ${'none'}| ${'dc=domain,dc=tld'}| ${'domain'}
  `('when ENV="$nodeEnv"', ({ nodeEnv, expectedPath, exPort, exAnonBind, exBind, exVali, exDebug, exAz, exDN, exDomain }) => {

        beforeAll(() => {
            // Set before all tests

            if (fs.existsSync("./.cache/IshouldNotExist.txt"))
                fs.unlinkSync('./.cache/IshouldNotExist.txt');
            if (nodeEnv === "Test2")
                fs.writeFileSync('./.cache/IshouldNotExist.txt', 'Hello content!');        

            
        });

        beforeEach(() => {
            jest.resetModules();
            jest.spyOn(console, 'log').mockImplementation(() => {});
            jest.spyOn(console, 'warn').mockImplementation(() => {});
            jest.spyOn(console, 'error').mockImplementation(() => {});
            process.env = originalEnv;
            dotenv.config({ path: expectedPath + nodeEnv + '.env', override: true });            
            config = require('../config');
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

        test('azure configs', () => {
            // Run your test here
            expect(config.AZURE_APP_ID).toBe(exAz);
            expect(config.AZURE_APP_SECRET).toBe(exAz);
            expect(config.AZURE_TENANTID).toBe(exAz);
        });

        test('graph configs', () => {
            // Run your test here
            expect(config.GRAPH_FILTER_USERS).toBeNull();
            expect(config.GRAPH_FILTER_GROUPS).toBeNull();
            expect(config.GRAPH_IGNORE_MFA_ERRORS).toBe(true);
            expect(config.LDAP_SYNC_TIME).toBe(0);
            expect(config.LDAP_DAYSTOKEEPDELETEDUSERS).toBe(7);
        });

        test('samba configs', () => {
            // Run your test here
            expect(config.LDAP_SAMBADOMAINNAME).toBe(exDomain);
            expect(config.LDAP_SAMBASIDBASE).toBe('S-1-5-21-2475342291-1480345137-508597502');
            expect(config.LDAP_SAMBA_USEAZURESID).toBe(true);
            expect(config.LDAP_SAMBANTPWD_MAXCACHETIME).toBe(-1);

        });

        test('LDAPS configs', () => {
            // Run your test here
            const cert = (nodeEnv === 'Test1')? null : process.env.LDAPS_CERTIFICATE;
            const keyf = (nodeEnv === 'Test2')? process.env.LDAPS_KEY : null;

            expect(config.LDAPS_CERTIFICATE).toBe(cert);
            expect(config.LDAPS_KEY).toBe(keyf); // .toBeUndefined();
            
        });

        test('other configs', () => {
            // Run your test here
            expect(config.LDAP_DATAFILE).toBe("./test/azure.test.json");
            expect(config.DSM7).toBe(true);
            expect(config.LDAP_DEBUG).toBe(exDebug);
        });
        test('LDAP configs', () => {
            // Run your test here
            expect(config.LDAP_PORT).toBe(exPort);
            expect(config.LDAP_BINDUSER).toBe(exBind);
            expect(config.LDAP_DOMAIN).toBe("domain.tld");
            expect(config.LDAP_BASEDN).toBe(exDN);
            expect(config.LDAP_ANONYMOUSBIND).toBe(exAnonBind);
            expect(config.LDAP_SENSITIVE_ATTRIBUTES).toBeNull();
            expect(config.LDAP_SECURE_ATTRIBUTES).toBeNull();

            expect(config.LDAP_REMOVEDOMAIN).toBe(true);
            expect(config.LDAP_ALLOWCACHEDLOGINONFAILURE).toBe(true);

            expect(config.LDAP_GROUPSDN).toBe(`cn=groups,${exDN}`);
            expect(config.LDAP_USERSDN).toBe(`cn=users,${exDN}`);
            expect(config.LDAP_USERSGROUPSBASEDN).toBe(`cn=users,cn=groups,${exDN}`);
            expect(config.LDAP_USERRDN).toBe("uid");

        });

        test('VARS VALIDATED', () => {
            expect(config.VARS_VALIDATED).toBe(exVali);
        });
    });
});
