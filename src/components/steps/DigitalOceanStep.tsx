import { useState, useEffect } from 'react'
import { ExternalLink, Wifi, Signal, SignalLow, SignalMedium, SignalZero, Loader2 } from 'lucide-react'
import { siDigitalocean } from 'simple-icons'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Alert } from '../ui/Alert'
import { Collapsible } from '../ui/Collapsible'
import { SizeSelector } from '../ui/SizeSelector'
import * as doApi from '../../api/digitalocean'
import { measureLatency, getLatencyRating } from '../../utils/latency'
import type { WizardState, Region } from '../../types'

interface Props {
  state: WizardState
  setDigitalOcean: (updates: Partial<WizardState['digitalOcean']>) => void
  onNext: () => void
  onBack: () => void
}

interface RegionWithLatency extends Region {
  latency: number | null
  testing: boolean
}

export function DigitalOceanStep({ state, setDigitalOcean, onNext, onBack }: Props) {
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [regionsWithLatency, setRegionsWithLatency] = useState<RegionWithLatency[]>([])
  const [testingLatency, setTestingLatency] = useState(false)

  useEffect(() => {
    if (state.digitalOcean.validated && state.digitalOcean.regions.length > 0 && regionsWithLatency.length === 0) {
      const initial = state.digitalOcean.regions.map((r) => ({
        ...r,
        latency: null,
        testing: false,
      }))
      setRegionsWithLatency(initial)
      runLatencyTests(initial)
    }
  }, [state.digitalOcean.validated, state.digitalOcean.regions])

  async function runLatencyTests(regions: RegionWithLatency[]) {
    setTestingLatency(true)

    for (const region of regions) {
      setRegionsWithLatency((prev) =>
        prev.map((r) => (r.slug === region.slug ? { ...r, testing: true } : r))
      )

      const latencies: number[] = []
      for (let i = 0; i < 3; i++) {
        const latency = await measureLatency(region.slug)
        if (latency !== null) latencies.push(latency)
        await new Promise((r) => setTimeout(r, 50))
      }

      const avgLatency = latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : null

      setRegionsWithLatency((prev) =>
        prev.map((r) =>
          r.slug === region.slug ? { ...r, latency: avgLatency, testing: false } : r
        )
      )
    }

    setTestingLatency(false)
  }

  const handleValidate = async () => {
    if (!state.digitalOcean.apiKey) {
      setError('Please enter your API key')
      return
    }

    setValidating(true)
    setError(null)

    try {
      const valid = await doApi.validateApiKey(state.digitalOcean.apiKey)
      if (!valid) {
        setError('Invalid API key. Please check and try again.')
        return
      }

      const [regions, sizesData] = await Promise.all([
        doApi.getRegions(state.digitalOcean.apiKey),
        doApi.getSizes(state.digitalOcean.apiKey),
      ])

      console.log('DO Sizes API response:', JSON.stringify(sizesData, null, 2))
      setDigitalOcean({
        validated: true,
        regions,
        sizes: sizesData,
        selectedRegion: '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate API key')
    } finally {
      setValidating(false)
    }
  }

  const canProceed =
    state.digitalOcean.validated &&
    state.digitalOcean.selectedRegion &&
    state.digitalOcean.selectedSize

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
            __html: siDigitalocean.svg.replace('<svg', `<svg fill="#0080FF" class="w-8 h-8"`)
          }}
        />
        <div>
          <h2 className="text-xl font-semibold text-white">DigitalOcean</h2>
          <p className="text-sm text-slate-400">Connect your hosting account</p>
        </div>
      </div>

      {!state.digitalOcean.validated ? (
        <>
          <Input
            label="DigitalOcean API Key"
            placeholder="dop_v1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={state.digitalOcean.apiKey}
            onChange={(e) => setDigitalOcean({ apiKey: e.target.value })}
            secret
            error={error || undefined}
            hint="Your API key is stored locally and never sent to our servers"
          />

          <Collapsible title="How do I get an API key?">
            <ol className="space-y-3 text-sm text-slate-300">
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>
                  Go to{' '}
                  <a
                    href="https://cloud.digitalocean.com/account/api/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    DigitalOcean API Tokens
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>Click "Generate New Token"</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>Name it "Foundry Installer", select <strong>"Full Access"</strong>, and set expiration to <strong>"30 days"</strong> (the minimum)</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                  4
                </span>
                <span><strong>Copy the token immediately</strong> and paste it above. The token is only shown once and cannot be retrieved later.</span>
              </li>
            </ol>
          </Collapsible>

          <Alert type="warning" title="Security tip">
            This API key has full access to your DigitalOcean account. After your server is created,
            you should <strong>delete or disable this key</strong> from your{' '}
            <a
              href="https://cloud.digitalocean.com/account/api/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              API settings
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
          <Alert type="success" title="API Key Validated">
            Connected to your DigitalOcean account successfully.
          </Alert>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Server Region
              {testingLatency && (
                <span className="ml-2 text-slate-500 font-normal">
                  (testing latency...)
                </span>
              )}
            </label>
            <p className="text-sm text-slate-500 mb-3">
              Choose a region close to your players. Lower latency = better performance.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {sortedRegions.map((region) => (
                <button
                  key={region.slug}
                  type="button"
                  onClick={() => setDigitalOcean({ selectedRegion: region.slug })}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                    state.digitalOcean.selectedRegion === region.slug
                      ? 'border-blue-500 bg-blue-500/10'
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
            sizes={state.digitalOcean.sizes}
            value={state.digitalOcean.selectedSize}
            onChange={(value) => setDigitalOcean({ selectedSize: value })}
          />

          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={() => {
                setDigitalOcean({ validated: false, apiKey: '', sizes: [], regions: [] })
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
