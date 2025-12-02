import type { Region, Size, DropletCreateResponse } from '../types'

const DO_API = 'https://api.digitalocean.com/v2'

export async function validateApiKey(apiKey: string): Promise<boolean> {
  const res = await fetch(`${DO_API}/account`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  return res.ok
}

const TESTABLE_REGIONS = new Set([
  'nyc1', 'nyc3', 'sfo2', 'sfo3', 'ams3', 'lon1', 'fra1', 'sgp1', 'blr1', 'tor1', 'syd1'
])

export async function getRegions(apiKey: string): Promise<Region[]> {
  const res = await fetch(`${DO_API}/regions`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error('Failed to fetch regions')
  const data = await res.json()
  return data.regions
    .filter((r: Region) => r.available && TESTABLE_REGIONS.has(r.slug))
    .map((r: { slug: string; name: string }) => ({
      slug: r.slug,
      name: r.name,
      available: true,
    }))
}

interface DropletCategory {
  type: 'regular' | 'premium-intel' | 'premium-amd'
  label: string
  diskType: 'SSD' | 'NVMe SSD'
}

function getDropletCategory(slug: string): DropletCategory {
  // Premium Intel: g-* (general purpose dedicated)
  if (slug.startsWith('g-') && slug.includes('-intel')) {
    return { type: 'premium-intel', label: 'Premium Intel', diskType: 'NVMe SSD' }
  }
  // Premium AMD: gd-* (general purpose dedicated AMD)
  if (slug.startsWith('gd-')) {
    return { type: 'premium-amd', label: 'Premium AMD', diskType: 'NVMe SSD' }
  }
  // CPU-optimized (premium)
  if (slug.startsWith('c-') || slug.startsWith('c2-')) {
    return { type: 'premium-intel', label: 'Premium Intel', diskType: 'NVMe SSD' }
  }
  // Memory-optimized (premium)
  if (slug.startsWith('m-') || slug.startsWith('m3-')) {
    return { type: 'premium-intel', label: 'Premium Intel', diskType: 'NVMe SSD' }
  }
  // Regular with explicit CPU type - these use NVMe SSDs
  if (slug.includes('-intel')) {
    return { type: 'regular', label: 'Intel', diskType: 'NVMe SSD' }
  }
  if (slug.includes('-amd')) {
    return { type: 'regular', label: 'AMD', diskType: 'NVMe SSD' }
  }
  // Default regular (shared CPU, regular SSD)
  return { type: 'regular', label: 'Regular', diskType: 'SSD' }
}

export async function getSizes(apiKey: string): Promise<Size[]> {
  const res = await fetch(`${DO_API}/sizes`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error('Failed to fetch sizes')
  const data = await res.json()
  return data.sizes
    .filter((s: Size & { available: boolean }) => s.available)
    .filter((s: Size) => s.memory >= 1024 && s.memory <= 4096)
    .map((s: { slug: string; memory: number; vcpus: number; disk: number; price_monthly: number; description?: string }) => {
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
}

export async function addSshKey(
  apiKey: string,
  name: string,
  publicKey: string
): Promise<{ id: number; fingerprint: string }> {
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
}

export async function createDroplet(
  apiKey: string,
  name: string,
  region: string,
  size: string,
  sshKeyId: number,
  userData: string
): Promise<DropletCreateResponse> {
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
  return res.json()
}

export async function getDroplet(
  apiKey: string,
  dropletId: number
): Promise<DropletCreateResponse['droplet']> {
  const res = await fetch(`${DO_API}/droplets/${dropletId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error('Failed to fetch droplet')
  const data = await res.json()
  return data.droplet
}

export async function checkExistingDroplet(
  apiKey: string,
  name: string
): Promise<{ id: number; name: string; ip: string | null } | null> {
  const res = await fetch(`${DO_API}/droplets?tag_name=foundry-vtt`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  const existing = data.droplets?.find(
    (d: { name: string }) => d.name.toLowerCase() === name.toLowerCase()
  )
  if (!existing) return null
  const publicIp = existing.networks?.v4?.find(
    (n: { type: string }) => n.type === 'public'
  )
  return {
    id: existing.id,
    name: existing.name,
    ip: publicIp?.ip_address || null,
  }
}

export async function waitForDropletIp(
  apiKey: string,
  dropletId: number,
  maxAttempts = 30
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const droplet = await getDroplet(apiKey, dropletId)
    const publicIp = droplet.networks.v4.find((n) => n.type === 'public')
    if (publicIp) return publicIp.ip_address
    await new Promise((r) => setTimeout(r, 5000))
  }
  throw new Error('Timeout waiting for droplet IP')
}

// Spaces regions that support Spaces
const SPACES_REGIONS = ['nyc3', 'sfo3', 'ams3', 'sgp1', 'fra1', 'syd1']

export function getSpacesRegions(): string[] {
  return SPACES_REGIONS
}

export function getSpacesEndpoint(region: string): string {
  return `${region}.digitaloceanspaces.com`
}

export interface SpacesKey {
  id: string
  accessKeyId: string
  secretAccessKey: string
}

export async function createSpacesKey(
  apiKey: string,
  name: string,
  bucket?: string,
  region?: string
): Promise<SpacesKey> {
  // If bucket specified, create key with scoped permissions (read/write only for this bucket)
  // Otherwise create key with full access (needed for bucket creation)
  const body: Record<string, unknown> = { name }

  if (bucket && region) {
    // Scoped key for specific bucket
    body.grants = [{
      bucket,
      region,
      permission: 'readwrite'
    }]
  } else {
    // Full access key (empty bucket = all buckets)
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
  console.log('Created Spaces key:', JSON.stringify(data, null, 2))
  return {
    id: data.key.access_key, // access_key is the identifier for deletion
    accessKeyId: data.key.access_key,
    secretAccessKey: data.key.secret_key,
  }
}

export async function deleteSpacesKey(apiKey: string, keyId: string): Promise<void> {
  const res = await fetch(`${DO_API}/spaces/keys/${keyId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })
  if (!res.ok && res.status !== 404) {
    const err = await res.json()
    throw new Error(err.message || 'Failed to delete Spaces access key')
  }
}
