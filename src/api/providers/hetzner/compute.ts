import type { CloudProvider, ProviderRegion, ProviderSize, ProviderServer, SSHKeyResult } from '../types'

const HETZNER_API = 'https://api.hetzner.cloud/v1'

interface HetznerLocation {
  id: number
  name: string
  description: string
  country: string
  city: string
}

interface HetznerServerType {
  id: number
  name: string
  description: string
  cores: number
  memory: number
  disk: number
  prices: Array<{
    location: string
    price_monthly: { net: string; gross: string }
  }>
  storage_type: string
  cpu_type: string
  architecture: string
  deprecated: boolean
  deprecation?: {
    unavailable_after: string
    announced: string
  }
  locations?: Array<{
    id: number
    name: string
    deprecation?: {
      unavailable_after: string
      announced: string
    }
  }>
}

interface HetznerServer {
  id: number
  name: string
  status: string
  public_net: {
    ipv4?: { ip: string }
    ipv6?: { ip: string }
  }
}

function getServerCategory(serverType: HetznerServerType): { type: string; label: string; tierHint: string } {
  const name = serverType.name

  // CCX*3 = dedicated vCPU, current gen (Overkill tier)
  if (/^ccx\d3$/.test(name)) {
    return { type: 'dedicated', label: 'Dedicated vCPU', tierHint: 'performance' }
  }
  // CPX*2 = shared AMD, current gen (Recommended tier)
  if (/^cpx\d2$/.test(name)) {
    return { type: 'shared-amd', label: 'Shared AMD', tierHint: 'standard' }
  }
  // CX*3 = shared Intel, current gen (Budget tier)
  if (/^cx\d3$/.test(name)) {
    return { type: 'shared', label: 'Shared Intel', tierHint: 'budget' }
  }
  // CAX = ARM (exclude)
  if (name.startsWith('cax')) {
    return { type: 'shared-arm', label: 'Shared ARM', tierHint: 'exclude' }
  }
  // Old generation (cpx*1, etc.) - exclude
  if (/^(cpx|cx|ccx)\d1$/.test(name)) {
    return { type: 'old-gen', label: 'Old Generation', tierHint: 'exclude' }
  }
  return { type: 'unknown', label: 'Unknown', tierHint: 'exclude' }
}

