import type { CloudProvider, ProviderRegion, ProviderSize, ProviderServer, SSHKeyResult } from '../types'

const DO_API = 'https://api.digitalocean.com/v2'

const TESTABLE_REGIONS = new Set([
  'nyc1', 'nyc3', 'sfo2', 'sfo3', 'ams3', 'lon1', 'fra1', 'sgp1', 'blr1', 'tor1', 'syd1'
])

interface DropletCategory {
  type: string
  label: string
  diskType: string
}

function getDropletCategory(slug: string): DropletCategory {
  if (slug.startsWith('g-') && slug.includes('-intel')) {
    return { type: 'premium-intel', label: 'Premium Intel', diskType: 'NVMe SSD' }
  }
  if (slug.startsWith('gd-')) {
    return { type: 'premium-amd', label: 'Premium AMD', diskType: 'NVMe SSD' }
  }
  if (slug.startsWith('c-') || slug.startsWith('c2-')) {
    return { type: 'premium-intel', label: 'Premium Intel', diskType: 'NVMe SSD' }
  }
  if (slug.startsWith('m-') || slug.startsWith('m3-')) {
    return { type: 'premium-intel', label: 'Premium Intel', diskType: 'NVMe SSD' }
  }
  if (slug.includes('-intel')) {
    return { type: 'regular', label: 'Intel', diskType: 'NVMe SSD' }
  }
  if (slug.includes('-amd')) {
    return { type: 'regular', label: 'AMD', diskType: 'NVMe SSD' }
  }
  return { type: 'regular', label: 'Regular', diskType: 'SSD' }
}

export const digitalOceanCompute: CloudProvider = {
  id: 'digitalocean',

  async validateApiKey(apiKey: string): Promise<boolean> {
    const res = await fetch(`${DO_API}/account`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.ok
  },

  async getRegions(apiKey: string): Promise<ProviderRegion[]> {
    const res = await fetch(`${DO_API}/regions`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) throw new Error('Failed to fetch regions')
    const data = await res.json()
    return data.regions
      .filter((r: ProviderRegion) => r.available && TESTABLE_REGIONS.has(r.slug))
      .map((r: { slug: string; name: string }) => ({
        slug: r.slug,
        name: r.name,
        available: true,
      }))
  },

  async getSizes(apiKey: string): Promise<ProviderSize[]> {
    const res = await fetch(`${DO_API}/sizes`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) throw new Error('Failed to fetch sizes')
    const data = await res.json()
    return data.sizes
      .filter((s: ProviderSize & { available: boolean }) => s.available)
      .filter((s: ProviderSize) => s.memory >= 1024 && s.memory <= 4096)
      .map((s: { slug: string; memory: number; vcpus: number; disk: number; price_monthly: number }) => {
        const category = getDropletCategory(s.slug)
        return {
          slug: s.slug,
          description: `${s.memory / 1024}GB RAM, ${s.vcpus} vCPU, ${s.disk}GB ${category.diskType}`,
          priceMonthly: s.price_monthly,
          memory: s.memory,
          vcpus: s.vcpus,
          disk: s.disk,
          category: category.type,
          categoryLabel: category.label,
          diskType: category.diskType,
        }
      })
  },

  async addSshKey(apiKey: string, name: string, publicKey: string): Promise<SSHKeyResult> {
    const res = await fetch(`${DO_API}/account/keys`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, public_key: publicKey }),
    })
    if (!res.ok) {
      const err = await res.json()
      if (err.id === 'already_exists' || err.message?.includes('already exists')) {
        const keys = await fetch(`${DO_API}/account/keys`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        }).then((r) => r.json())
        const existing = keys.ssh_keys.find(
          (k: { public_key: string }) => k.public_key.trim() === publicKey.trim()
        )
        if (existing) return { id: existing.id, fingerprint: existing.fingerprint }
      }
      throw new Error(err.message || 'Failed to add SSH key')
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
    const res = await fetch(`${DO_API}/droplets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        region,
        size,
        image: 'ubuntu-24-04-x64',
        ssh_keys: [sshKeyId],
        user_data: userData,
        monitoring: true,
        tags: ['foundry-vtt'],
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || 'Failed to create droplet')
    }
    const data = await res.json()
    const publicIp = data.droplet.networks?.v4?.find((n: { type: string }) => n.type === 'public')
    return {
      id: data.droplet.id,
      name: data.droplet.name,
      status: data.droplet.status,
      ip: publicIp?.ip_address || null,
    }
  },

  async getServer(apiKey: string, serverId: string | number): Promise<ProviderServer> {
    const res = await fetch(`${DO_API}/droplets/${serverId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) throw new Error('Failed to fetch droplet')
    const data = await res.json()
    const publicIp = data.droplet.networks?.v4?.find((n: { type: string }) => n.type === 'public')
    return {
      id: data.droplet.id,
      name: data.droplet.name,
      status: data.droplet.status,
      ip: publicIp?.ip_address || null,
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
    const res = await fetch(`${DO_API}/droplets?tag_name=foundry-vtt`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    const existing = data.droplets?.find(
      (d: { name: string }) => d.name.toLowerCase() === name.toLowerCase()
    )
    if (!existing) return null
    const publicIp = existing.networks?.v4?.find((n: { type: string }) => n.type === 'public')
    return {
      id: existing.id,
      name: existing.name,
      status: existing.status,
      ip: publicIp?.ip_address || null,
    }
  },
}
