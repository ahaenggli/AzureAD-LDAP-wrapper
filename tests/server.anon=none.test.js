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

describe('check server with LDAP_ANONYMOUSBIND=none', () => {
    beforeEach(() => { });
    afterEach(() => { });

    beforeAll((done) => {
        process.env['LDAP_ANONYMOUSBIND'] = 'none';
        server = require('../src/server');
        server.listen(13388, "127.0.0.1", function () {
            done();
        });
    });
    afterAll((done) => {
        server.close(() => done());
        delete process.env['LDAP_ANONYMOUSBIND'];
        process.env = originalEnv;
    });

    test('queries anon=none', (done) => {
        expect.assertions(6);
        expect(server.url).toBe('ldap://127.0.0.1:13388');
        expect(server.address()).toEqual({ "address": "127.0.0.1", "family": "IPv4", "port": 13388 });

        const client = ldap.createClient({ url: ['ldap://127.0.0.1:13388'] });
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


    test('bind root wrong', (done) => {
        const client = ldap.createClient({ url: ['ldap://127.0.0.1:13388'] });
        const baseDN = 'dc=domain,dc=tld';
        client.bind('uid=root', 'pw', (err, res) => {
            expect(err.toString()).toBe('InvalidCredentialsError: Invalid Credentials');
            expect(res).toBeUndefined();
            client.unbind();
            done();
        }
        );
    });

    test('bind root correct', (done) => {
        const client = ldap.createClient({ url: ['ldap://127.0.0.1:13388'] });
        const baseDN = 'dc=domain,dc=tld';

        clientSearch(client, baseDN, {
            filter: '(&(objectClass=*))',
            scope: 'base',
            attributes: ['*']
        }, (entry) => {
            expect(entry.lde_message).toBe('Insufficient Access Rights');
        });

        client.bind('uid=root', 'mystrongpw', (err, res) => {
            expect(err).toBeNull();
            expect(res).toHaveProperty('connection');
            doBinded();
        }
        );
        function doBinded() {
            clientSearch(client, baseDN, {
                filter: '(&(objectClass=*))',
                scope: 'base',
                attributes: ['namingContexts', 'dc']
            }, (entry) => {
                expect(entry.attributes).toEqual([{ "type": "dc", "values": ["domain"] }, { "type": "namingContexts", "values": ["dc=domain,dc=tld"] }]);
            });

            clientSearch(client, 'cn=subschema', {
                filter: '(&(objectClass=*))',
                scope: 'base',
                // attributes: ['']
            }, (entry) => {
                expect(entry.objectName).toEqual('cn=subschema');
                expect(entry.attributes).toHaveLength(12);
            });

            client.modifyDN('cn=subschema', 'cn=subschema2', (err, res) => {
                expect(err.lde_message).toBe('Protocol Error');
            });

            clientSearch(client, baseDN, {
                filter: '(&(objectClass=*)(cn=abc102))',
                scope: 'sub',
                attributes: ['sambaNTPassword']
            }, (entry) => {
                expect(entry.attributes[0].values[0]).not.toEqual('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
            });

            // slowest thing in the end
            server.init(() => {
                client.unbind();
                done();
            });
        }
    });




    test('bind someone wrong', (done) => {
        const client = ldap.createClient({ url: ['ldap://127.0.0.1:13388'] });
        const baseDN = 'dc=domain,dc=tld';

        clientSearch(client, baseDN, {
            filter: '(&(objectClass=*))',
            scope: 'base',
            attributes: ['*']
        }, (entry) => {
            expect(entry.lde_message).toBe('Insufficient Access Rights');
        });

        client.bind('uid=abc102', 'abc102', (err, res) => {
            expect(err.toString()).toBe('InvalidCredentialsError: Invalid Credentials');
            expect(res).toBeUndefined();
            client.unbind();
            done();
        }
        );
    });

    test('bind someone correct', (done) => {
        const client = ldap.createClient({ url: ['ldap://127.0.0.1:13388'] });
        let baseDN = '';

        clientSearch(client, baseDN, {
            filter: '(&(objectClass=*))',
            scope: 'base',
            attributes: ['*']
        }, (entry) => {
            expect(entry.lde_message).toBe('Insufficient Access Rights');
        });

        client.bind(process.env['TEST_BIND_ROOT1'], process.env['TEST_BIND_ROOT2'], (err, res) => {
            expect(err).toBeNull();
            expect(res).toHaveProperty('connection');
            doBinded();
        }
        );
        function doBinded() {

            clientSearch(client, '', {
                filter: '(&(objectClass=*))',
                scope: 'base',
                attributes: ['namingContexts', 'dc']
            }, (entry) => {
                expect(entry.attributes).toEqual([{ "type": "dc", "values": ["domain"] }, { "type": "namingContexts", "values": ["dc=domain,dc=tld"] }]);
            });

            client.modifyDN('cn=subschema', 'cn=subschema2', (err, res) => {
                expect(err.lde_message).toBe('Insufficient Access Rights');
            });

            let baseDN = 'dc=domain,dc=tld';
            clientSearch(client, baseDN, {
                filter: '(&(objectClass=*)(cn=abc102))',
                scope: 'sub',
                attributes: ['sambaNTPassword']
            }, (entry) => {
                expect(entry.attributes[0].values[0]).toEqual('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
            });

            // slowest thing in the end
            server.init(() => {
                client.unbind();
                done();
            });
        }
    });
});

