import { useEffect, useRef, useState } from 'react'
import { Download, CheckCircle2, Loader2, XCircle, ExternalLink } from 'lucide-react'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import * as doApi from '../../api/digitalocean'
import * as cfApi from '../../api/cloudflare'
import { generateSSHKeyPair, downloadPrivateKey } from '../../utils/ssh'
import { generateCloudInit } from '../../utils/cloudinit'
import type { WizardState, ProvisioningStatus, SSHKeyPair } from '../../types'

interface Props {
  state: WizardState
  setProvisioning: (updates: Partial<WizardState['provisioning']>) => void
  setSshKeyPair: (keyPair: SSHKeyPair) => void
  addLog: (message: string) => void
  onNext: () => void
}

const STATUS_LABELS: Record<ProvisioningStatus, string> = {
  idle: 'Preparing...',
  'creating-droplet': 'Creating server...',
  'waiting-for-ip': 'Waiting for IP address...',
  'configuring-dns': 'Configuring DNS...',
  'waiting-for-server': 'Waiting for server to be ready...',
  'installing-foundry': 'Installing Foundry VTT...',
  complete: 'Installation complete!',
  error: 'An error occurred',
}

export function ProvisioningStep({
  state,
  setProvisioning,
  setSshKeyPair,
  addLog,
  onNext,
}: Props) {
  const [error, setError] = useState<string | null>(null)
  const [keyDownloaded, setKeyDownloaded] = useState(false)
  const startedRef = useRef(false)

  const selectedZone = state.cloudflare.zones.find(
    (z) => z.id === state.cloudflare.selectedZone
  )
  const fullDomain = `${state.cloudflare.subdomain}.${selectedZone?.name || ''}`

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    runProvisioning()
  }, [])

  async function runProvisioning() {
    try {
      addLog('Starting provisioning process...')
      setProvisioning({ status: 'creating-droplet' })

      addLog('Generating SSH key pair...')
      const keyPair = await generateSSHKeyPair()
      setSshKeyPair(keyPair)
      addLog('SSH key pair generated')

      addLog('Uploading SSH key to DigitalOcean...')
      const sshKey = await doApi.addSshKey(
        state.digitalOcean.apiKey,
        `foundry-installer-${Date.now()}`,
        keyPair.publicKey
      )
      addLog(`SSH key uploaded (ID: ${sshKey.id})`)

      addLog('Generating server configuration...')
      const spacesConfig = state.spaces.enabled && state.spaces.credentials
        ? {
            accessKeyId: state.spaces.credentials.accessKeyId,
            secretAccessKey: state.spaces.credentials.secretAccessKey,
            region: state.spaces.selectedRegion || doApi.getSpacesRegions()[0],
            bucket: state.spaces.newSpaceName,
          }
        : undefined
      if (spacesConfig) {
        addLog(`Spaces storage enabled: ${spacesConfig.bucket}.${spacesConfig.region}.digitaloceanspaces.com`)
      }
      const cloudInit = generateCloudInit(
        fullDomain,
        state.foundry.downloadUrl,
        state.foundry.licenseKey,
        spacesConfig,
        { updateHour: state.maintenance.updateHour }
      )

      addLog('Creating droplet...')
      const dropletResponse = await doApi.createDroplet(
        state.digitalOcean.apiKey,
        state.server.name,
        state.digitalOcean.selectedRegion,
        state.digitalOcean.selectedSize,
        sshKey.id,
        cloudInit
      )
      const dropletId = dropletResponse.droplet.id
      setProvisioning({ dropletId: String(dropletId) })
      addLog(`Droplet created (ID: ${dropletId})`)

      setProvisioning({ status: 'waiting-for-ip' })
      addLog('Waiting for public IP address...')
      const ip = await doApi.waitForDropletIp(
        state.digitalOcean.apiKey,
        dropletId
      )
      setProvisioning({ dropletIp: ip })
      addLog(`Public IP assigned: ${ip}`)

      setProvisioning({ status: 'configuring-dns' })
      addLog(`Creating DNS record for ${fullDomain}...`)
      await cfApi.createDnsRecord(
        state.cloudflare.apiToken,
        state.cloudflare.selectedZone,
        fullDomain,
        ip
      )
      addLog('DNS record created successfully!')

      setProvisioning({ status: 'waiting-for-server' })
      addLog('Waiting for server to initialize (this takes 5-10 minutes)...')
      addLog('The server is installing Node.js, Caddy, and Foundry VTT...')

      await waitForServer(fullDomain, addLog)

      setProvisioning({ status: 'complete' })
      addLog('Foundry VTT is now running!')
      addLog(`Access your server at: https://${fullDomain}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      setProvisioning({ status: 'error' })
      addLog(`ERROR: ${message}`)
    }
  }

  async function waitForServer(domain: string, log: (msg: string) => void) {
    const maxAttempts = 60
    const interval = 10000

    // Initial delay - cloud-init needs time to install packages, download Foundry, and reboot
    log('Waiting 2 minutes for initial server setup...')
    await new Promise((r) => setTimeout(r, 120000))
    log('Checking Foundry status API...')

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)

        // Use Foundry's status API to confirm it's actually running
        const res = await fetch(`https://${domain}/api/status`, {
          signal: controller.signal,
        })
        clearTimeout(timeout)

        if (res.ok) {
          const status = await res.json()
          if (status.version) {
            log(`Foundry v${status.version} is running!`)
            return
          }
        }
      } catch {
        // Server not ready yet or rebooting
      }

      if (i % 3 === 0 && i > 0) {
        const elapsed = Math.floor((i * interval) / 60000) + 2 // +2 for initial delay
        log(`Still waiting... (${elapsed} min elapsed)`)
      }
      await new Promise((r) => setTimeout(r, interval))
    }

    log('Server may still be starting. Check back in a few minutes.')
  }

  const handleDownloadKey = () => {
    if (state.server.sshKeyPair) {
      downloadPrivateKey(
        state.server.sshKeyPair.privateKey,
        `${state.server.name}-ssh-key.pem`
      )
      setKeyDownloaded(true)
    }
  }

  const isComplete = state.provisioning.status === 'complete'
  const isError = state.provisioning.status === 'error'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
        {isComplete ? (
          <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />
        ) : isError ? (
          <XCircle className="w-6 h-6 text-red-400 shrink-0" />
        ) : (
          <Loader2 className="w-6 h-6 text-blue-400 shrink-0 animate-spin" />
        )}
        <div>
          <p className="font-medium text-white">
            {STATUS_LABELS[state.provisioning.status]}
          </p>
          {state.provisioning.dropletIp && (
            <p className="text-sm text-slate-400">
              Server IP: {state.provisioning.dropletIp}
            </p>
          )}
        </div>
      </div>

      {error && (
        <Alert type="error" title="Provisioning Failed">
          {error}
        </Alert>
      )}

      <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 font-mono text-sm h-64 overflow-y-auto">
        {state.provisioning.logs.map((log, i) => (
          <div
            key={i}
            className={`${
              log.includes('ERROR')
                ? 'text-red-400'
                : log.includes('!')
                ? 'text-green-400'
                : 'text-slate-300'
            }`}
          >
            {log}
          </div>
        ))}
      </div>

      {state.server.sshKeyPair && (
        <Alert type="warning" title="Save Your SSH Key">
          <p className="mb-3">
            Download your private SSH key now. You'll need it to access your
            server. This key cannot be recovered if lost.
          </p>
          <Button
            variant={keyDownloaded ? 'secondary' : 'primary'}
            onClick={handleDownloadKey}
          >
            <Download className="w-4 h-4" />
            {keyDownloaded ? 'Download Again' : 'Download SSH Key'}
          </Button>
        </Alert>
      )}

      {isComplete && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <h3 className="font-medium text-green-400 mb-2">
            Your Foundry VTT server is ready!
          </h3>
          <p className="text-slate-300 mb-4">
            Access your server at the URL below. On first visit, you'll need to
            enter your Foundry license key if you didn't provide one earlier.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`https://${fullDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
            >
              Open Foundry VTT
              <ExternalLink className="w-4 h-4" />
            </a>
            <Button onClick={onNext}>
              View Server Info & Commands
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
