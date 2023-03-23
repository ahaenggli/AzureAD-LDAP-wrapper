'use strict';

// const tap = require('tap');
const dotenv = require('dotenv');

// process.env = originalEnv;
dotenv.config({ path: `.env`, override: true });
process.env["SKIP_DOTENV"] = "true";
process.env['LDAP_SYNC_TIME'] = '0';
process.env['LDAP_DEBUG'] = 'FALSE';
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

describe('check server with LDAP_ANONYMOUSBIND=domain', () => {
    beforeEach(() => { });
    afterEach(() => { });

    beforeAll((done) => {
        process.env['LDAP_ANONYMOUSBIND'] = 'domain';
        server = require('../server');
        server.listen(13389, "127.0.0.1", function () {
            done();
        });
    });

    afterAll((done) => {
        server.close(() => done());
        delete process.env['LDAP_ANONYMOUSBIND'];
        process.env = originalEnv;
    });

    test('queries anon=domain', (done) => {

        // expect.assertions(5);

        expect(server.url).toBe('ldap://127.0.0.1:13389');
        expect(server.address()).toEqual({ "address": "127.0.0.1", "family": "IPv4", "port": 13389 });

        const client = ldap.createClient({ url: ['ldap://127.0.0.1:13389'] });
        const baseDN = 'dc=domain,dc=tld';


        clientSearch(client, baseDN, {
            filter: '(&(objectClass=*))',
            scope: 'base',
            attributes: ['dn', 'namingContexts', 'dc']
        }, (entry) => {
            expect(entry.attributes).toEqual([{ "type": "dc", "values": ["domain"] }, { "type": "namingContexts", "values": ["dc=domain,dc=tld"] }]);
        });

        clientSearch(client, baseDN, {
            filter: '(&(cn=users))',
            scope: 'one',
            attributes: ['dn', 'namingContexts']
        }, (entry) => {
            expect(entry).toBeUndefined();
        });

        clientSearch(client, baseDN, {
            filter: '(&(objectClass=*))',
            scope: 'sub',
            attributes: ['dn', 'namingContexts']
        }, (entry) => {
            expect(entry.attributes).toEqual([{ "type": "namingContexts", "values": ["dc=domain,dc=tld"] }]);
        });

        clientSearch(client, 'dc=domain,dc=net', {
            filter: '(&(objectClass=*))',
            scope: 'sub',
            attributes: ['*']
        }, (entry2) => {
            expect(entry2.lde_message).toBe('No Such Object');
            done();
            client.unbind();
        });
    }, 5000);
});
