import type { ProviderId } from '../api/providers/types'

export interface WizardState {
  currentStep: number
  provider: ProviderId
  compute: {
    apiKey: string
    validated: boolean
    regions: Region[]
    sizes: Size[]
    selectedRegion: string
    selectedSize: string
  }
  digitalOcean: {
    apiKey: string
    validated: boolean
    regions: Region[]
    sizes: Size[]
    selectedRegion: string
    selectedSize: string
  }
  cloudflare: {
    apiToken: string
    validated: boolean
    zones: Zone[]
    selectedZone: string
    subdomain: string
  }
  spaces: {
    enabled: boolean
    spaces: Space[]
    selectedSpace: string | null // null = create new
    selectedRegion: string | null // region of selected/created space
    newSpaceName: string
    credentials: SpacesCredentials | null
    // Temp full-access key for CORS setup (DO only) - deleted after provisioning
    tempKeyId: string | null
    tempKeyCredentials: SpacesCredentials | null
  }
  foundry: {
    downloadUrl: string
    licenseKey: string
    majorVersion: number // 11, 12, 13, etc. - determines startup script path
    // Stored for fresh URL fetch at deploy time (credentials mode only)
    credentials?: {
      username: string
      password: string
      version: string // e.g., "351"
    }
  }
  server: {
    name: string
    sshKeyPair: SSHKeyPair | null
  }
  maintenance: {
    updateHour: number // 0-23, hour in UTC for automatic updates
  }
  provisioning: {
    status: ProvisioningStatus
    dropletId: string | null
    dropletIp: string | null
    logs: string[]
  }
}

export interface Region {
  slug: string
  name: string
  available: boolean
}

export type DropletCategory = 'regular' | 'premium-intel' | 'premium-amd'

export interface Size {
  slug: string
  description: string
  priceMonthly: number
  pricesByRegion?: Record<string, number> // For providers with region-specific pricing
  unavailableInRegions?: string[] // Regions where this size is unavailable
  currency?: 'USD' | 'EUR'
  memory: number
  vcpus: number
  disk: number
  category: DropletCategory
  categoryLabel: string
  diskType: 'SSD' | 'NVMe SSD'
  tierHint?: 'budget' | 'standard' | 'performance'
}

export interface Zone {
  id: string
  name: string
}

export interface Space {
  name: string
  region: string
}

export interface SpacesCredentials {
  accessKeyId: string
  secretAccessKey: string
}

export interface SSHKeyPair {
  publicKey: string
  privateKey: string
  fingerprint: string
}

export type ProvisioningStatus =
  | 'idle'
  | 'creating-droplet'
  | 'waiting-for-ip'
  | 'configuring-dns'
  | 'waiting-for-server'
  | 'installing-foundry'
  | 'complete'
  | 'error'

export interface DropletCreateResponse {
  droplet: {
    id: number
    name: string
    status: string
    networks: {
      v4: Array<{ ip_address: string; type: string }>
    }
  }
}
