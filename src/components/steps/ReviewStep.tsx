import { useState, useEffect, useCallback } from 'react'
import { Server, Globe, Key, Shield, Loader2, Clock } from 'lucide-react'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { Input } from '../ui/Input'
import * as doApi from '../../api/digitalocean'
import type { WizardState } from '../../types'

interface Props {
  state: WizardState
  setServer: (updates: Partial<WizardState['server']>) => void
  setMaintenance: (updates: Partial<WizardState['maintenance']>) => void
  onNext: () => void
  onBack: () => void
}

export function ReviewStep({ state, setServer, setMaintenance, onNext, onBack }: Props) {
  const [existingDroplet, setExistingDroplet] = useState<{
    id: number
    name: string
    ip: string | null
  } | null>(null)
  const [checkingDroplet, setCheckingDroplet] = useState(false)

  const selectedZone = state.cloudflare.zones.find(
    (z) => z.id === state.cloudflare.selectedZone
  )
  const fullDomain = `${state.cloudflare.subdomain}.${selectedZone?.name || ''}`

  const selectedRegion = state.digitalOcean.regions.find(
    (r) => r.slug === state.digitalOcean.selectedRegion
  )

  const checkForExistingDroplet = useCallback(async () => {
    if (!state.server.name) {
      setExistingDroplet(null)
      return
    }

    setCheckingDroplet(true)
    try {
      const droplet = await doApi.checkExistingDroplet(
        state.digitalOcean.apiKey,
        state.server.name
      )
      setExistingDroplet(droplet)
    } catch {
      setExistingDroplet(null)
    } finally {
      setCheckingDroplet(false)
    }
  }, [state.digitalOcean.apiKey, state.server.name])

  useEffect(() => {
    const timer = setTimeout(() => {
      checkForExistingDroplet()
    }, 500)
    return () => clearTimeout(timer)
  }, [checkForExistingDroplet])

  return (
    <div className="space-y-6">
      <Alert type="warning" title="Ready to Deploy">
        Review your configuration below. This will create a new DigitalOcean
        droplet and configure DNS. You'll be charged by DigitalOcean for the
        server.
      </Alert>

      {/* Server name input */}
      <Input
        label="Server Name"
        placeholder="foundry-vtt"
        value={state.server.name}
        onChange={(e) =>
          setServer({
            name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
          })
        }
        hint="This is the name shown in your DigitalOcean dashboard"
      />

      {checkingDroplet && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking for existing droplets...
        </div>
      )}

      {existingDroplet && !checkingDroplet && (
        <Alert type="warning" title="A server with this name already exists">
          <div className="space-y-2">
            <p>
              <strong>{existingDroplet.name}</strong> is already running
              {existingDroplet.ip && ` at ${existingDroplet.ip}`}.
            </p>
            <p className="text-sm">
              If you continue, a <strong>new server</strong> will be created with the same name.
              Consider using a different name to avoid confusion, or delete the existing server first.
            </p>
          </div>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-5 h-5 text-blue-400" />
            <h3 className="font-medium text-white">Server</h3>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-400">Region</dt>
              <dd className="text-white">{selectedRegion?.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Size</dt>
              <dd className="text-white">{state.digitalOcean.selectedSize}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">OS</dt>
              <dd className="text-white">Ubuntu 24.04 LTS</dd>
            </div>
          </dl>
        </div>

        <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-5 h-5 text-green-400" />
            <h3 className="font-medium text-white">Domain</h3>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-400">URL</dt>
              <dd className="text-white">https://{fullDomain}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">SSL</dt>
              <dd className="text-green-400">Automatic (Cloudflare)</dd>
            </div>
          </dl>
        </div>

        <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-5 h-5 text-amber-400" />
            <h3 className="font-medium text-white">Foundry VTT</h3>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-400">Version</dt>
              <dd className="text-white">v{state.foundry.majorVersion}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">License</dt>
              <dd className="text-white">
                {state.foundry.licenseKey ? 'Pre-activated' : 'Manual activation'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-purple-400" />
            <h3 className="font-medium text-white">Security</h3>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-400">SSH</dt>
              <dd className="text-white">Key-only (no password)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Firewall</dt>
              <dd className="text-white">UFW (ports 22, 80, 443)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Brute Force</dt>
              <dd className="text-white">Fail2ban enabled</dd>
            </div>
          </dl>
        </div>

        <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 sm:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h3 className="font-medium text-white">Auto-Updates</h3>
          </div>
          <p className="text-sm text-slate-400 mb-3">
            Security updates are installed automatically. If a reboot is needed, it happens at the time below.
          </p>
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-400">Reboot time (UTC):</label>
            <select
              value={state.maintenance.updateHour}
              onChange={(e) => setMaintenance({ updateHour: parseInt(e.target.value) })}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, '0')}:00 UTC
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">
              (Choose when your players aren't online)
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
        <h3 className="font-medium text-white mb-2">What happens next?</h3>
        <ol className="space-y-1 text-sm text-slate-300 list-decimal list-inside">
          <li>An SSH key will be generated for secure access</li>
          <li>A new droplet will be created on DigitalOcean</li>
          <li>DNS will be configured on Cloudflare</li>
          <li>Foundry VTT will be installed and started</li>
          <li>SSL certificate will be automatically obtained</li>
        </ol>
        <p className="mt-3 text-sm text-slate-400">
          This process takes about 5-10 minutes. Don't close this window.
        </p>
      </div>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!state.server.name}>
          Deploy Server
        </Button>
      </div>
    </div>
  )
}
