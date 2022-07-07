'use strict';

const helper = require('./helper');
const axios = require('axios');
const proxyUrl = (process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "");

/**
 * Proxy support
 *  - set defaults axios proxy 
 */

if (proxyUrl != "") {
  const HttpsProxyAgent = require('https-proxy-agent');
  axios.defaults.proxy = false;
  axios.defaults.httpsAgent = new HttpsProxyAgent(proxyUrl);
}

async function sendGetRequestAsync(url, options) {
  helper.log("sendGetRequestAsync", "url", url);
  helper.log("sendGetRequestAsync", "options", options);

  const request = {
    method: "GET",
    url: url,
    headers: options && options.headers,
    validateStatus: () => true
  };
  helper.log("sendGetRequestAsync", "request", request);

  const response = await axios(request);
  helper.log("sendGetRequestAsync", "response", response);

  const result = {
    headers: response.headers,
    body: response.data,
    status: response.status
  };
  helper.log("sendGetRequestAsync", "result", result);

  return result;

}

async function sendPostRequestAsync(url, options) {
  helper.log("sendPostRequestAsync", "url", url);
  helper.log("sendPostRequestAsync", "options", options);

  const request = {
    method: "POST",
    url: url,
    data: (options && options.body) || "",
    headers: options && options.headers,
    validateStatus: () => true
  };

  helper.log("sendPostRequestAsync", "request", request);
  const response = await axios(request);

  const result = {
    headers: response.headers,
    body: response.data,
    status: response.status
  };

  helper.log("sendPostRequestAsync", "result", result);

  return result;
}

module.exports = {
  sendGetRequestAsync,
  sendPostRequestAsync
}