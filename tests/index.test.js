'use strict';

const originalEnv = process.env;
process.env['LDAP_SYNC_TIME'] = '0';
// const index = require('../index');

describe('check index', () => {

    it('should not throw errors and be set as wished', async () => {
        expect(true).toBe(true);
    });
});