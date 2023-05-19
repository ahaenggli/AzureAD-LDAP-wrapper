'use strict';

// const tap = require('tap');
const dotenv = require('dotenv');

// process.env = originalEnv;
dotenv.config({ path: `.env`, override: true });
process.env["SKIP_DOTENV"] = "true";
process.env['LDAP_SYNC_TIME'] = '0';
process.env['LDAP_DEBUG'] = 'TRUE';
process.env['LDAPS_CERTIFICATE'] = './certs/cert.net.cer';
process.env['LDAPS_KEY'] = './certs/cert.net.key';

const originalEnv = process.env;
jest.spyOn(console, 'log').mockImplementation(() => { });
jest.spyOn(console, 'warn').mockImplementation(() => { });
jest.spyOn(console, 'error').mockImplementation(() => { });

let server;

// Client part
const ldap = require('ldapjs');

function clientSearch(client, baseDN, opts, done) {
    client.search(baseDN, opts, (err, res) => {
        let data;
        res.on('searchRequest', (searchRequest) => {
            // expect(searchRequest.messageId).toBeGreaterThan(0);
        });
        res.on('searchEntry', (entry) => {
            //console.error('client.search', 'entry: ' + JSON.stringify(entry.pojo));
            //console.error(entry.pojo);
            data = entry.pojo;
        });
        res.on('searchReference', (referral) => {
            //console.error('client.search', 'referral: ' + referral.uris.join());
        });
        res.on('error', (err) => {
            //console.error('client.search', 'error: ' + err.message);
            //console.error(err);
            done(err);
        });
        res.on('end', (result) => {
            done(data);
        });
    });
}

describe('check server with LDAP_ANONYMOUSBIND=none', () => {
    beforeEach(() => { });
    afterEach(() => { });

    beforeAll((done) => {
        process.env['LDAP_ANONYMOUSBIND'] = 'none';
        server = require('../src/server');
        server.listen(13388, "0.0.0.0", function () {
            done();
        });
    });
    afterAll((done) => {
        server.close(() => done());
        delete process.env['LDAP_ANONYMOUSBIND'];
        process.env = originalEnv;
    });

    test('queries anon=none', (done) => {
        expect.assertions(5);
        expect(server.url).toBe('ldaps://0.0.0.0:13388');

        const client = ldap.createClient({ url: ['ldaps://anet-lap01.brugg.haenggli.net:13388'], tlsOptions: { rejectUnauthorized: false } });
        const baseDN = 'dc=domain,dc=tld';

        clientSearch(client, 'dc=example,dc=tld', {
            filter: '(&(objectClass=*))',
            scope: 'base',
            attributes: ['*']
        }, (entry2) => {
            expect(entry2.lde_message).toBe('Insufficient Access Rights');
        });

        clientSearch(client, baseDN, {
            filter: '(&(objectClass=*))',
            scope: 'sub',
            attributes: ['*']
        }, (entry2) => {
            expect(entry2.lde_message).toBe('Insufficient Access Rights');
            client.unbind();
        });

        client.modifyDN('cn=subschema', 'cn=subschema2', (err, res) => {
            expect(err.lde_message).toBe('Insufficient Access Rights');
        });

        let called = false;

        server.init(() => {
            called = true;
            expect(called).toBe(true);
            done();
        });

    });
    
});

