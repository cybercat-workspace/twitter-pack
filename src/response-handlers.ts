import querystring from 'querystring';
import { Response } from 'node-fetch';
import { ResponseResult } from './typings';

/**
 * Parse the JSON from a Response object.
 * @internal
 */
export async function handleResponse<D = any, E = any>(response: Response): Promise<ResponseResult<D, E>> {
  if (response.ok) {
    const isResponseEmpty = response.status === 204 || response.headers.get('content-length') === '0';
    /**
     * Return empty response on 204 `No content`, or Content-Length=0
     */
    const data: D = isResponseEmpty ? {} : await response.json();

    return {
      data
    };
  }

  const error = await response.json();

  return { error };
}

/**
 * Resolve the TEXT parsed from the successful response or reject the JSON from the error
 * @internal
 */
export async function handleResponseTextOrJson<D = any, E = any>(response: Response): Promise<ResponseResult<D, E>> {
  const body = await response.text();

  if (response.ok) {
    return {
      data: (querystring.parse(body) as any) as D
    };
  } else {
    let error;

    try {
      error = JSON.parse(body);
    } catch (e) {
      error = body;
    }

    return { error };
  }
}
