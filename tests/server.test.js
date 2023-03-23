'use strict';

// const tap = require('tap');
const dotenv = require('dotenv');
// const originalEnv = process.env;
// process.env = originalEnv;
dotenv.config({ path: `.env`, override: true });
process.env["SKIP_DOTENV"] = "true";
process.env['LDAP_SYNC_TIME'] = '0';
process.env['LDAP_DEBUG'] = 'FALSE';

// jest.spyOn(console, 'log').mockImplementation(() => { });
// jest.spyOn(console, 'warn').mockImplementation(() => { });
// jest.spyOn(console, 'error').mockImplementation(() => { });

const server = require('../server');

// Client part
const ldap = require('ldapjs');

describe('check server', () => {

    beforeAll((done) => {
        server.listen(13389, "127.0.0.1", function () {
            done();
        });
    });

    afterAll((done) => {
        server.close(() => done());
    });

    beforeEach(() => {
        // jest.useFakeTimers();
        // jest.spyOn(global, 'setInterval');
    });

    afterEach(() => {
    });

    function clientSearch(client, baseDN, opts, done) {
        client.search(baseDN, opts, (err, res) => {
            let data;
            res.on('searchRequest', (searchRequest) => {
                // expect(searchRequest.messageId).toBeGreaterThan(0);
            });
            res.on('searchEntry', (entry) => {
                // console.error('client.search', 'entry: ' + JSON.stringify(entry.pojo));
                // console.error(entry.pojo.attributes);
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

    it('should not throw errors and be set as wished', (done) => {

        expect.assertions(5);

        expect(server.url).toBe('ldap://127.0.0.1:13389');
        expect(server.address()).toEqual({ "address": "127.0.0.1", "family": "IPv4", "port": 13389 });

        const client = ldap.createClient({ url: ['ldap://127.0.0.1:13389'] });
        const baseDN = 'dc=domain,dc=tld';

        const opts = {
            filter: '(&(objectClass=*))',
            scope: 'sub',
            attributes: ['dn', 'namingContexts', 'dc']
        };

        clientSearch(client, baseDN, opts, (entry) => {
            expect(entry.attributes).toEqual([{ "type": "dc", "values": ["domain"] }, { "type": "namingContexts", "values": ["dc=domain,dc=tld"] }]);
        });

        clientSearch(client, baseDN, {
            filter: '(&(objectClass=*))',
            scope: 'sub',
            attributes: ['dn', 'namingContexts']
        }, (entry) => {
            expect(entry.attributes).toEqual([{ "type": "namingContexts", "values": ["dc=domain,dc=tld"] }]);
        });

        clientSearch(client, 'dc=domain,dc=net', opts, (entry2) => {
            expect(entry2.lde_message).toBe('No Such Object');
            done();
            client.unbind();
        });




    }, 5000);



});