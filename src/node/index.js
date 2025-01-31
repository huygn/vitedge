import nodeFetch from 'node-fetch'
import { createLocalFetch, handleApiRequest } from './api.js'
import { getPageProps } from './props.js'
import { getEventType } from './utils.js'

export { getEventType }

globalThis.fetch = nodeFetch
globalThis.Request = nodeFetch.Request
globalThis.Response = nodeFetch.Response

export async function handleEvent(
  { functions, router, url, manifest, preload = true },
  event = {}
) {
  const type = getEventType({ url, functions })

  if (type === 'api') {
    return handleApiRequest({ url, functions }, event)
  }

  // From here, only GET method is supported
  const method = event.method || event.httpMethod || 'GET'
  if (method !== 'GET' || url.pathname.includes('favicon.ico')) {
    return { statusCode: 404 }
  }

  const pageProps = await getPageProps({ functions, router, url }, event)

  // This handles SPA page props requests from the browser
  if (type === 'props') {
    return { body: JSON.stringify(pageProps || {}) }
  }

  globalThis.fetch = createLocalFetch({ url, functions })

  // If it didn't match anything else up to here, fallback to HTML rendering
  const { html, ...extra } = await router.render(url, {
    ...event,
    initialState: pageProps,
    manifest,
    preload,
  })

  globalThis.fetch = nodeFetch

  return { statusCode: 200, body: html, extra }
}
