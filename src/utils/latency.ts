export interface RegionLatency {
  slug: string
  latency: number | null
  status: 'pending' | 'testing' | 'done' | 'error'
}

const REGION_ENDPOINTS: Record<string, string> = {
  nyc1: 'nyc3.digitaloceanspaces.com',
  nyc3: 'nyc3.digitaloceanspaces.com',
  sfo2: 'sfo2.digitaloceanspaces.com',
  sfo3: 'sfo3.digitaloceanspaces.com',
  ams3: 'ams3.digitaloceanspaces.com',
  lon1: 'lon1.digitaloceanspaces.com',
  fra1: 'fra1.digitaloceanspaces.com',
  sgp1: 'sgp1.digitaloceanspaces.com',
  blr1: 'blr1.digitaloceanspaces.com',
  tor1: 'tor1.digitaloceanspaces.com',
  syd1: 'syd1.digitaloceanspaces.com',
}

export async function measureLatency(regionSlug: string): Promise<number | null> {
  const endpoint = REGION_ENDPOINTS[regionSlug]
  if (!endpoint) return null

  const url = `https://${endpoint}/?cache-bust=${Date.now()}-${Math.random()}`

  try {
    const start = performance.now()

    await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
    })

    const end = performance.now()
    return Math.round(end - start)
  } catch {
    return null
  }
}

export async function measureAllLatencies(
  regionSlugs: string[],
  onUpdate: (slug: string, latency: number | null) => void
): Promise<Map<string, number | null>> {
  const results = new Map<string, number | null>()

  const promises = regionSlugs
    .filter((slug) => REGION_ENDPOINTS[slug])
    .map(async (slug) => {
      const latencies: number[] = []

      for (let i = 0; i < 3; i++) {
        const latency = await measureLatency(slug)
        if (latency !== null) {
          latencies.push(latency)
        }
        await new Promise((r) => setTimeout(r, 100))
      }

      const avgLatency = latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : null

      results.set(slug, avgLatency)
      onUpdate(slug, avgLatency)
    })

  await Promise.all(promises)
  return results
}

export function getLatencyRating(latency: number | null): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' {
  if (latency === null) return 'unknown'
  if (latency < 50) return 'excellent'
  if (latency < 100) return 'good'
  if (latency < 200) return 'fair'
  return 'poor'
}
