export interface TwitterOptions {
  consumerKey: string;
  consumerSecret: string;
  /**
   * @default 'api'
   */
  subdomain?: string;
  /**
   * @default '1.1'
   */
  version?: string;
  /**
   * access token key from your User (oauth_token)
   */
  accessTokenKey?: string;
  /**
   * access token secret from your User (oauth_token_secret)
   */
  accessTokenSecret?: string;
  bearerToken?: string;
}

/**
 * In reality snowflakes are BigInts. Once BigInt is supported by browsers and Node per default, we could adjust this type.
 * Currently Twitter themselves convert it to strings for the API though, so this change will come some time in the far future.
 */
type Snowflake = string;

export interface TwitterBearerTokenResponse {
  token_type: 'bearer';
  access_token: string;
}

export interface TwitterRequestTokenResponse {
  oauth_token: string;
  oauth_token_secret: string;
  oauth_callback_confirmed: 'true' | 'false';
}
/**
 * @see {https://developer.twitter.com/en/docs/authentication/api-reference/authenticate}
 */
export interface TwitterGetRequestTokenAndAuthenticateUrlParamters {
  force_login?: boolean;
  screen_name?: string;
}

export interface TwitterRequestTokenResponseAndAuthenticateUrl extends TwitterRequestTokenResponse {
  authenticateUrl: string;
}

export interface TwitterGetAccessTokenOptions {
  /**
   * If using the OAuth web-flow, set these parameters to the values returned in the callback URL. If you are using out-of-band OAuth, set the value of oauth_verifier to the pin-code.
   * The oauth_token here must be the same as the oauth_token returned in the request_token step.
   */
  oauth_verifier: string | number;
  oauth_token: string;
}

export interface TwitterAccessTokenResponse {
  oauth_token: string;
  oauth_token_secret: string;
  user_id: Snowflake;
  screen_name: string;
}
