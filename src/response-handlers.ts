import querystring from 'querystring';
import { Response } from 'node-fetch';

/**
 * Parse the JSON from a Response object.
 * @internal
 */
export async function handleResponse(response: Response): Promise<any> {
  if (response.ok) {
    /**
     * Return empty response on 204 `No content`, or Content-Length=0
     */
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {};
    }

    /**
     * Otherwise, parse JSON response
     */
    return response.json();
  } else {
    throw await response.json();
  }
}

/**
 * Resolve the TEXT parsed from the successful response or reject the JSON from the error
 * @internal
 */
export async function handleResponseTextOrJson(response: Response): Promise<any> {
  const body = await response.text();

  if (response.ok) {
    return querystring.parse(body);
  } else {
    let error;

    try {
      error = JSON.parse(body);
    } catch (e) {
      error = body;
    }

    return Promise.reject(error);
  }
}
