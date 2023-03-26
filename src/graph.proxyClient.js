'use strict';

/**
 * proxyClient - axios as HttpClient with proxy support
 * because msalConfig.system.proxyUrl is not (yet) working 
 */

const helper = require('./helper');
const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

axios.defaults.proxy = false;
axios.defaults.httpsAgent = new HttpsProxyAgent(proxyUrl);

/**
 * Sends an HTTP request using Axios with proxy support.
 * @async
 * @function
 * @param {string} method - The HTTP method (e.g. 'GET', 'POST').
 * @param {string} url - The URL to send the request to.
 * @param {object} [options] - An optional object that can contain the following keys:
 * @param {object} [options.headers] - An object containing the request headers.
 * @param {string} [options.body] - The request body.
 * @returns {Promise<object>} - A Promise that resolves to an object containing the response headers, body, and status code.
 */

async function sendRequestAsync(method, url, { headers = {}, body = '' } = {}) {
  helper.log(`graph.proxyClient.js`, `send${method}RequestAsync`, { method, url, headers, body });

  const request = {
    method,
    url,
    data: body,
    headers,
  };

  helper.log(`graph.proxyClient.js`, `send${method}RequestAsync`, 'request', request);

  try {
    const response = await axios(request);
    const result = {
      headers: response.headers,
      body: response.body || response.data,
      status: response.status,
    };

    helper.log(`graph.proxyClient.js`, `send${method}RequestAsync`, 'result', result);

    return result;
  } catch (error) {

    // helper.error(`graph.proxyClient.js`, `send${method}RequestAsync`, 'error', error);
    const response = error.response || {};

    const result = {
      headers: response.headers || {},
      body: response.body || response.data || error,
      status: response.status || 500,
    };
    
    return result;

    // throw error.response || error;
  }
}

module.exports = {
  sendGetRequestAsync: (url, options) => sendRequestAsync('GET', url, options),
  sendPostRequestAsync: (url, options) => sendRequestAsync('POST', url, options),
};
