'use strict';

const fs = require('fs');
const dotenv = require('dotenv');

const originalEnv = process.env;

let database;

describe('database valid config tests', () => {
    describe.each`
    nodeEnv    | expectedPath  | exPort | exAnonBind  | exBind        | exVali  | exDebug | exAz     | exDN                 | exDomain
    ${'Test1'} | ${'./tests/'} | ${389} | ${'domain'} | ${'root|root'}| ${true} | ${false}| ${'none'}| ${'dc=domain,dc=tld'}| ${'domain'}    
  `('when ENV="$nodeEnv"', ({ nodeEnv, expectedPath, exPort, exAnonBind, exBind, exVali, exDebug, exAz, exDN, exDomain }) => {

    beforeAll(() => {
      // Set before all tests
      jest.resetModules();
      jest.spyOn(console, 'log').mockImplementation(() => { });
      jest.spyOn(console, 'warn').mockImplementation(() => { });
      jest.spyOn(console, 'error').mockImplementation(() => { });
      process.env = originalEnv;
      dotenv.config({ path: expectedPath + nodeEnv + '.env', override: true });
      database = require('../database');
      database.init();
    });

    beforeEach(() => {

    });

    afterEach(() => {

    });

    afterAll(() => {
      // Clean up after all tests have run
      // delete process.env.NODE_ENV;
      // delete process.env.LDAP_SYNC_TIME;
      // restore original console log
      process.env = originalEnv;
      console.log.mockRestore();
      console.warn.mockRestore();
      console.error.mockRestore();
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
      expect(database.getEntries()).toHaveProperty('dc=domain,dc=tld');
      expect(database.getEntries()).toHaveProperty('sambadomainname=domain,dc=domain,dc=tld');
      expect(database.getEntries()).toHaveProperty('cn=users,dc=domain,dc=tld');
      expect(database.getEntries()).toHaveProperty('cn=groups,dc=domain,dc=tld');
      expect(database.getEntries()).toHaveProperty('cn=users,cn=groups,dc=domain,dc=tld');
    });
  });
});



describe('database invalid config tests', () => {
  describe.each`
    nodeEnv    | expectedPath  | exPort | exAnonBind  | exBind        | exVali  | exDebug | exAz     | exDN                 | exDomain
    ${'Test2'} | ${'./tests/'} | ${389} | ${null}     | ${null}       | ${false}| ${false}| ${null}  | ${null}              | ${null}
    ${'Test3'} | ${'./tests/'} | ${null}| ${null}     | ${'root|root'}| ${false}| ${true} | ${'none'}| ${'dc=domain,dc=tld'}| ${'domain'}
  `('when ENV="$nodeEnv"', ({ nodeEnv, expectedPath, exPort, exAnonBind, exBind, exVali, exDebug, exAz, exDN, exDomain }) => {

    beforeAll(() => {
      // Set before all tests
      jest.resetModules();
      jest.spyOn(console, 'log').mockImplementation(() => { });
      jest.spyOn(console, 'warn').mockImplementation(() => { });
      jest.spyOn(console, 'error').mockImplementation(() => { });
      process.env = originalEnv;
      dotenv.config({ path: expectedPath + nodeEnv + '.env', override: true });
      database = require('../database');
      database.init();
    });

    beforeEach(() => {

    });

    afterEach(() => {

    });

    afterAll(() => {
      // Clean up after all tests have run
      // delete process.env.NODE_ENV;
      // delete process.env.LDAP_SYNC_TIME;
      // restore original console log
      process.env = originalEnv;
      console.log.mockRestore();
      console.warn.mockRestore();
      console.error.mockRestore();
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
  });
});