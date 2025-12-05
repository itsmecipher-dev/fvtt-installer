import type { StorageProvider, StorageRegion, StorageCredentials } from '../types'

const DO_API = 'https://api.digitalocean.com/v2'
const CF_PROXY = import.meta.env.VITE_CF_PROXY_URL || 'https://cors-proxy.artificery.io'

const SPACES_REGIONS: StorageRegion[] = [
  { slug: 'nyc3', name: 'New York 3', endpoint: 'nyc3.digitaloceanspaces.com' },
  { slug: 'sfo3', name: 'San Francisco 3', endpoint: 'sfo3.digitaloceanspaces.com' },
  { slug: 'ams3', name: 'Amsterdam 3', endpoint: 'ams3.digitaloceanspaces.com' },
  { slug: 'sgp1', name: 'Singapore 1', endpoint: 'sgp1.digitaloceanspaces.com' },
  { slug: 'fra1', name: 'Frankfurt 1', endpoint: 'fra1.digitaloceanspaces.com' },
  { slug: 'syd1', name: 'Sydney 1', endpoint: 'syd1.digitaloceanspaces.com' },
]

export const digitalOceanStorage: StorageProvider = {
  id: 'digitalocean',
  supportsAutomatedKeyCreation: true,

  getRegions(): StorageRegion[] {
    return SPACES_REGIONS
  },

  getEndpoint(region: string): string {
    return `${region}.digitaloceanspaces.com`
  },

  async validateCredentials(
    credentials: StorageCredentials,
    region: string,
    _bucketName?: string,
    _allowedOrigin?: string
  ): Promise<boolean> {
    const res = await fetch(`${CF_PROXY}/spaces/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        region,
      }),
    })
    return res.ok
  },

  async createBucket(
    credentials: StorageCredentials,
    region: string,
    bucketName: string,
    allowedOrigin?: string
  ): Promise<void> {
    const res = await fetch(`${CF_PROXY}/spaces/create-bucket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  },

  async setCors(
    credentials: StorageCredentials,
    region: string,
    bucketName: string,
    allowedOrigin: string
  ): Promise<void> {
    const res = await fetch(`${CF_PROXY}/spaces/set-cors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  },

  async createAccessKey(
    apiKey: string,
    name: string,
    bucket?: string,
    region?: string
  ): Promise<StorageCredentials & { id: string }> {
    const body: Record<string, unknown> = { name }

    if (bucket && region) {
      body.grants = [{
        bucket,
        region,
        permission: 'readwrite'
      }]
    } else {
      body.grants = [{
        bucket: '',
        permission: 'fullaccess'
      }]
    }

    const res = await fetch(`${DO_API}/spaces/keys`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || 'Failed to create Spaces access key')
    }
    const data = await res.json()
    return {
      id: data.key.access_key,
      accessKeyId: data.key.access_key,
      secretAccessKey: data.key.secret_key,
    }
  },

  async deleteAccessKey(apiKey: string, keyId: string): Promise<void> {
    const res = await fetch(`${DO_API}/spaces/keys/${keyId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok && res.status !== 404) {
      const err = await res.json()
      throw new Error(err.message || 'Failed to delete Spaces access key')
    }
  },
}
