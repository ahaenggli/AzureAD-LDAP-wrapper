'use strict';

jest.spyOn(console, 'log').mockImplementation(() => { });
jest.spyOn(console, 'warn').mockImplementation(() => { });
jest.spyOn(console, 'error').mockImplementation(() => { });

process.env["SKIP_DOTENV"] = "true";
const originalEnv = process.env;
const dotenv = require('dotenv');
process.env = originalEnv;
dotenv.config({ path: `.env`, override: true });
process.env['GRAPH_FILTER_USERS'] = '';
process.env['GRAPH_FILTER_GROUPS'] = '';

const fetch = require('../src/graph.fetch');

describe('Graph API Fetch without access token', () => {

    it('should not throw errors and be set as wished', async () => {
        expect(fetch.apiConfig.gri).toBe("https://graph.microsoft.com/v1.0/groups?");
        expect(fetch.apiConfig.uri).toBe("https://graph.microsoft.com/v1.0/users?$select=businessPhones,displayName,givenName,jobTitle,mail,mobilePhone,officeLocation,preferredLanguage,surname,userPrincipalName,id,identities,userType,externalUserState");
        expect(fetch.apiConfig.mri).toBe("https://graph.microsoft.com/v1.0/groups/{id}/members");
    });

    it('should return an empty array if no users are found', async () => {
        const users = await fetch.getUsers();
        expect(users).toEqual([]);
    });

    it('should return an empty array if no groups are found', async () => {
        const groups = await fetch.getGroups();
        expect(groups).toEqual([]);
    });

    it('should return an empty array if no members are found', async () => {
        const noMembers = await fetch.getMembers({});
        expect(noMembers).toEqual([]);
    });

});

describe('Graph API Fetch with access token', () => {

    it('should not throw errors and be set as wished', async () => {

        expect(fetch.apiConfig.gri).toBe("https://graph.microsoft.com/v1.0/groups?");
        expect(fetch.apiConfig.uri).toBe("https://graph.microsoft.com/v1.0/users?$select=businessPhones,displayName,givenName,jobTitle,mail,mobilePhone,officeLocation,preferredLanguage,surname,userPrincipalName,id,identities,userType,externalUserState");
        expect(fetch.apiConfig.mri).toBe("https://graph.microsoft.com/v1.0/groups/{id}/members");
        expect(async () => {
            await fetch.initAccessToken();
        }).not.toThrow();

    });

    it('should return an empty array if no users are found', async () => {
        await fetch.initAccessToken();
        const users = await fetch.getUsers();
        expect(users).not.toHaveLength(0);
    });

    it('should return an empty array if no groups are found', async () => {
        await fetch.initAccessToken();
        const groups = await fetch.getGroups();
        expect(groups).not.toHaveLength(0);
    });

    it('should return an empty array if no members are found', async () => {
        await fetch.initAccessToken();
        const groups = await fetch.getGroups();
        expect(groups).not.toHaveLength(0);
        const members = await fetch.getMembers(groups[0]);
        expect(members).not.toHaveLength(0);

        const noMembers = await fetch.getMembers({});
        expect(noMembers).toEqual([]);

    });

});
