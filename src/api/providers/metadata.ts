import type { ProviderId } from './types'

export interface ProviderDisplayInfo {
  id: ProviderId
  name: string
  displayName: string
  tagline: string
  description: string
  logo: string
  color: string
  website: string
  apiDocsUrl: string
  storageDocsUrl: string
}

export const providerDisplayInfo: Record<ProviderId, ProviderDisplayInfo> = {
  digitalocean: {
    id: 'digitalocean',
    name: 'digitalocean',
    displayName: 'DigitalOcean',
    tagline: 'Simple, scalable cloud',
    description: 'US-based cloud provider with simple pricing and integrated object storage (Spaces). Great for beginners with excellent documentation.',
    logo: '/logos/digitalocean.svg',
    color: '#0080FF',
    website: 'https://www.digitalocean.com',
    apiDocsUrl: 'https://docs.digitalocean.com/reference/api/',
    storageDocsUrl: 'https://docs.digitalocean.com/products/spaces/',
  },
  hetzner: {
    id: 'hetzner',
    name: 'hetzner',
    displayName: 'Hetzner Cloud',
    tagline: 'German quality, fair prices',
    description: 'European cloud provider with competitive pricing and strong privacy standards. Based in Germany with GDPR-compliant infrastructure.',
    logo: '/logos/hetzner.svg',
    color: '#D50C2D',
    website: 'https://www.hetzner.com/cloud',
    apiDocsUrl: 'https://docs.hetzner.cloud/',
    storageDocsUrl: 'https://docs.hetzner.com/storage/object-storage/',
  },
}

export interface PricingTier {
  name: string
  slug: string
  ram: number
  vcpu: number
  storage: number
  priceMonthly: number
  recommended?: boolean
}

export const providerPricingTiers: Record<ProviderId, PricingTier[]> = {
  digitalocean: [
    { name: 'Basic', slug: 's-1vcpu-1gb', ram: 1, vcpu: 1, storage: 25, priceMonthly: 6 },
    { name: 'Standard', slug: 's-1vcpu-2gb', ram: 2, vcpu: 1, storage: 50, priceMonthly: 12, recommended: true },
    { name: 'Performance', slug: 's-2vcpu-4gb', ram: 4, vcpu: 2, storage: 80, priceMonthly: 24 },
  ],
  hetzner: [
    { name: 'Budget (CX23)', slug: 'cx23', ram: 4, vcpu: 2, storage: 40, priceMonthly: 3.56 },
    { name: 'Standard (CPX22)', slug: 'cpx22', ram: 4, vcpu: 2, storage: 80, priceMonthly: 7.13, recommended: true },
    { name: 'Performance (CCX13)', slug: 'ccx13', ram: 8, vcpu: 2, storage: 80, priceMonthly: 15.46 },
  ],
}

export interface ProviderFeature {
  name: string
  supported: boolean
  note?: string
}

export const providerFeatures: Record<ProviderId, ProviderFeature[]> = {
  digitalocean: [
    { name: 'One-click server creation', supported: true },
    { name: 'Automated S3 key creation', supported: true },
    { name: 'Built-in monitoring', supported: true },
    { name: 'Global regions', supported: true, note: '11 regions worldwide' },
    { name: 'Floating IPs', supported: true },
  ],
  hetzner: [
    { name: 'One-click server creation', supported: true },
    { name: 'Automated S3 key creation', supported: false, note: 'Manual key entry required' },
    { name: 'Built-in monitoring', supported: false },
    { name: 'Global regions', supported: true, note: '3 EU, 2 US, 1 Asia' },
    { name: 'Floating IPs', supported: true },
  ],
}
