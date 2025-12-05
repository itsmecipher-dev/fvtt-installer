import type { ProviderMetadata } from '../types'
export { digitalOceanCompute } from './compute'
export { digitalOceanStorage } from './storage'

export const digitalOceanMetadata: ProviderMetadata = {
  id: 'digitalocean',
  name: 'digitalocean',
  displayName: 'DigitalOcean',
  description: 'Simple cloud hosting with integrated object storage',
  logo: '/logos/digitalocean.svg',
  website: 'https://www.digitalocean.com',
  docsUrl: 'https://docs.digitalocean.com',
  features: {
    compute: true,
    storage: true,
    automatedStorageKeys: true,
    monitoring: true,
  },
  regions: {
    compute: ['nyc1', 'nyc3', 'sfo2', 'sfo3', 'ams3', 'lon1', 'fra1', 'sgp1', 'blr1', 'tor1', 'syd1'],
    storage: ['nyc3', 'sfo3', 'ams3', 'sgp1', 'fra1', 'syd1'],
  },
  pricing: {
    minMonthly: 6,
    currency: 'USD',
  },
}
