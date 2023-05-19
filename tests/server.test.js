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
        res.on('resultError', (err) => {
            //console.error('client.search', 'error: ' + err.message);
            //console.error(err);            
            done(err);
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
        server = require('../src/server');
        server.listen(13389, "127.0.0.1", function () {
            server.init(() => { done(); });
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

        // ToDo: implement search for nested groups
        clientSearch(client, baseDN, {
            filter: '&(memberOf:1.2.840.113556.1.4.1941:=cn=groupofothergroups,cn=groups,dc=domain,dc=tld)',
            scope: 'sub',
            attributes: ['dn', 'namingContexts', '']
        }, (entry3) => {
            expect(entry3.lde_message).toBe('Protocol Error');
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

    test('modify entries: modifyDN', (done) => {
        const client = ldap.createClient({ url: ['ldap://127.0.0.1:13389'] });
        const baseDN = 'dc=domain,dc=tld';

        client.modifyDN('cn=subschema', 'cn=subschema2', (err, res) => {
            expect(err.lde_message).toBe('Insufficient Access Rights');
        });

        client.bind('uid=root', 'mystrongpw', (err, res) => {
            expect(err).toBeNull();
            expect(res).toHaveProperty('connection');
            doBinded();
        });
        function doBinded() {

            client.modifyDN('cn=subschema', 'cn=subschema2', (err, res) => {
                expect(err.lde_message).toBe('Protocol Error');
                done();
                client.unbind();
            });
        }
    });

    test('modify entries: compare', (done) => {
        const client = ldap.createClient({ url: ['ldap://127.0.0.1:13389'] });
        const baseDN = 'dc=domain,dc=tld';

        client.compare('cn=foo, o=example', 'sn', 'bar', (err, matched) => {
            expect(err.lde_message).toBe('Insufficient Access Rights');
        });

        client.bind('uid=root', 'mystrongpw', (err, res) => {
            expect(err).toBeNull();
            expect(res).toHaveProperty('connection');
            doBinded();
        });
        function doBinded() {

            // object should not exist
            client.compare('cn=foo, o=example', 'sn', 'bar', (err, matched) => {
                expect(err.lde_message).toBe('No Such Object');
            });

            // object should exist but attribute not
            client.compare(baseDN, 'mynamingcontexts', 'bar', (err, matched) => {
                expect(err.lde_message).toBe('No Such Attribute');
            });

            client.compare(baseDN, 'namingContexts', 'bar', (err, matched) => {
                expect(matched).toBe(false);
            });

            client.compare(baseDN, 'NAMINGCONTEXTS', 'bar', (err, matched) => {
                expect(matched).toBe(false);
            });

            client.compare(baseDN, 'namingcontexts', 'dc=domain,dc=tld', (err, matched) => {
                expect(matched).toBe(true);
            });

            client.compare(baseDN, 'namingContexts', 'dc=domain,dc=tld', (err, matched) => {
                expect(matched).toBe(true);
            });

            client.compare('cn=users,cn=groups,' + baseDN, 'objectClass', 'posixGroup', (err, matched) => {
                expect(matched).toBe(true);
                done();
                client.unbind();
            });
        }
    });


    test('modify entries: add & del', (done) => {
        const client = ldap.createClient({ url: ['ldap://127.0.0.1:13389'] });
        const baseDN = 'dc=domain,dc=tld';
        const baseDN_tad = 'dc=test-add-del,dc=domain,dc=tld';

        const entry = {
            cn: 'foo',
            sn: 'bar',
            email: ['foo@bar.com', 'foo1@bar.com'],
            objectclass: 'fooPerson'
        };

        client.add('cn=foo, o=example', entry, (err) => {
            expect(err.lde_message).toBe('Insufficient Access Rights');
        });

        client.del('cn=foo, o=example', (err) => {
            expect(err.lde_message).toBe('Insufficient Access Rights');
        });

        client.bind('uid=root', 'mystrongpw', (err, res) => {
            expect(err).toBeNull();
            expect(res).toHaveProperty('connection');
            doBinded();
        });
        function doBinded() {

            // object should already exist
            client.add(baseDN, entry, (err) => {
                expect(err.lde_message).toBe('Entry Already Exists');
            });

            client.del(baseDN_tad, (err) => {
                expect(err.lde_message).toBe('No Such Object');
            });


            const Attribute = require('@ldapjs/attribute');

            const change = new ldap.Change({
                operation: 'add',
                modification: new Attribute({
                    type: 'pets',
                    values: ['cat', 'dog'],
                })
            });

            client.modify(baseDN_tad, change, (err) => {
                expect(err.lde_message).toBe('No Such Object');
            });

            client.add(baseDN_tad, entry, (err) => {
                expect(err).toBe(null);
            });

            client.modify(baseDN_tad, [], (err) => {
                expect(err.lde_message).toBe('Protocol Error');
            });

            client.modify(baseDN_tad, new ldap.Change({
                operation: 'add',
                modification: new Attribute({
                    type: 'pets',
                    values: ['cat', 'dog'],
                })
            }), (err) => {
                expect(err).toBe(null);
            });

            client.modify(baseDN_tad, new ldap.Change({
                operation: 'replace',
                modification: new Attribute({
                    type: 'modifiersName',
                    values: ['catdog'],
                })
            }), (err) => {
                expect(err.lde_message).toBe('No Such Attribute');
            });

            client.modify(baseDN_tad, new ldap.Change({
                operation: 'delete',
                modification: new Attribute({
                    type: 'modifiersName',
                    values: ['catdog']
                })
            }), (err) => {
                expect(err.lde_message).toBe('No Such Attribute');
            });

            client.modify(baseDN_tad, [new ldap.Change({
                operation: 'replace',
                modification: new Attribute({
                    type: 'sn',
                    values: ['foo-bar'],
                })
            }), new ldap.Change({
                operation: 'replace',
                modification: new Attribute({
                    type: 'email',
                    values: ['foo2@bar.com', 'foo3@bar.com'],
                })
            }), new ldap.Change({
                operation: 'replace',
                modification: new Attribute({
                    type: 'objectClass',
                    values: [],
                })
            })], (err) => {
                expect(err).toBe(null);
            });

            client.modify(baseDN_tad, new ldap.Change({
                operation: 'add',
                modification: new Attribute({
                    type: 'objectClass',
                    values: ['sambaIdmapEntry'],
                })
            }), (err) => {
                expect(err).toBe(null);
            });

            client.modify(baseDN_tad, [new ldap.Change({
                operation: 'delete',
                modification: new Attribute({
                    type: 'pets'
                })
            }),
            new ldap.Change({
                operation: 'delete',
                modification: new Attribute({
                    type: 'email',
                    values: ['foo5@bar.com']
                })
            }),
            new ldap.Change({
                operation: 'delete',
                modification: new Attribute({
                    type: 'email',
                    values: ['foo3@bar.com']
                })
            })
            ], (err) => {
                expect(err).toBe(null);
            });

            client.modify(baseDN_tad, [new ldap.Change({
                operation: 'add',
                modification: new Attribute({
                    type: 'objectClass',
                    values: ['extensibleObject', 'sambaIdmapEntry'],
                })
            }),
            new ldap.Change({
                operation: 'add',
                modification: new Attribute({
                    type: 'foo',
                    values: ['bar'],
                })
            }),
            new ldap.Change({
                operation: 'add',
                modification: new Attribute({
                    type: 'foo',
                    values: ['bar2'],
                })
            }),
            new ldap.Change({
                operation: 'delete',
                modification: new Attribute({
                    type: 'sn',
                    values: ['foo-bar'],
                })
            })
            ], (err) => {
                expect(err).toBe(null);
            });

            client.del(baseDN_tad, (err) => {
                expect(err).toBe(null);
                done();
                client.unbind();
            });
        }
    });

});
