import { useState, useEffect, useCallback } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { siCloudflare } from 'simple-icons'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Alert } from '../ui/Alert'
import { Collapsible } from '../ui/Collapsible'
import * as cfApi from '../../api/cloudflare'
import type { WizardState } from '../../types'

interface Props {
  state: WizardState
  setCloudflare: (updates: Partial<WizardState['cloudflare']>) => void
  setServer: (updates: Partial<WizardState['server']>) => void
  onNext: () => void
  onBack: () => void
}

export function CloudflareStep({ state, setCloudflare, setServer, onNext, onBack }: Props) {
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingRecord, setExistingRecord] = useState<cfApi.DnsRecord | null>(null)
  const [checkingRecord, setCheckingRecord] = useState(false)

  const handleValidate = async () => {
    if (!state.cloudflare.apiToken) {
      setError('Please enter your API token')
      return
    }

    setValidating(true)
    setError(null)

    try {
      const valid = await cfApi.validateApiToken(state.cloudflare.apiToken)
      if (!valid) {
        setError('Invalid API token. Please check and try again.')
        return
      }

      const zones = await cfApi.getZones(state.cloudflare.apiToken)
      if (zones.length === 0) {
        setError('No zones found. Make sure your token has access to at least one domain.')
        return
      }

      setCloudflare({
        validated: true,
        zones,
        selectedZone: zones[0].id,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Cloudflare')
    } finally {
      setValidating(false)
    }
  }

  const selectedZone = state.cloudflare.zones.find(
    (z) => z.id === state.cloudflare.selectedZone
  )

  const fullDomain = selectedZone && state.cloudflare.subdomain
    ? `${state.cloudflare.subdomain}.${selectedZone.name}`
    : ''

  const checkForExistingRecord = useCallback(async () => {
    if (!state.cloudflare.validated || !state.cloudflare.selectedZone || !state.cloudflare.subdomain || !fullDomain) {
      setExistingRecord(null)
      return
    }

    setCheckingRecord(true)
    try {
      const record = await cfApi.checkExistingDnsRecord(
        state.cloudflare.apiToken,
        state.cloudflare.selectedZone,
        fullDomain
      )
      setExistingRecord(record)
    } catch {
      setExistingRecord(null)
    } finally {
      setCheckingRecord(false)
    }
  }, [state.cloudflare.validated, state.cloudflare.selectedZone, state.cloudflare.subdomain, state.cloudflare.apiToken, fullDomain])

  useEffect(() => {
    const timer = setTimeout(() => {
      checkForExistingRecord()
    }, 500)
    return () => clearTimeout(timer)
  }, [checkForExistingRecord])

  const canProceed =
    state.cloudflare.validated &&
    state.cloudflare.selectedZone &&
    state.cloudflare.subdomain

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div
          className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          dangerouslySetInnerHTML={{
            __html: siCloudflare.svg.replace('<svg', `<svg fill="#F38020" class="w-8 h-8"`)
          }}
        />
        <div>
          <h2 className="text-xl font-semibold text-white">Cloudflare</h2>
          <p className="text-sm text-slate-400">Configure your domain</p>
        </div>
      </div>

      {!state.cloudflare.validated ? (
        <>
          <Input
            label="Cloudflare API Token"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={state.cloudflare.apiToken}
            onChange={(e) => setCloudflare({ apiToken: e.target.value })}
            secret
            error={error || undefined}
            hint="Create a token with 'Edit zone DNS' permissions"
          />

          <Collapsible title="How do I get an API token?">
            <ol className="space-y-3 text-sm text-slate-300">
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>
                  Go to{' '}
                  <a
                    href="https://dash.cloudflare.com/profile/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    Cloudflare API Tokens
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>Click "Create Token"</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>Use the <strong>"Edit zone DNS"</strong> template</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                  4
                </span>
                <span>Under "Zone Resources", select your domain or "All zones"</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                  5
                </span>
                <span><strong>Copy the token immediately</strong> — it's only shown once!</span>
              </li>
            </ol>
          </Collapsible>

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
            Found {state.cloudflare.zones.length} domain{state.cloudflare.zones.length !== 1 ? 's' : ''} in your account.
          </Alert>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Select Domain
            </label>
            <select
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={state.cloudflare.selectedZone}
              onChange={(e) => setCloudflare({ selectedZone: e.target.value })}
            >
              {state.cloudflare.zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Subdomain"
            placeholder="foundry"
            value={state.cloudflare.subdomain}
            onChange={(e) => {
              const subdomain = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
              setCloudflare({ subdomain })
              // Update server name to match subdomain (if still default)
              if (state.server.name === 'foundry-vtt' || state.server.name === state.cloudflare.subdomain) {
                setServer({ name: subdomain || 'foundry-vtt' })
              }
            }}
            error={error || undefined}
            hint={fullDomain ? `Your server will be at https://${fullDomain}` : undefined}
          />

          {checkingRecord && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking for existing DNS records...
            </div>
          )}

          {existingRecord && !checkingRecord && (
            <Alert type="warning" title="This subdomain is already in use">
              <div className="space-y-2">
                <p>
                  <strong>{existingRecord.name}</strong> is currently pointing to another server ({existingRecord.content}).
                </p>
                <p className="text-sm">
                  If you continue, this will be <strong>replaced</strong> with your new Foundry server.
                  Choose a different subdomain if you want to keep the existing setup.
                </p>
              </div>
            </Alert>
          )}

          <Alert type="info" title="Don't have a domain?">
            You can buy one from{' '}
            <a
              href="https://www.cloudflare.com/products/registrar/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Cloudflare Registrar
            </a>{' '}
            (often cheaper than other registrars).
          </Alert>

          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={() => {
                setCloudflare({ validated: false, apiToken: '' })
                setExistingRecord(null)
              }}
            >
              Use Different Token
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
