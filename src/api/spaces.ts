// Spaces bucket creation via worker proxy (avoids CORS)

const CF_PROXY = import.meta.env.VITE_CF_PROXY_URL || 'https://cors-proxy.artificery.io'

interface SpacesCredentials {
  accessKeyId: string
  secretAccessKey: string
}

export async function createSpace(
  credentials: SpacesCredentials,
  region: string,
  bucketName: string,
  allowedOrigin?: string
): Promise<void> {
  const res = await fetch(`${CF_PROXY}/spaces/create-bucket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      region,
      bucketName,
      allowedOrigin,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'Failed to create Space')
  }
}

export async function setSpacesCors(
  credentials: SpacesCredentials,
  region: string,
  bucketName: string,
  allowedOrigin: string
): Promise<void> {
  const res = await fetch(`${CF_PROXY}/spaces/set-cors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      region,
      bucketName,
      allowedOrigin,
    }),
  })

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to set CORS')
  }
}

