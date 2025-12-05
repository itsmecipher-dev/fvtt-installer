export type ProviderId = 'digitalocean' | 'hetzner'

export interface ProviderRegion {
  slug: string
  name: string
  available: boolean
  country?: string
}

export interface ProviderSize {
  slug: string
  description: string
  priceMonthly: number
  pricesByRegion?: Record<string, number>
  unavailableInRegions?: string[]
  currency?: 'USD' | 'EUR'
  memory: number
  vcpus: number
  disk: number
  category: string
  categoryLabel: string
  diskType: string
  tierHint?: 'budget' | 'standard' | 'performance'
}

export interface ProviderServer {
  id: string | number
  name: string
  status: string
  ip: string | null
}

export interface SSHKeyResult {
  id: string | number
  fingerprint: string
}

export interface CloudProvider {
  id: ProviderId
  validateApiKey(apiKey: string): Promise<boolean>
  getRegions(apiKey: string): Promise<ProviderRegion[]>
  getSizes(apiKey: string): Promise<ProviderSize[]>
  addSshKey(apiKey: string, name: string, publicKey: string): Promise<SSHKeyResult>
  createServer(
    apiKey: string,
    name: string,
    region: string,
    size: string,
    sshKeyId: string | number,
    userData: string
  ): Promise<ProviderServer>
  getServer(apiKey: string, serverId: string | number): Promise<ProviderServer>
  waitForServerIp(apiKey: string, serverId: string | number, maxAttempts?: number): Promise<string>
  checkExistingServer(apiKey: string, name: string): Promise<ProviderServer | null>
}

export interface StorageRegion {
  slug: string
  name: string
  endpoint: string
}

export interface StorageCredentials {
  accessKeyId: string
  secretAccessKey: string
}

export interface StorageProvider {
  id: ProviderId
  getRegions(): StorageRegion[]
  getEndpoint(region: string): string
  validateCredentials(
    credentials: StorageCredentials,
    region: string,
    bucketName?: string,
    allowedOrigin?: string
  ): Promise<boolean>
  createBucket?(
    credentials: StorageCredentials,
    region: string,
    bucketName: string,
    allowedOrigin?: string
  ): Promise<void>
  setCors?(
    credentials: StorageCredentials,
    region: string,
    bucketName: string,
    allowedOrigin: string
  ): Promise<void>
  supportsAutomatedKeyCreation: boolean
  createAccessKey?(apiKey: string, name: string, bucket?: string, region?: string): Promise<StorageCredentials & { id: string }>
  deleteAccessKey?(apiKey: string, keyId: string): Promise<void>
}

export interface ProviderMetadata {
  id: ProviderId
  name: string
  displayName: string
  description: string
  logo: string
  website: string
  docsUrl: string
  features: {
    compute: boolean
    storage: boolean
    automatedStorageKeys: boolean
    monitoring: boolean
  }
  regions: {
    compute: string[]
    storage: string[]
  }
  pricing: {
    minMonthly: number
    currency: string
  }
}
