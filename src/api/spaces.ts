// Spaces bucket creation via worker proxy (avoids CORS)

const CF_PROXY = import.meta.env.VITE_CF_PROXY_URL || 'https://cors-proxy.artificery.io'

interface SpacesCredentials {
  accessKeyId: string
  secretAccessKey: string
}

export interface SpaceNameCheck {
  available: boolean
  reason: string | null
}

export async function checkSpaceNameAvailable(
  bucketName: string
): Promise<SpaceNameCheck> {
  const res = await fetch(`${CF_PROXY}/spaces/check-name`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bucketName }),
  })

  const data = await res.json()
  return {
    available: data.available ?? true,
    reason: data.reason ?? null,
  }
}

export async function createSpace(
  credentials: SpacesCredentials,
  region: string,
  bucketName: string
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
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'Failed to create Space')
  }
}

