import type { CloudProvider, StorageProvider, ProviderMetadata, ProviderId } from './types'
import { digitalOceanCompute, digitalOceanStorage, digitalOceanMetadata } from './digitalocean'
import { hetznerCompute, hetznerStorage, hetznerMetadata } from './hetzner'

export type { CloudProvider, StorageProvider, ProviderMetadata, ProviderId } from './types'
export type { ProviderRegion, ProviderSize, ProviderServer, StorageCredentials, StorageRegion } from './types'

const cloudProviders: Record<ProviderId, CloudProvider> = {
  digitalocean: digitalOceanCompute,
  hetzner: hetznerCompute,
}

const storageProviders: Record<ProviderId, StorageProvider> = {
  digitalocean: digitalOceanStorage,
  hetzner: hetznerStorage,
}

const providerMetadata: Record<ProviderId, ProviderMetadata> = {
  digitalocean: digitalOceanMetadata,
  hetzner: hetznerMetadata,
}

export function getCloudProvider(provider: ProviderId): CloudProvider {
  const p = cloudProviders[provider]
  if (!p) throw new Error(`Unknown cloud provider: ${provider}`)
  return p
}

export function getStorageProvider(provider: ProviderId): StorageProvider {
  const p = storageProviders[provider]
  if (!p) throw new Error(`Unknown storage provider: ${provider}`)
  return p
}

export function getProviderMetadata(provider: ProviderId): ProviderMetadata {
  const m = providerMetadata[provider]
  if (!m) throw new Error(`Unknown provider: ${provider}`)
  return m
}

export function getAllProviders(): ProviderMetadata[] {
  return Object.values(providerMetadata)
}

export function getAvailableProviderIds(): ProviderId[] {
  return Object.keys(providerMetadata) as ProviderId[]
}
