// Generic AWS Signature v4 implementation for S3-compatible storage
// Supports DigitalOcean Spaces and Hetzner Object Storage

async function sha256(message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  return crypto.subtle.digest('SHA-256', encoder.encode(message))
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const encoder = new TextEncoder()
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message))
}

async function getSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const kDate = await hmacSha256(encoder.encode('AWS4' + secretKey).buffer as ArrayBuffer, dateStamp)
  const kRegion = await hmacSha256(kDate, region)
  const kService = await hmacSha256(kRegion, service)
  return hmacSha256(kService, 'aws4_request')
}

interface S3ValidateRequest {
  accessKeyId: string
  secretAccessKey: string
  endpoint: string
  region: string
  bucketName: string
  allowedOrigin?: string
}

interface S3CreateBucketRequest {
  accessKeyId: string
  secretAccessKey: string
  endpoint: string
  region: string
  bucketName: string
}

interface S3SetCorsRequest {
  accessKeyId: string
  secretAccessKey: string
  endpoint: string
  region: string
  bucketName: string
  allowedOrigin: string
}

export async function handleS3Validate(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let body: S3ValidateRequest
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { accessKeyId, secretAccessKey, endpoint, region, bucketName, allowedOrigin } = body

  if (!accessKeyId || !secretAccessKey || !endpoint || !region || !bucketName) {
    return jsonResponse({ error: 'Missing required fields' }, 400)
  }

  try {
    const valid = await validateS3Credentials(accessKeyId, secretAccessKey, endpoint, region, bucketName)

    if (valid && allowedOrigin) {
      await putBucketCors(accessKeyId, secretAccessKey, endpoint, region, bucketName, allowedOrigin)
    }

    return jsonResponse({ valid })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ valid: false, error: message }, 200)
  }
}

export async function handleS3SetCors(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let body: S3SetCorsRequest
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { accessKeyId, secretAccessKey, endpoint, region, bucketName, allowedOrigin } = body

  if (!accessKeyId || !secretAccessKey || !endpoint || !region || !bucketName || !allowedOrigin) {
    return jsonResponse({ error: 'Missing required fields' }, 400)
  }

  try {
    console.log('Setting CORS for bucket:', bucketName, 'origin:', allowedOrigin)
    await putBucketCors(accessKeyId, secretAccessKey, endpoint, region, bucketName, allowedOrigin)
    return jsonResponse({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 400)
  }
}

export async function handleS3CreateBucket(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let body: S3CreateBucketRequest
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { accessKeyId, secretAccessKey, endpoint, region, bucketName } = body

  if (!accessKeyId || !secretAccessKey || !endpoint || !region || !bucketName) {
    return jsonResponse({ error: 'Missing required fields' }, 400)
  }

  try {
    await createS3Bucket(accessKeyId, secretAccessKey, endpoint, region, bucketName)
    return jsonResponse({ success: true, bucket: bucketName, region })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 400)
  }
}

async function validateS3Credentials(
  accessKeyId: string,
  secretAccessKey: string,
  endpoint: string,
  region: string,
  bucketName: string
): Promise<boolean> {
  const url = new URL(endpoint)
  const baseHost = url.host
  const host = `${bucketName}.${baseHost}`
  const bucketEndpoint = `https://${host}`
  const service = 's3'

  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)

  const payloadHash = toHex(await sha256(''))

  const method = 'GET'
  const canonicalUri = '/'
  const canonicalQuerystring = ''
  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n') + '\n'
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const algorithm = 'AWS4-HMAC-SHA256'
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    toHex(await sha256(canonicalRequest)),
  ].join('\n')

  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service)
  const signature = toHex(await hmacSha256(signingKey, stringToSign))

  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(bucketEndpoint, {
    method,
    headers: {
      'Host': host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authorization,
    },
  })

  return res.ok || res.status === 403
}

async function putBucketCors(
  accessKeyId: string,
  secretAccessKey: string,
  endpoint: string,
  region: string,
  bucketName: string,
  allowedOrigin: string
): Promise<void> {
  const url = new URL(endpoint)
  const baseHost = url.host
  const host = `${bucketName}.${baseHost}`
  const bucketEndpoint = `https://${host}/?cors`
  const service = 's3'

  const corsXml = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>${allowedOrigin}</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`

  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)

  const payloadHash = toHex(await sha256(corsXml))

  const method = 'PUT'
  const canonicalUri = '/'
  const canonicalQuerystring = 'cors='
  const canonicalHeaders = [
    `content-type:application/xml`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n') + '\n'
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const algorithm = 'AWS4-HMAC-SHA256'
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    toHex(await sha256(canonicalRequest)),
  ].join('\n')

  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service)
  const signature = toHex(await hmacSha256(signingKey, stringToSign))

  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(bucketEndpoint, {
    method,
    headers: {
      'Host': host,
      'Content-Type': 'application/xml',
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authorization,
    },
    body: corsXml,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to set CORS: ${res.status} - ${text}`)
  }
}

async function createS3Bucket(
  accessKeyId: string,
  secretAccessKey: string,
  endpoint: string,
  region: string,
  bucketName: string
): Promise<void> {
  const url = new URL(endpoint)
  const baseHost = url.host
  const host = `${bucketName}.${baseHost}`
  const bucketEndpoint = `https://${host}`
  const service = 's3'

  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)

  const xmlBody = ''
  const payloadHash = toHex(await sha256(xmlBody))

  const method = 'PUT'
  const canonicalUri = '/'
  const canonicalQuerystring = ''
  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n') + '\n'
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const algorithm = 'AWS4-HMAC-SHA256'
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    toHex(await sha256(canonicalRequest)),
  ].join('\n')

  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service)
  const signature = toHex(await hmacSha256(signingKey, stringToSign))

  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(bucketEndpoint, {
    method,
    headers: {
      'Host': host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authorization,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    if (text.includes('BucketAlreadyOwnedByYou')) {
      return
    }
    if (text.includes('BucketAlreadyExists')) {
      throw new Error('This bucket name is already taken. Please choose a different name.')
    }
    throw new Error(`Failed to create bucket: ${res.status} - ${text}`)
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
