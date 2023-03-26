'use strict';

jest.spyOn(console, 'log').mockImplementation(() => { });
jest.spyOn(console, 'warn').mockImplementation(() => { });
jest.spyOn(console, 'error').mockImplementation(() => { });

process.env["HTTP_PROXY"] = "http://127.0.0.1:3128";
process.env["GRAPH_FILTER_GROUPS"] = "SecurityEnabled eq true";
process.env["SKIP_DOTENV"] = "true";

const fetch = require('../src/graph.fetch');

describe('Graph API Fetch with proxy', () => {

    it('should fail', async () => {

        expect(fetch.apiConfig.gri).toBe("https://graph.microsoft.com/v1.0/groups?&$filter=SecurityEnabled%20eq%20true");
        expect(fetch.apiConfig.uri).toBe("https://graph.microsoft.com/v1.0/users?$select=businessPhones,displayName,givenName,jobTitle,mail,mobilePhone,officeLocation,preferredLanguage,surname,userPrincipalName,id,identities,userType,externalUserState");
        expect(fetch.apiConfig.mri).toBe("https://graph.microsoft.com/v1.0/groups/{id}/members");

    });

    it('should not throw errors and be set as wished', async () => {
        expect(fetch.apiConfig.gri).toBe("https://graph.microsoft.com/v1.0/groups?&$filter=SecurityEnabled%20eq%20true");
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

