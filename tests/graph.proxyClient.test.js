'use strict';

process.env["SKIP_DOTENV"] = "true";
const originalEnv = process.env;

const proxyClient = require('../proxyClient');
const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');
jest.mock('axios');
jest.mock('https-proxy-agent');

process.env.HTTP_PROXY="";

describe.each`
EnvName    | EnvVal
${'HTTP_PROXY'} | ${'http://127.0.0.1:3128'}
${'HTTPS_PROXY'} | ${'http://127.0.0.1:3128'}
${'SKIP_DOTENV'} | ${'true'}
`('when $EnvName=$EnvVal', ({ EnvName, EnvVal }) => {

//describe('proxyClient', () => {
    describe('sendPostRequestAsync', () => {
        beforeEach(() => {
            process.env[EnvName] = EnvVal;
        });

        afterEach(() => {
            jest.clearAllMocks();
            process.env = originalEnv;
        });

        test('should send a POST request with default options', async () => {
            const url = 'https://127.0.0.1/api';
            const expectedRequest = {
                method: 'POST',
                url,
                data: '',
                headers: {},
            };
            const expectedResponse = {
                headers: { 'content-type': 'application/json' },
                body: { message: 'Success!' },
                status: 200,
            };
            axios.mockResolvedValueOnce(expectedResponse);

            const result = await proxyClient.sendPostRequestAsync(url);

            expect(axios).toHaveBeenCalledWith(expectedRequest);
            expect(result).toEqual(expectedResponse);
        });

        test('should send a POST request with custom options', async () => {
            const url = 'https://127.0.0.1/api';
            const headers = { Authorization: 'Bearer token' };
            const body = JSON.stringify({ data: { message: 'Hello!' } });
            const expectedRequest = {
                method: 'POST',
                url,
                data: body,
                headers,
            };
            const expectedResponse = {
                headers: { 'content-type': 'application/json' },
                body: { message: 'Success!' },
                status: 200,
            };
            axios.mockResolvedValueOnce(expectedResponse);

            const result = await proxyClient.sendPostRequestAsync(url, { headers, body });

            expect(axios).toHaveBeenCalledWith(expectedRequest);
            expect(result).toEqual(expectedResponse);
        });

        test('should throw an error when the request fails', async () => {
            const url = 'https://127.0.0.1/api';
            const error = new Error('Request failed!');
            axios.mockRejectedValueOnce(error);

            await expect(proxyClient.sendPostRequestAsync(url)).rejects.toThrow(error);
        });
    });

    describe('sendGetRequestAsync', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        test('should send a GET request with default options', async () => {
            const url = 'https://127.0.0.1/api';
            const expectedRequest = {
                method: 'GET',
                url,
                data: '',
                headers: {},
            };
            const expectedResponse = {
                headers: { 'content-type': 'application/json' },
                body: { message: 'Success!' },
                status: 200,
            };
            axios.mockResolvedValueOnce(expectedResponse);

            const result = await proxyClient.sendGetRequestAsync(url);

            expect(axios).toHaveBeenCalledWith(expectedRequest);
            expect(result).toEqual(expectedResponse);
        });

        test('should send a GET request with custom options', async () => {
            const url = 'https://127.0.0.1/api/data';
            const headers = { Authorization: 'Bearer token' };
            const options = { headers };

            axios.mockResolvedValueOnce({ data: 'response', headers: {}, status: 200 });

            const result = await proxyClient.sendGetRequestAsync(url, options);

            expect(result).toEqual({ headers: {}, body: 'response', status: 200 });
            expect(axios).toHaveBeenCalledWith({
                method: 'GET',
                url,
                headers,
                data: '',
            });
        });

        test('should send a GET request with an empty options object', async () => {
            const url = 'https://127.0.0.1/api/data';

            axios.mockResolvedValueOnce({ data: 'response', headers: {}, status: 200 });

            const result = await proxyClient.sendGetRequestAsync(url, {});

            expect(result).toEqual({ headers: {}, body: 'response', status: 200 });
            expect(axios).toHaveBeenCalledWith({
                method: 'GET',
                url,
                headers: {},
                data: '',
            });
        });

        test('should send a GET request with no options', async () => {
            const url = 'https://127.0.0.1/api/data';

            axios.mockResolvedValueOnce({ data: 'response', headers: {}, status: 200 });

            const result = await proxyClient.sendGetRequestAsync(url);

            expect(result).toEqual({ headers: {}, body: 'response', status: 200 });
            expect(axios).toHaveBeenCalledWith({
                method: 'GET',
                url,
                headers: {},
                data: '',
            });
        });
    });
});