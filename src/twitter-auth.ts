import querystring from 'querystring';
import fetch from 'node-fetch';
import {
  TwitterAccessTokenResponse,
  TwitterBearerTokenResponse,
  TwitterGetAccessTokenOptions,
  TwitterGetRequestTokenAndAuthenticateUrlParamters,
  TwitterRequestTokenResponse,
  TwitterRequestTokenResponseAndAuthenticateUrl
} from './typings';
import { OAuth } from './oauth-1.0a';
import { getTwitterUrl } from './get-twitter-url';
import { handleResponse, handleResponseTextOrJson } from './response-handlers';

export class TwitterAuth {
  private readonly subdomain: string;
  private readonly oauth: OAuth;

  get url() {
    return getTwitterUrl(this.subdomain, 'oauth');
  }

  constructor(options: { oauth: OAuth; subdomain: string }) {
    const { oauth, subdomain } = options;
    this.oauth = oauth;
    this.subdomain = subdomain;
  }

  getBearerToken(): Promise<TwitterBearerTokenResponse> {
    const { key, secret } = this.oauth.consumer;
    const hash = Buffer.from(`${key}:${secret}`).toString('base64');
    const headers = {
      Authorization: `Basic ${hash}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    };

    return fetch(getTwitterUrl('api', 'oauth2/token'), {
      method: 'POST',
      body: 'grant_type=client_credentials',
      headers
    }).then(handleResponse);
  }

  getRequestToken(twitterCallbackUrl: string | 'oob'): Promise<TwitterRequestTokenResponse> {
    const query = twitterCallbackUrl ? `?${querystring.stringify({ oauth_callback: twitterCallbackUrl })}` : '';
    const requestData = {
      url: `${this.url}/request_token${query}`,
      method: 'POST'
    };
    const headers = this.oauth.toHeader(this.oauth.authorize(requestData));

    return fetch(requestData.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers
      }
    }).then(handleResponseTextOrJson);
  }

  /**
   * @see {https://developer.twitter.com/en/docs/authentication/api-reference/authenticate}
   */
  async getRequestTokenAndAuthenticateUrl(
    twitterCallbackUrl: string | 'oob',
    parameters: TwitterGetRequestTokenAndAuthenticateUrlParamters = {}
  ): Promise<TwitterRequestTokenResponseAndAuthenticateUrl> {
    const result = await this.getRequestToken(twitterCallbackUrl);
    const query = querystring.stringify({
      ...parameters,
      oauth_token: result.oauth_token
    });

    return {
      ...result,
      authenticateUrl: `${getTwitterUrl('api', 'oauth/authenticate')}?${query}`
    };
  }

  getAccessToken(options: TwitterGetAccessTokenOptions): Promise<TwitterAccessTokenResponse> {
    const { oauth_verifier, oauth_token } = options;
    const qs =
      oauth_verifier && oauth_token
        ? `?${querystring.stringify({
            oauth_verifier,
            oauth_token
          })}`
        : '';
    const requestData = {
      url: `${this.url}/access_token${qs}`,
      method: 'POST'
    };
    const headers = this.oauth.toHeader(this.oauth.authorize(requestData));

    return fetch(requestData.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers
      }
    }).then(handleResponseTextOrJson);
  }
}
