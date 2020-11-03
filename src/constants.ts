export const DEFAULT_TWITTER_SUBDOMAIN = 'api';

export const DEFAULT_TWITTER_VERSION = '1.1';

/**
 * Twitter expects POST body parameters to be URL-encoded: https://developer.twitter.com/en/docs/basics/authentication/guides/creating-a-signature
 * However, some endpoints expect a JSON payload - https://developer.twitter.com/en/docs/direct-messages/sending-and-receiving/api-reference/new-event
 * It appears that JSON payloads don't need to be included in the signature, because sending DMs works without signing the POST body
 */
export const JSON_ENDPOINTS: ReadonlyArray<string> = [
  'direct_messages/events/new',
  'direct_messages/welcome_messages/new',
  'direct_messages/welcome_messages/rules/new',
  'media/metadata/create',
  'collections/entries/curate'
];