export const hetznerCompute: CloudProvider = {
  id: 'hetzner',

  async validateApiKey(apiKey: string): Promise<boolean> {
    const res = await fetch(`${HETZNER_API}/servers?per_page=1`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.ok
  },

  async getRegions(apiKey: string): Promise<ProviderRegion[]> {
    const res = await fetch(`${HETZNER_API}/locations`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) throw new Error('Failed to fetch locations')
    const data = await res.json()
    return data.locations.map((loc: HetznerLocation) => ({
      slug: loc.name,
      name: `${loc.city}, ${loc.country} (${loc.name})`,
      available: true,
      country: loc.country,
    }))
  },

  async getSizes(apiKey: string): Promise<ProviderSize[]> {
    const res = await fetch(`${HETZNER_API}/server_types?per_page=50`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) throw new Error('Failed to fetch server types')
    const data = await res.json()

    // Fetch account currency from /pricing endpoint
    let accountCurrency: 'USD' | 'EUR' = 'EUR' // Default fallback
    try {
      const pricingRes = await fetch(`${HETZNER_API}/pricing`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (pricingRes.ok) {
        const pricingData = await pricingRes.json()
        accountCurrency = pricingData.pricing?.currency === 'USD' ? 'USD' : 'EUR'
      }
    } catch {
      // Use default EUR
    }

    // Debug: Log ALL server types (before filtering)
    const allRegions = ['fsn1', 'nbg1', 'hel1', 'ash', 'hil', 'sin']
    console.log('=== Hetzner Server Types (RAW - before filtering) ===')
    console.log('Currency:', accountCurrency)
    data.server_types
      .filter((st: HetznerServerType) => !st.deprecated)
      .forEach((st: HetznerServerType) => {
        const price = st.prices[0]?.price_monthly
        const availableLocs = st.locations?.map(loc => loc.name) || []
        const locInfo = allRegions.map(r => `${r}:${availableLocs.includes(r) ? '✓' : '❌'}`).join(' ')
        console.log(`${st.name}: ${st.memory}GB RAM, ${st.cores} vCPU - ${price?.gross}/mo | ${locInfo}`)
      })
    console.log('=====================================================')

    return data.server_types
      .filter((st: HetznerServerType) => !st.deprecated && st.architecture === 'x86')
      .filter((st: HetznerServerType) => {
        const category = getServerCategory(st)
        // Exclude ARM, old gen, unknown
        if (category.tierHint === 'exclude') return false
        // CX*3 (budget): 4-8GB (cx23, cx33)
        if (category.tierHint === 'budget') return st.memory >= 4 && st.memory <= 8
        // CPX*2 (standard): 2-8GB (cpx12, cpx22, cpx32)
        if (category.tierHint === 'standard') return st.memory >= 2 && st.memory <= 8
        // CCX*3 (performance): 8-16GB (ccx13, ccx23)
        if (category.tierHint === 'performance') return st.memory >= 8 && st.memory <= 16
        return false
      })
      .map((st: HetznerServerType) => {
        const category = getServerCategory(st)
        // Build prices by region
        const pricesByRegion: Record<string, number> = {}
        for (const price of st.prices) {
          pricesByRegion[price.location] = Math.round(parseFloat(price.price_monthly?.gross || '0') * 100) / 100
        }
        // Determine which regions this server type is available in
        // The locations array shows WHERE it's available (not deprecation)
        const availableLocations = st.locations?.map(loc => loc.name) || []
        // All possible Hetzner regions
        const allRegions = ['fsn1', 'nbg1', 'hel1', 'ash', 'hil', 'sin']
        // Unavailable = regions NOT in the locations array
        const unavailableInRegions = allRegions.filter(r => !availableLocations.includes(r))
        // Default to first price for priceMonthly
        const defaultPrice = parseFloat(st.prices[0]?.price_monthly?.gross || '0')
        return {
          slug: st.name,
          description: `${st.memory}GB RAM, ${st.cores} vCPU, ${st.disk}GB ${st.storage_type === 'local' ? 'NVMe SSD' : 'SSD'}`,
          priceMonthly: Math.round(defaultPrice * 100) / 100,
          pricesByRegion,
          unavailableInRegions,
          currency: accountCurrency,
          memory: st.memory * 1024,
          vcpus: st.cores,
          disk: st.disk,
          category: category.type,
          categoryLabel: category.label,
          diskType: st.storage_type === 'local' ? 'NVMe SSD' : 'SSD',
          tierHint: category.tierHint as 'budget' | 'standard' | 'performance',
        }
      })
  },

  async addSshKey(apiKey: string, name: string, publicKey: string): Promise<SSHKeyResult> {
    const res = await fetch(`${HETZNER_API}/ssh_keys`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, public_key: publicKey }),
    })
    if (!res.ok) {
      const err = await res.json()
      if (err.error?.code === 'uniqueness_error') {
        const listRes = await fetch(`${HETZNER_API}/ssh_keys`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        const listData = await listRes.json()
        const existing = listData.ssh_keys?.find(
          (k: { public_key: string }) => k.public_key.trim() === publicKey.trim()
        )
        if (existing) return { id: existing.id, fingerprint: existing.fingerprint }
      }
      throw new Error(err.error?.message || 'Failed to add SSH key')
    }
    const data = await res.json()
    return { id: data.ssh_key.id, fingerprint: data.ssh_key.fingerprint }
  },

  async createServer(
    apiKey: string,
    name: string,
    region: string,
    size: string,
    sshKeyId: string | number,
    userData: string
  ): Promise<ProviderServer> {
    const res = await fetch(`${HETZNER_API}/servers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        location: region,
        server_type: size,
        image: 'ubuntu-24.04',
        ssh_keys: [sshKeyId],
        user_data: userData,
        start_after_create: true,
        labels: { app: 'foundry-vtt' },
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message || 'Failed to create server')
    }
    const data = await res.json()
    const server: HetznerServer = data.server
    return {
      id: server.id,
      name: server.name,
      status: server.status,
      ip: server.public_net?.ipv4?.ip || null,
    }
  },

  async getServer(apiKey: string, serverId: string | number): Promise<ProviderServer> {
    const res = await fetch(`${HETZNER_API}/servers/${serverId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) throw new Error('Failed to fetch server')
    const data = await res.json()
    const server: HetznerServer = data.server
    return {
      id: server.id,
      name: server.name,
      status: server.status,
      ip: server.public_net?.ipv4?.ip || null,
    }
  },

  async waitForServerIp(apiKey: string, serverId: string | number, maxAttempts = 30): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const server = await this.getServer(apiKey, serverId)
      if (server.ip) return server.ip
      await new Promise((r) => setTimeout(r, 5000))
    }
    throw new Error('Timeout waiting for server IP')
  },

  async checkExistingServer(apiKey: string, name: string): Promise<ProviderServer | null> {
    const res = await fetch(`${HETZNER_API}/servers?label_selector=app=foundry-vtt`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    const existing = data.servers?.find(
      (s: HetznerServer) => s.name.toLowerCase() === name.toLowerCase()
    )
    if (!existing) return null
    return {
      id: existing.id,
      name: existing.name,
      status: existing.status,
      ip: existing.public_net?.ipv4?.ip || null,
    }
  },
}
