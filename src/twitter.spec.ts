import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Twitter } from '.';

config();

const { TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET, ACCESS_TOKEN_KEY, ACCESS_TOKEN_SECRET } = process.env;

const STRING_WITH_SPECIAL_CHARS = '`!@#$%^&*()-_=+[{]}\\|;:\'",<.>/? ✓';
// https://twitter.com/twlitetest
const DIRECT_MESSAGE_RECIPIENT_ID = '1253003423055843328';
const TEST_IMAGE = fs.readFileSync(path.join(__dirname, 'test.gif'));
const consumer = {
  key: TWITTER_CONSUMER_KEY!,
  secret: TWITTER_CONSUMER_SECRET!
};
const accessToken = {
  key: ACCESS_TOKEN_KEY!,
  secret: ACCESS_TOKEN_SECRET!
};

/**
 * Used when testing DMs to avoid getting flagged for abuse
 */
function randomString() {
  return Math.random().toString(36).substr(2, 11);
}

function htmlEscape(string: string) {
  return string.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

describe('configuration', () => {
  it('should default export to be a function', () => {
    expect(new Twitter({ consumer })).toBeInstanceOf(Twitter);
  });

  it('should return the API URL', () => {
    expect(new Twitter({ consumer }).api.url).toEqual('https://api.twitter.com/1.1');
  });

  it('should return a stream API URL', () => {
    expect(new Twitter({ consumer, subdomain: 'stream' }).api.url).toEqual('https://stream.twitter.com/1.1');
  });
});

describe('auth', () => {
  it('should fail on invalid access_token_secret', async () => {
    const twitter = new Twitter({
      subdomain: 'api',
      consumer,
      accessToken: {
        ...accessToken,
        secret: 'xyz'
      }
    });

    expect.assertions(1);

    try {
      await twitter.api.get('account/verify_credentials');
    } catch (e) {
      expect(e).toMatchObject({
        errors: [{ code: 32, message: 'Could not authenticate you.' }]
      });
    }
  });

  it('should fail on invalid or expired token', async () => {
    const twitter = new Twitter({
      subdomain: 'api',
      consumer: {
        key: 'xyz',
        secret: 'xyz'
      },
      accessToken: {
        key: 'xyz',
        secret: 'xyz'
      }
    });

    expect.assertions(1);
    try {
      await twitter.api.get('account/verify_credentials');
    } catch (e) {
      expect(e).toMatchObject({
        errors: [{ code: 89, message: 'Invalid or expired token.' }]
      });
    }
  });

  it('should verify credentials with correct tokens', async () => {
    const twitter = new Twitter({ consumer, accessToken });
    const response = await twitter.api.get('account/verify_credentials');
    expect(response).toHaveProperty('screen_name');
  });

  it('should use bearer token successfully', async () => {
    let twitter = new Twitter({ consumer });
    const response = await twitter.auth.getBearerToken();
    expect(response).toMatchObject({
      token_type: 'bearer'
    });
    twitter = new Twitter({
      consumer,
      bearerToken: response.access_token
    });
    const rateLimits = await twitter.api.get('application/rate_limit_status', {
      resources: 'statuses'
    });
    // This rate limit is 75 for user auth and 300 for app auth
    expect(rateLimits.resources.statuses['/statuses/retweeters/ids'].limit).toEqual(300);
  });
});

describe('posting', () => {
  let twitter: Twitter;
  beforeAll(() => (twitter = new Twitter({ consumer, accessToken })));

  it('should DM user, including special characters', async () => {
    const message = randomString(); // prevent overzealous abuse detection

    // POST with JSON body and no parameters per https://developer.twitter.com/en/docs/direct-messages/sending-and-receiving/api-reference/new-event
    const response = await twitter.api.post('direct_messages/events/new', {
      event: {
        type: 'message_create',
        message_create: {
          target: {
            recipient_id: DIRECT_MESSAGE_RECIPIENT_ID
          },
          message_data: {
            text: message + STRING_WITH_SPECIAL_CHARS
            // https://developer.twitter.com/en/docs/direct-messages/sending-and-receiving/api-reference/new-event#message-data-object
            // says "URL encode as necessary", but applying encodeURIComponent results in verbatim %NN being sent
          }
        }
      }
    });
    expect(response).toMatchObject({
      event: {
        type: 'message_create',
        id: expect.stringMatching(/^\d+$/),
        created_timestamp: expect.any(String),
        message_create: {
          message_data: {
            text: htmlEscape(message + STRING_WITH_SPECIAL_CHARS)
          }
        }
      }
    });
  });

  it('should send typing indicator and parse empty response', async () => {
    // https://developer.twitter.com/en/docs/direct-messages/typing-indicator-and-read-receipts/api-reference/new-typing-indicator
    const response = await twitter.api.post('direct_messages/indicate_typing', {
      recipient_id: DIRECT_MESSAGE_RECIPIENT_ID
    });
    expect(response).toEqual({ _headers: expect.any(Object) });
  });

  it('should post status update with escaped characters, then delete it', async () => {
    const message = randomString(); // prevent overzealous abuse detection

    // https://developer.twitter.com/en/docs/tweets/post-and-engage/api-reference/post-statuses-update
    const response = await twitter.api.post('statuses/update', {
      status: STRING_WITH_SPECIAL_CHARS + message + STRING_WITH_SPECIAL_CHARS
    });

    expect(response).toMatchObject({
      text: htmlEscape(STRING_WITH_SPECIAL_CHARS + message + STRING_WITH_SPECIAL_CHARS)
    });
    const id = response.id_str;
    const deleted = await twitter.api.post('statuses/destroy', {
      id
    });
    expect(deleted).toMatchObject({
      id_str: id
    });
  });
});

describe('uploading', () => {
  let twitter: Twitter;
  beforeAll(() => (twitter = new Twitter({ consumer, accessToken, subdomain: 'upload' })));

  it('should upload a picture, and add alt text to it', async () => {
    // Upload picture
    const base64Image = new Buffer(TEST_IMAGE).toString('base64');
    const mediaUploadResponse = await twitter.api.post('media/upload', {
      media_data: base64Image
    });
    expect(mediaUploadResponse).toMatchObject({
      media_id_string: expect.any(String)
    });

    // Set alt text
    const imageAltString = 'Animated picture of a dancing banana';
    await twitter.api.post('media/metadata/create', {
      media_id: mediaUploadResponse.media_id_string,
      alt_text: { text: imageAltString }
    });
  });
});

describe('putting', () => {
  let twitter: Twitter;
  beforeAll(() => (twitter = new Twitter({ consumer, accessToken })));
  /**
   * For this test you need to have opted to receive messages from anyone at https://twitter.com/settings/safety
   * and your demo app needs to have access to read, write, and direct messages.
   */
  it('can update welcome message', async () => {
    const newWelcomeMessage = await twitter.api.post('direct_messages/welcome_messages/new', {
      welcome_message: {
        name: 'simple_welcome-message 01',
        message_data: {
          text: 'Welcome!'
        }
      }
    });

    const updatedWelcomeMessage = await twitter.api.put(
      'direct_messages/welcome_messages/update',
      {
        id: newWelcomeMessage.welcome_message.id
      },
      {
        message_data: {
          text: 'Welcome!!!'
        }
      }
    );

    expect(updatedWelcomeMessage.welcome_message.message_data.text).toEqual('Welcome!!!');
  });
});

describe('misc', () => {
  let twitter: Twitter;
  beforeAll(() => (twitter = new Twitter({ consumer, accessToken })));

  it('should get full text of retweeted tweet', async () => {
    const response = await twitter.api.get('statuses/show', {
      id: '1019171288533749761', // a retweet by @dandv of @naval
      tweet_mode: 'extended'
    });
    // This is @naval's original tweet
    expect(response.retweeted_status.full_text).toEqual(
      '@jdburns4 “Retirement” occurs when you stop sacrificing today for an imagined tomorrow. You can retire when your passive income exceeds your burn rate, or when you can make a living doing what you love.'
    );
    // For the retweet, "truncated" comes misleadingly set to "false" from the API, and the "full_text" is limited to 140 chars
    expect(response.truncated).toEqual(false);
    expect(response.full_text).toEqual(
      'RT @naval: @jdburns4 “Retirement” occurs when you stop sacrificing today for an imagined tomorrow. You can retire when your passive income…'
    );
  });

  it('should have favorited at least one tweet ever', async () => {
    const response = await twitter.api.get('favorites/list');
    expect(response[0]).toHaveProperty('id_str');
  });

  it('should fail to follow unspecified user', async () => {
    expect.assertions(1);
    try {
      await twitter.api.post('friendships/create');
    } catch (e) {
      expect(e).toMatchObject({
        errors: [{ code: 108, message: 'Cannot find specified user.' }]
      });
    }
  });

  it('should follow user', async () => {
    const response = await twitter.api.post('friendships/create', {
      screen_name: 'mdo'
    });
    expect(response).toMatchObject({
      name: 'Mark Otto'
    });
  });

  it('should unfollow user', async () => {
    const response = await twitter.api.post('friendships/destroy', {
      user_id: '15008676'
    });
    expect(response).toMatchObject({
      name: 'Dan Dascalescu'
    });
  });

  it('should get details about 100 users with 18-character ids', async () => {
    const userIds = [...Array(99).fill('928759224599040001'), '711030662728437760'].join(',');
    const expectedIds = [{ id_str: '928759224599040001' }, { id_str: '711030662728437760' }];
    // Use POST per https://developer.twitter.com/en/docs/accounts-and-users/follow-search-get-users/api-reference/get-users-lookup
    const usersPost = await twitter.api.post('users/lookup', {
      user_id: userIds
    });
    delete usersPost._headers; // to not confuse Jest - https://github.com/facebook/jest/issues/5998#issuecomment-446827454
    expect(usersPost).toMatchObject(expectedIds);
    // Check if GET worked the same
    const usersGet = await twitter.api.get('users/lookup', { user_id: userIds });
    expect(usersGet.map((u: any) => u)).toMatchObject(expectedIds); // map(u => u) is an alternative to deleting _headers
  });

  it('should be unable to get details about suspended user', async () => {
    const nonexistentScreenName = randomString() + randomString();
    try {
      // https://twitter.com/fuckyou is actually a suspended user, but the API doesn't differentiate from nonexistent users
      await twitter.api.get('users/lookup', {
        screen_name: `fuckyou,${nonexistentScreenName}`
      });
    } catch (e) {
      expect(e).toMatchObject({
        errors: [{ code: 17, message: 'No user matches for specified terms.' }]
      });
    }
  });

  it('should get timeline', async () => {
    const response = await twitter.api.get('statuses/user_timeline', {
      screen_name: 'twitterapi',
      count: 2
    });
    expect(response).toHaveLength(2);
  });
});
