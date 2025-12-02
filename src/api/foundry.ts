const PROXY_URL = import.meta.env.VITE_CF_PROXY_URL || 'https://cors-proxy.artificery.io'

export interface FoundryLicense {
  key: string
  name: string
  purchaseDate: string
}

export interface FoundryAuthResult {
  success: boolean
  error?: string
  licenses?: FoundryLicense[]
  username?: string
}

export interface FoundryDownloadResult {
  success: boolean
  error?: string
  url?: string
  lifetime?: number
}

export async function authenticateAndGetLicenses(
  username: string,
  password: string
): Promise<FoundryAuthResult> {
  const res = await fetch(`${PROXY_URL}/foundry/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  return res.json()
}

export async function getDownloadUrl(
  username: string,
  password: string,
  build: string,
  platform: string = 'linux'
): Promise<FoundryDownloadResult> {
  const res = await fetch(`${PROXY_URL}/foundry/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, build, platform }),
  })

  return res.json()
}

export const FOUNDRY_VERSIONS = [
  { value: '351', label: 'Release 13.351 (Recommended)', generation: 13 },
  { value: '350', label: 'Release 13.350', generation: 13 },
  { value: '348', label: 'Release 13.348', generation: 13 },
  { value: '343', label: 'Release 12.343', generation: 12 },
  { value: '331', label: 'Release 12.331', generation: 12 },
  { value: '315', label: 'Release 11.315', generation: 11 },
]
