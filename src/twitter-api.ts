import querystring from 'querystring';
import fetch, { RequestInit } from 'node-fetch';
import { ResponseResult } from './typings';
import { OAuth } from './oauth-1.0a';
import { JSON_ENDPOINTS } from './constants';
import { handleResponse } from './response-handlers';
import { getTwitterUrl } from './get-twitter-url';

/**
 * From OAuth.prototype.percentEncode w/o encodeURIComponent
 * @internal
 */
function percentEncode(str: string) {
  return str
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function isNotEmptyObject(obj: Record<string, any> | undefined): obj is Record<string, any> {
  return !!(obj && Object.keys(obj).length);
}

export class TwitterApi {
  private readonly oauth: OAuth;
  private readonly subdomain: string;
  private readonly version: string;
  private readonly accessToken?: {
    key: string;
    secret: string;
  };
  private readonly bearerToken?: string;

  get url() {
    return getTwitterUrl(this.subdomain, this.version);
  }

  constructor(options: {
    oauth: OAuth;
    subdomain: string;
    version: string;
    accessToken?: {
      key: string;
      secret: string;
    };
    bearerToken?: string;
  }) {
    const { accessToken, bearerToken, oauth, subdomain, version } = options;
    this.accessToken = accessToken;
    this.bearerToken = bearerToken;
    this.oauth = oauth;
    this.subdomain = subdomain;
    this.version = version;
  }

  private _request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    resource: string,
    resolveInit: (headers: Record<string, string>) => RequestInit,
    parameters?: Record<string, any>
  ) {
    const requestData: { url: string; method: string; data?: Record<string, any> } = {
      url: `${this.url}/${resource}.json`,
      method
    };

    if (isNotEmptyObject(parameters)) {
      if (method === 'POST') {
        requestData.data = parameters;
      } else {
        requestData.url += `?${querystring.stringify(parameters)}`;
      }
    }

    const headers = (this.bearerToken
      ? {
          Authorization: `Bearer ${this.bearerToken}`
        }
      : this.oauth.toHeader(this.oauth.authorize(requestData, this.accessToken))) as Record<string, any>;
    const init = resolveInit(headers);

    return fetch(requestData.url, { ...init, method }).then(handleResponse);
  }

  /**
   * Send a GET request
   * @param resource - endpoint, e.g. `followers/ids`
   * @returns Promise resolving to the response from the Twitter API.
   */
  get<D = any, E = any>(resource: string, parameters?: Record<string, any>): Promise<ResponseResult<D, E>> {
    return this._request('GET', resource, headers => ({ headers }), parameters);
  }

  /**
   * Send a POST request
   * @param resource - endpoint, e.g. `users/lookup`
   * @param body - POST parameters object. Will be encoded appropriately (JSON or urlencoded) based on the resource
   * @returns Promise resolving to the response from the Twitter API.
   */
  post<D = any, E = any>(resource: string, body?: Record<string, any>): Promise<ResponseResult<D, E>> {
    const isJsonEndpoint = JSON_ENDPOINTS.includes(resource);
    /**
     * Don't sign JSON bodies. Only parameters
     */
    const parameters = isJsonEndpoint ? undefined : body;

    return this._request(
      'POST',
      resource,
      headersBase => {
        const headers = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...headersBase
        };

        if (!isJsonEndpoint) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }

        const init: RequestInit = {
          headers
        };

        if (isNotEmptyObject(body)) {
          init.body = isJsonEndpoint ? JSON.stringify(body) : percentEncode(querystring.stringify(body));
        }

        return init;
      },
      parameters
    );
  }

  /**
   * Send a PUT request
   * @param resource - endpoint e.g. `direct_messages/welcome_messages/update`
   * @param parameters - required or optional query parameters
   * @param body - PUT request body
   */
  put<D = any, E = any>(
    resource: string,
    parameters: Record<string, any> = {},
    body: Record<string, any> = {}
  ): Promise<ResponseResult<D, E>> {
    return this._request(
      'PUT',
      resource,
      headers => {
        const init: RequestInit = {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...headers
          }
        };

        if (isNotEmptyObject(body)) {
          init.body = JSON.stringify(body);
        }

        return init;
      },
      parameters
    );
  }

  /**
   * Send a DELETE request
   * @param resource - endpoint e.g. `account_activity/all/:env_name/webhooks/:webhook_id`
   * @param parameters - required or optional query parameters
   * @param body - DELETE request body
   */
  delete<D = any, E = any>(
    resource: string,
    parameters: Record<string, any> = {},
    body: Record<string, any> = {}
  ): Promise<ResponseResult<D, E>> {
    return this._request(
      'DELETE',
      resource,
      headers => {
        const init: RequestInit = {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...headers
          }
        };

        if (isNotEmptyObject(body)) {
          init.body = JSON.stringify(body);
        }

        return init;
      },
      parameters
    );
  }
}
