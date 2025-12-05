import { useState, useEffect } from 'react'
import { ExternalLink, Wifi, Signal, SignalLow, SignalMedium, SignalZero, Loader2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Alert } from '../ui/Alert'
import { Collapsible } from '../ui/Collapsible'
import { SizeSelector } from '../ui/SizeSelector'
import { hetznerCompute } from '../../api/providers/hetzner/compute'
import type { WizardState, Region, Size } from '../../types'
import type { ProviderRegion, ProviderSize } from '../../api/providers/types'

interface Props {
  state: WizardState
  setCompute: (updates: Partial<WizardState['compute']>) => void
  onNext: () => void
  onBack: () => void
}

interface RegionWithLatency extends Region {
  latency: number | null
  testing: boolean
}

const hetznerSvg = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0v24h24V0zm18.08 18.45h-2.15v-5.93h-2.74l-.01 2.06c-.01 2.12-.08 3.08-.38 3.64-.42.76-1.2 1.06-2.14 1.06-.42 0-.94-.08-1.33-.22l.19-1.74c.22.08.44.12.68.12.51 0 .82-.3.95-.87.08-.38.1-.87.1-2.49l.02-3.3h6.81zm-9.87 0H5.92V5.55h2.29v5.26h3.56V5.55h2.29v12.9h-2.29v-5.61H8.21z"/></svg>`

function mapToRegion(pr: ProviderRegion): Region {
  return { slug: pr.slug, name: pr.name, available: pr.available }
}

function mapToSize(ps: ProviderSize): Size {
  return {
    slug: ps.slug,
    description: ps.description,
    priceMonthly: ps.priceMonthly,
    pricesByRegion: ps.pricesByRegion,
    unavailableInRegions: ps.unavailableInRegions,
    currency: ps.currency,
    memory: ps.memory,
    vcpus: ps.vcpus,
    disk: ps.disk,
    category: ps.category as 'regular' | 'premium-intel' | 'premium-amd',
    categoryLabel: ps.categoryLabel,
    diskType: ps.diskType as 'SSD' | 'NVMe SSD',
    tierHint: ps.tierHint,
  }
}

// Hetzner speed test endpoints for latency measurement
const SPEED_TEST_ENDPOINTS: Record<string, string> = {
  'fsn1': 'https://fsn1-speed.hetzner.com/',
  'nbg1': 'https://nbg1-speed.hetzner.com/',
  'hel1': 'https://hel1-speed.hetzner.com/',
  'ash': 'https://ash-speed.hetzner.com/',
  'hil': 'https://hil-speed.hetzner.com/',
  'sin': 'https://sin-speed.hetzner.com/',
}

async function measureLatency(regionSlug: string): Promise<number | null> {
  const endpoint = SPEED_TEST_ENDPOINTS[regionSlug]
  if (!endpoint) return null

  try {
    const url = `${endpoint}?t=${Date.now()}`
    const start = performance.now()
    await fetch(url, { mode: 'no-cors' })
    return Math.round(performance.now() - start)
  } catch {
    return null
  }
}

function getLatencyRating(latency: number | null): string {
  if (latency === null) return 'unknown'
  if (latency < 50) return 'excellent'
  if (latency < 100) return 'good'
  if (latency < 200) return 'fair'
  return 'poor'
}

