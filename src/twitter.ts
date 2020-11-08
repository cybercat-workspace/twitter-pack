import { OAuth } from './oauth-1.0a';
import { DEFAULT_TWITTER_SUBDOMAIN, DEFAULT_TWITTER_VERSION } from './constants';
import { TwitterOptions } from './twitter.typings';
import { TwitterAuth } from './twitter-auth';
import { TwitterClient } from './twitter-client';

export class Twitter {
  readonly auth: TwitterAuth;
  readonly client: TwitterClient;

  constructor(options: TwitterOptions) {
    const {
      accessTokenKey,
      accessTokenSecret,
      bearerToken,
      consumerKey,
      consumerSecret,
      subdomain = DEFAULT_TWITTER_SUBDOMAIN,
      version = DEFAULT_TWITTER_VERSION
    } = options;
    const oauth = new OAuth({
      consumer: {
        key: consumerKey,
        secret: consumerSecret
      }
    });

    this.auth = new TwitterAuth({ oauth, subdomain });
    this.client = new TwitterClient({
      oauth,
      subdomain,
      version,
      accessToken:
        accessTokenKey && accessTokenSecret
          ? {
              key: accessTokenKey,
              secret: accessTokenSecret
            }
          : undefined,
      bearerToken
    });
  }
}
