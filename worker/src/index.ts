import { handleFoundryAuth, handleFoundryDownload } from './foundry'
import { handleSpacesCreateBucket, handleSpacesCheckName } from './spaces'

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://fvtt-installer.artificery.io',
]

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get('Origin') || ''

    // Check origin
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response('Forbidden', { status: 403 })
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    const url = new URL(request.url)
    const path = url.pathname

    // Route: Foundry VTT authentication (get licenses)
    if (path === '/foundry/auth') {
      const response = await handleFoundryAuth(request)
      return addCorsHeaders(response, origin)
    }

    // Route: Foundry VTT download URL
    if (path === '/foundry/download') {
      const response = await handleFoundryDownload(request)
      return addCorsHeaders(response, origin)
    }

    // Route: Check if Space name is available
    if (path === '/spaces/check-name') {
      const response = await handleSpacesCheckName(request)
      return addCorsHeaders(response, origin)
    }

    // Route: Spaces bucket creation (proxy to avoid CORS)
    if (path === '/spaces/create-bucket') {
      const response = await handleSpacesCreateBucket(request)
      return addCorsHeaders(response, origin)
    }

    // Route: Cloudflare API proxy
    if (path.startsWith('/client/v4')) {
      return handleCloudflareProxy(request, path, url.search, origin)
    }

    return jsonResponse({ error: 'Not found' }, origin, 404)
  },
}

async function handleCloudflareProxy(
  request: Request,
  path: string,
  search: string,
  origin: string
): Promise<Response> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing Authorization header' }, origin, 401)
  }

  const apiUrl = `https://api.cloudflare.com${path}${search}`

  const response = await fetch(apiUrl, {
    method: request.method,
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: request.method !== 'GET' ? request.body : undefined,
  })

  const data = await response.json()
  return jsonResponse(data, origin, response.status)
}

function jsonResponse(data: unknown, origin: string, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
    },
  })
}

function addCorsHeaders(response: Response, origin: string): Response {
  const newHeaders = new Headers(response.headers)
  newHeaders.set('Access-Control-Allow-Origin', origin)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}
