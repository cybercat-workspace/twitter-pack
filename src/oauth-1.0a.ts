import crypto from 'crypto';
import OAuthPack from 'oauth-1.0a';

/**
 * @internal
 */
interface OAuthOptions {
  consumer: OAuthPack.Consumer;
}

/**
 * @internal
 */
export class OAuth extends OAuthPack {
  readonly consumer: Readonly<OAuthPack.Consumer>;

  constructor(options: OAuthOptions) {
    const { consumer } = options;

    super({
      consumer,
      signature_method: 'HMAC-SHA1',
      hash_function: (baseString, key) => crypto.createHmac('sha1', key).update(baseString).digest('base64')
    });

    this.consumer = consumer;
  }
}
