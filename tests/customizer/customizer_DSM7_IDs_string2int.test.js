'use strict';

process.env.SKIP_DOTENV = "true";
const customizer = require('../../customizer/customizer_DSM7_IDs_string2int');

// jest.mock('../../helper');

describe('DSM7 customizer tests', () => {
    beforeAll(() => {
        // Set before all tests
    });

    beforeEach(() => {
        jest.resetModules();
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
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

    test('numbers', () => {
        // Run your test here

        const user = { "gidNumber": "123", "uidNumber": "456", "creatorsName": "none" };
        const group = { "gidNumber": "123", "creatorsName": "none" };
        const all = { "user": user, "group": group };

        expect(customizer).not.toHaveProperty("modifyGraphApiConfig");
        expect(customizer).not.toHaveProperty("ModifyAzureGroups");
        expect(customizer).not.toHaveProperty("ModifyAzureUsers");

        expect(customizer.ModifyLDAPGroup(group, {})).toStrictEqual(group);
        expect(customizer.ModifyLDAPUser(user, {})).toStrictEqual(user);
        expect(customizer.ModifyLDAPGlobal(all)).toStrictEqual(all);

        expect(customizer.ModifyLDAPGroup(group, {})).toMatchObject(group);
        expect(customizer.ModifyLDAPUser(user, {})).toMatchObject(user);
        expect(customizer.ModifyLDAPGlobal(all)).toMatchObject(all);

        expect(customizer.ModifyLDAPGroup(group, {}).gidNumber).toBe(123);
        expect(customizer.ModifyLDAPUser(user, {}).uidNumber).toBe(456);
        expect(customizer.ModifyLDAPGlobal(all).creatorsName).toBe(undefined);

    });

    test('not numbers', () => {
        // Run your test here        

        const user = { "gidNumber": "x123", "uidNumber": "x456", "creatorsName": "none" };
        const group = { "gidNumber": "x123", "creatorsName": "none" };
        const all = { "user": user, "group": group, "samba": { "sambaDomainName": "SAMBA" } };

        expect(customizer).not.toHaveProperty("modifyGraphApiConfig");
        expect(customizer).not.toHaveProperty("ModifyAzureGroups");
        expect(customizer).not.toHaveProperty("ModifyAzureUsers");

        expect(customizer.ModifyLDAPGroup(group, {})).toStrictEqual(group);
        expect(customizer.ModifyLDAPUser(user, {})).toStrictEqual(user);
        expect(customizer.ModifyLDAPGlobal(all)).toStrictEqual(all);

        expect(customizer.ModifyLDAPGroup(group, {})).toMatchObject(group);
        expect(customizer.ModifyLDAPUser(user, {})).toMatchObject(user);
        expect(customizer.ModifyLDAPGlobal(all)).toMatchObject(all);

        expect(customizer.ModifyLDAPGroup(group, {}).gidNumber).toBe("x123");
        expect(customizer.ModifyLDAPUser(user, {}).uidNumber).toBe("x456");
        expect(customizer.ModifyLDAPGlobal(all).creatorsName).toBe(undefined);

    });


    test('missing numbers', () => {
        // Run your test here        

        const user = {  "creatorsName": "none" };
        const group = { "creatorsName": "none" };
        const all = { "user": user, "group": group, "samba": { "sambaDomainName": "SAMBA" } };

        expect(customizer).not.toHaveProperty("modifyGraphApiConfig");
        expect(customizer).not.toHaveProperty("ModifyAzureGroups");
        expect(customizer).not.toHaveProperty("ModifyAzureUsers");

        expect(customizer.ModifyLDAPGroup(group, {})).toStrictEqual(group);
        expect(customizer.ModifyLDAPUser(user, {})).toStrictEqual(user);
        expect(customizer.ModifyLDAPGlobal(all)).toStrictEqual(all);

        expect(customizer.ModifyLDAPGroup(group, {})).toMatchObject(group);
        expect(customizer.ModifyLDAPUser(user, {})).toMatchObject(user);
        expect(customizer.ModifyLDAPGlobal(all)).toMatchObject(all);

        expect(customizer.ModifyLDAPGroup(group, {}).gidNumber).toBe(undefined);
        expect(customizer.ModifyLDAPUser(user, {}).uidNumber).toBe(undefined);
        expect(customizer.ModifyLDAPGlobal(all).creatorsName).toBe(undefined);

    });
});


