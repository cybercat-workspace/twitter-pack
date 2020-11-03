/**
 * @internal
 */
export function getTwitterUrl(subdomain: string, endpoint: string) {
  return `https://${subdomain}.twitter.com/${endpoint}`;
}
