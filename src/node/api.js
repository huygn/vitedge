import nodeFetch from 'node-fetch'
import { getEventType, normalizePathname } from './utils.js'

export async function handleApiRequest({ url, functions }, event) {
  const fnMeta = functions[normalizePathname(url)]

  if (fnMeta) {
    const { data } = await fnMeta.handler({
      ...event,
      url,
    })

    const headers = {
      'content-type': 'application/json',
      ...(fnMeta.options || {}).headers,
    }

    return {
      statusCode: 200,
      headers,
      body: (headers['content-type'] || '').startsWith('application/json')
        ? JSON.stringify(data)
        : data,
    }
  } else {
    return { statusCode: 404 }
  }
}

export function createLocalFetch({ url, functions }) {
  // Redirect API requests during SSR to bundled functions
  return async function localFetch(resource, options = {}) {
    if (typeof resource === 'string' && resource.startsWith('/')) {
      url = new URL(url)
      ;[url.pathname, url.search] = resource.split('?')

      if (getEventType({ functions, url }) === 'api') {
        const request = new Request(url, options)

        const { body, headers, statusCode: status } = await handleApiRequest(
          { url, functions },
          { url, request, event: { request } }
        )

        return new Response(body, { headers, status })
      }
    }

    return nodeFetch(resource, options)
  }
}
