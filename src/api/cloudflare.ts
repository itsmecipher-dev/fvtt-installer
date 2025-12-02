import type { Zone } from '../types'

// Use worker proxy to avoid CORS issues
const CF_PROXY = import.meta.env.VITE_CF_PROXY_URL || 'https://cors-proxy.artificery.io'

export async function validateApiToken(token: string): Promise<boolean> {
  const res = await fetch(`${CF_PROXY}/client/v4/user/tokens/verify`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return false
  const data = await res.json()
  return data.success === true
}

export async function getZones(token: string): Promise<Zone[]> {
  const res = await fetch(`${CF_PROXY}/client/v4/zones?status=active`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch zones')
  const data = await res.json()
  return data.result.map((z: { id: string; name: string }) => ({
    id: z.id,
    name: z.name,
  }))
}

export interface DnsRecord {
  id: string
  type: string
  name: string
  content: string
  proxied: boolean
}

export async function checkExistingDnsRecord(
  token: string,
  zoneId: string,
  name: string
): Promise<DnsRecord | null> {
  const res = await fetch(
    `${CF_PROXY}/client/v4/zones/${zoneId}/dns_records?name=${encodeURIComponent(name)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return null
  const data = await res.json()
  if (data.result?.length > 0) {
    const record = data.result[0]
    return {
      id: record.id,
      type: record.type,
      name: record.name,
      content: record.content,
      proxied: record.proxied,
    }
  }
  return null
}

export async function createDnsRecord(
  token: string,
  zoneId: string,
  name: string,
  ip: string
): Promise<{ id: string; name: string }> {
  // Check for ALL existing A records with this name
  const existingRes = await fetch(
    `${CF_PROXY}/client/v4/zones/${zoneId}/dns_records?type=A&name=${encodeURIComponent(name)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (existingRes.ok) {
    const existing = await existingRes.json()
    const records = existing.result || []

    if (records.length > 0) {
      // Update the first record
      const primaryRecord = records[0]
      const updateRes = await fetch(
        `${CF_PROXY}/client/v4/zones/${zoneId}/dns_records/${primaryRecord.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'A',
            name,
            content: ip,
            proxied: true,
            ttl: 300,
          }),
        }
      )
      if (!updateRes.ok) throw new Error('Failed to update DNS record')

      // Delete any duplicate records
      for (let i = 1; i < records.length; i++) {
        await fetch(
          `${CF_PROXY}/client/v4/zones/${zoneId}/dns_records/${records[i].id}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }
        )
      }

      const updated = await updateRes.json()
      return { id: updated.result.id, name: updated.result.name }
    }
  }

  // No existing record, create new one
  const res = await fetch(`${CF_PROXY}/client/v4/zones/${zoneId}/dns_records`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'A',
      name,
      content: ip,
      proxied: true,
      ttl: 300,
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.errors?.[0]?.message || 'Failed to create DNS record')
  }
  const data = await res.json()
  return { id: data.result.id, name: data.result.name }
}
