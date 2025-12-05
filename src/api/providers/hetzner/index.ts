import type { ProviderMetadata } from '../types'
export { hetznerCompute } from './compute'
export { hetznerStorage } from './storage'

export const hetznerMetadata: ProviderMetadata = {
  id: 'hetzner',
  name: 'hetzner',
  displayName: 'Hetzner Cloud',
  description: 'German cloud hosting with competitive pricing',
  logo: '/logos/hetzner.svg',
  website: 'https://www.hetzner.com/cloud',
  docsUrl: 'https://docs.hetzner.com/cloud',
  features: {
    compute: true,
    storage: true,
    automatedStorageKeys: false,
    monitoring: false,
  },
  regions: {
    compute: ['fsn1', 'nbg1', 'hel1', 'ash', 'hil'],
    storage: ['fsn1', 'nbg1', 'hel1'],
  },
  pricing: {
    minMonthly: 3.79,
    currency: 'EUR',
  },
}
