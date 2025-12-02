// AWS Signature v4 implementation for DigitalOcean Spaces bucket creation

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

interface CreateBucketRequest {
  accessKeyId: string
  secretAccessKey: string
  region: string
  bucketName: string
}

export async function handleSpacesCreateBucket(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let body: CreateBucketRequest
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { accessKeyId, secretAccessKey, region, bucketName } = body

  if (!accessKeyId || !secretAccessKey || !region || !bucketName) {
    return jsonResponse({ error: 'Missing required fields' }, 400)
  }

  try {
    await createSpacesBucket(accessKeyId, secretAccessKey, region, bucketName)
    return jsonResponse({ success: true, bucket: bucketName, region })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 400)
  }
}

// Check if a Space bucket name is available using DO's GraphQL API
export async function handleSpacesCheckName(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let body: { region: string; bucketName: string }
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { bucketName } = body

  if (!bucketName) {
    return jsonResponse({ error: 'Missing required fields' }, 400)
  }

  try {
    // Use DO's GraphQL API for accurate bucket name validation
    const res = await fetch('https://cloud.digitalocean.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operationName: 'ObjectStorageValidateBucketName',
        variables: { bucketName },
        query: `query ObjectStorageValidateBucketName($bucketName: String!) {
          objectStorageValidateBucketName(bucket_name: $bucketName) {
            is_valid
            reason
            __typename
          }
        }`,
      }),
    })

    const data = await res.json() as {
      data?: {
        objectStorageValidateBucketName?: {
          is_valid: boolean
          reason: string | null
        }
      }
    }

    const result = data.data?.objectStorageValidateBucketName
    const available = result?.is_valid ?? false
    const reason = result?.reason

    return jsonResponse({ available, bucketName, reason })
  } catch (err) {
    console.error('Failed to check bucket name:', err)
    // On error, let creation attempt proceed and fail there if needed
    return jsonResponse({ available: true, bucketName, reason: null })
  }
}

async function createSpacesBucket(
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  bucketName: string
): Promise<void> {
  // Virtual-hosted style: https://bucket-name.region.digitaloceanspaces.com/
  const host = `${bucketName}.${region}.digitaloceanspaces.com`
  const endpoint = `https://${host}`
  const service = 's3'

  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)

  // Empty body for bucket creation with virtual-hosted style
  const xmlBody = ''
  const payloadHash = toHex(await sha256(xmlBody))

  // Canonical request - virtual-hosted style uses / as the URI
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

  // String to sign - use us-east-1 as region for signing (DO Spaces requirement)
  const algorithm = 'AWS4-HMAC-SHA256'
  const signingRegion = 'us-east-1'
  const credentialScope = `${dateStamp}/${signingRegion}/${service}/aws4_request`
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    toHex(await sha256(canonicalRequest)),
  ].join('\n')

  // Calculate signature
  const signingKey = await getSigningKey(secretAccessKey, dateStamp, signingRegion, service)
  const signature = toHex(await hmacSha256(signingKey, stringToSign))

  // Authorization header
  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  console.log('Creating bucket:', {
    endpoint,
    host,
    method,
    canonicalUri,
    signingRegion,
    accessKeyId: accessKeyId.substring(0, 8) + '...',
    amzDate,
  })

  const res = await fetch(endpoint, {
    method,
    headers: {
      'Host': host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authorization,
    },
  })

  console.log('Response status:', res.status)

  if (!res.ok) {
    const text = await res.text()
    // Check for BucketAlreadyOwnedByYou (not an error - bucket exists and we own it)
    if (text.includes('BucketAlreadyOwnedByYou')) {
      return
    }
    // Check for BucketAlreadyExists (owned by someone else)
    if (text.includes('BucketAlreadyExists')) {
      throw new Error('This Space name is already taken. Please choose a different name.')
    }
    throw new Error(`Failed to create Space: ${res.status} - ${text}`)
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
