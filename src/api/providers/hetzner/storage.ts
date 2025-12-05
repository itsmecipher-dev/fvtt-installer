import type { StorageProvider, StorageRegion, StorageCredentials } from '../types'

const CF_PROXY = import.meta.env.VITE_CF_PROXY_URL || 'https://cors-proxy.artificery.io'

const HETZNER_STORAGE_REGIONS: StorageRegion[] = [
  { slug: 'fsn1', name: 'Falkenstein (fsn1)', endpoint: 'fsn1.your-objectstorage.com' },
  { slug: 'nbg1', name: 'Nuremberg (nbg1)', endpoint: 'nbg1.your-objectstorage.com' },
  { slug: 'hel1', name: 'Helsinki (hel1)', endpoint: 'hel1.your-objectstorage.com' },
]

export const hetznerStorage: StorageProvider = {
  id: 'hetzner',
  supportsAutomatedKeyCreation: false,

  getRegions(): StorageRegion[] {
    return HETZNER_STORAGE_REGIONS
  },

  getEndpoint(region: string): string {
    return `${region}.your-objectstorage.com`
  },

  async validateCredentials(
    credentials: StorageCredentials,
    region: string,
    bucketName?: string,
    allowedOrigin?: string
  ): Promise<boolean> {
    const res = await fetch(`${CF_PROXY}/s3/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        endpoint: `https://${region}.your-objectstorage.com`,
        region,
        bucketName,
        allowedOrigin,
      }),
    })
    const data = await res.json()
    return data.valid ?? false
  },

  async createBucket(
    credentials: StorageCredentials,
    region: string,
    bucketName: string
  ): Promise<void> {
    const res = await fetch(`${CF_PROXY}/s3/create-bucket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        endpoint: `https://${region}.your-objectstorage.com`,
        region,
        bucketName,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create bucket')
    }
  },

  async setCors(
    credentials: StorageCredentials,
    region: string,
    bucketName: string,
    allowedOrigin: string
  ): Promise<void> {
    const res = await fetch(`${CF_PROXY}/s3/set-cors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        endpoint: `https://${region}.your-objectstorage.com`,
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
}