export function HetznerStep({ state, setCompute, onNext, onBack }: Props) {
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [regionsWithLatency, setRegionsWithLatency] = useState<RegionWithLatency[]>([])

  // Initialize regions and start latency tests
  useEffect(() => {
    if (state.compute.validated && state.compute.regions.length > 0 && regionsWithLatency.length === 0) {
      const initial = state.compute.regions.map((r) => ({
        ...r,
        latency: null,
        testing: true,
      }))
      setRegionsWithLatency(initial)

      // Test latency for each region
      initial.forEach(async (region) => {
        const latency = await measureLatency(region.slug)
        setRegionsWithLatency((prev) =>
          prev.map((r) =>
            r.slug === region.slug ? { ...r, latency, testing: false } : r
          )
        )
      })
    }
  }, [state.compute.validated, state.compute.regions, regionsWithLatency.length])

  const handleValidate = async () => {
    if (!state.compute.apiKey) {
      setError('Please enter your API token')
      return
    }

    setValidating(true)
    setError(null)

    try {
      const valid = await hetznerCompute.validateApiKey(state.compute.apiKey)
      if (!valid) {
        setError('Invalid API token. Please check and try again.')
        return
      }

      const [regions, sizes] = await Promise.all([
        hetznerCompute.getRegions(state.compute.apiKey),
        hetznerCompute.getSizes(state.compute.apiKey),
      ])

      setCompute({
        validated: true,
        regions: regions.map(mapToRegion),
        sizes: sizes.map(mapToSize),
        selectedRegion: '',
        // Default to CPX22 (recommended tier) - 4GB RAM, good balance
        selectedSize: sizes.find(s => s.slug === 'cpx22')?.slug || sizes.find(s => s.tierHint === 'standard')?.slug || sizes[0]?.slug || '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate API token')
    } finally {
      setValidating(false)
    }
  }

  const canProceed =
    state.compute.validated &&
    state.compute.selectedRegion &&
    state.compute.selectedSize

  const sortedRegions = [...regionsWithLatency].sort((a, b) => {
    if (a.latency === null && b.latency === null) return 0
    if (a.latency === null) return 1
    if (b.latency === null) return -1
    return a.latency - b.latency
  })

  const getLatencyIcon = (latency: number | null, testing: boolean) => {
    if (testing) return <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
    const rating = getLatencyRating(latency)
    switch (rating) {
      case 'excellent':
        return <Signal className="w-4 h-4 text-green-400" />
      case 'good':
        return <SignalMedium className="w-4 h-4 text-green-400" />
      case 'fair':
        return <SignalLow className="w-4 h-4 text-amber-400" />
      case 'poor':
        return <SignalZero className="w-4 h-4 text-red-400" />
      default:
        return <Wifi className="w-4 h-4 text-slate-500" />
    }
  }

  const getLatencyColor = (latency: number | null) => {
    const rating = getLatencyRating(latency)
    switch (rating) {
      case 'excellent':
      case 'good':
        return 'text-green-400'
      case 'fair':
        return 'text-amber-400'
      case 'poor':
        return 'text-red-400'
      default:
        return 'text-slate-500'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div
          className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          dangerouslySetInnerHTML={{
            __html: hetznerSvg.replace('<svg', `<svg fill="#D50C2D" class="w-8 h-8"`)
          }}
        />
        <div>
          <h2 className="text-xl font-semibold text-white">Hetzner Cloud</h2>
          <p className="text-sm text-slate-400">Connect your hosting account</p>
        </div>
      </div>

      {!state.compute.validated ? (
        <>
          <Input
            label="Hetzner API Token"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={state.compute.apiKey}
            onChange={(e) => setCompute({ apiKey: e.target.value })}
            secret
            error={error || undefined}
            hint="Your API token is stored locally and never sent to our servers"
          />

          <Collapsible title="How do I get an API token?">
            <ol className="space-y-3 text-sm text-slate-300">
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>
                  Go to{' '}
                  <a
                    href="https://console.hetzner.cloud/projects"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-400 hover:underline inline-flex items-center gap-1"
                  >
                    Hetzner Cloud Console
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>Select or create a project for your Foundry server</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>Go to <strong>Security</strong> → <strong>API Tokens</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold">
                  4
                </span>
                <span>Click "Generate API Token", name it "Foundry Installer", and select <strong>"Read & Write"</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold">
                  5
                </span>
                <span><strong>Copy the token immediately</strong> and paste it above. The token is only shown once.</span>
              </li>
            </ol>
          </Collapsible>

          <Alert type="warning" title="Security tip">
            This API token has full access to your Hetzner project. After your server is created,
            you should <strong>delete or disable this token</strong> from your{' '}
            <a
              href="https://console.hetzner.cloud/projects"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-400 hover:underline"
            >
              Hetzner console
            </a>
            . You won't need it again.
          </Alert>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={onBack}>
              Back
            </Button>
            <Button onClick={handleValidate} loading={validating}>
              Validate & Continue
            </Button>
          </div>
        </>
      ) : (
        <>
          <Alert type="success" title="API Token Validated">
            Connected to your Hetzner Cloud project successfully.
          </Alert>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Server Location
            </label>
            <p className="text-sm text-slate-500 mb-3">
              Choose a location close to your players for best performance.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(sortedRegions.length > 0 ? sortedRegions : state.compute.regions.map(r => ({ ...r, latency: null, testing: false }))).map((region) => (
                <button
                  key={region.slug}
                  type="button"
                  onClick={() => {
                    // Check if current size is unavailable in new region
                    const currentSize = state.compute.sizes.find(s => s.slug === state.compute.selectedSize)
                    const isUnavailable = currentSize?.unavailableInRegions?.includes(region.slug)
                    setCompute({
                      selectedRegion: region.slug,
                      // Clear size if it's unavailable in new region
                      ...(isUnavailable ? { selectedSize: '' } : {}),
                    })
                  }}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                    state.compute.selectedRegion === region.slug
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-slate-600 bg-slate-900/50 hover:border-slate-500'
                  }`}
                >
                  <span className="text-white">{region.name}</span>
                  <div className="flex items-center gap-2">
                    {getLatencyIcon(region.latency, region.testing)}
                    <span className={`text-sm font-mono ${getLatencyColor(region.latency)}`}>
                      {region.testing ? '...' : region.latency !== null ? `${region.latency}ms` : '—'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <SizeSelector
            sizes={state.compute.sizes}
            value={state.compute.selectedSize}
            onChange={(value) => setCompute({ selectedSize: value })}
            selectedRegion={state.compute.selectedRegion}
          />

          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={() => {
                setCompute({ validated: false, apiKey: '', sizes: [], regions: [] })
                setRegionsWithLatency([])
              }}
            >
              Use Different Account
            </Button>
            <Button onClick={onNext} disabled={!canProceed}>
              Continue
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
