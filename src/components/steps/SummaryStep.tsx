import { useState } from 'react'
import {
  ExternalLink,
  Copy,
  Check,
  Server,
  Globe,
  Key,
  Terminal,
  Database,
  Shield,
  RefreshCw,
  Printer,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { Collapsible } from '../ui/Collapsible'
import * as doApi from '../../api/digitalocean'
import type { WizardState } from '../../types'

interface Props {
  state: WizardState
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors"
      title={`Copy ${label || 'to clipboard'}`}
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function CodeBlock({ children, copyText }: { children: string; copyText?: string }) {
  return (
    <div className="relative group">
      <pre className="p-3 bg-slate-900 rounded-lg text-sm font-mono text-slate-300 overflow-x-auto">
        {children}
      </pre>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={copyText || children} />
      </div>
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-blue-400" />
          <span className="font-medium text-white">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  )
}

export function SummaryStep({ state }: Props) {
  const selectedZone = state.cloudflare.zones.find(
    (z) => z.id === state.cloudflare.selectedZone
  )
  const fullDomain = `${state.cloudflare.subdomain}.${selectedZone?.name || ''}`
  const serverIp = state.provisioning.dropletIp || 'unknown'

  const spacesRegion = state.spaces.selectedRegion || doApi.getSpacesRegions()[0]

  const sshCommand = `ssh -i ${state.server.name}-ssh-key.pem foundry@${serverIp}`

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    const data = {
      server: {
        name: state.server.name,
        ip: serverIp,
        domain: fullDomain,
        region: state.digitalOcean.selectedRegion,
      },
      foundry: {
        url: `https://${fullDomain}`,
        adminUrl: `https://${fullDomain}/setup`,
        dataPath: '/home/foundry/foundrydata',
        configPath: '/home/foundry/foundrydata/Config',
      },
      ssh: {
        user: 'foundry',
        command: sshCommand,
      },
      spaces: state.spaces.enabled
        ? {
            bucket: state.spaces.newSpaceName,
            region: spacesRegion,
            endpoint: `https://${spacesRegion}.digitaloceanspaces.com`,
            url: `https://${state.spaces.newSpaceName}.${spacesRegion}.digitaloceanspaces.com`,
          }
        : null,
      pm2Commands: {
        status: 'pm2 status',
        logs: 'pm2 logs foundry',
        restart: 'pm2 restart foundry',
        stop: 'pm2 stop foundry',
        start: 'pm2 start foundry',
      },
      maintenance: {
        autoUpdates: `Enabled (security updates, reboot at ${String(state.maintenance.updateHour).padStart(2, '0')}:00 UTC)`,
        foundryUpdates: 'Use Foundry Setup → Update Software tab',
      },
      links: {
        digitalOcean: 'https://cloud.digitalocean.com/droplets',
        cloudflare: 'https://dash.cloudflare.com',
        foundryLicenses: 'https://foundryvtt.com/me/licenses',
      },
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `foundry-server-${state.server.name}-info.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="text-center mb-6 print:mb-4">
        <h1 className="text-2xl font-bold text-green-400 mb-2">
          Your Foundry VTT Server is Ready!
        </h1>
        <p className="text-slate-400">
          Save this information for future reference
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 justify-center print:hidden">
        <a
          href={`https://${fullDomain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
        >
          Open Foundry VTT
          <ExternalLink className="w-4 h-4" />
        </a>
        <Button variant="secondary" onClick={handlePrint}>
          <Printer className="w-4 h-4" />
          Print
        </Button>
        <Button variant="secondary" onClick={handleExport}>
          <Download className="w-4 h-4" />
          Export JSON
        </Button>
      </div>

      {/* Server Details */}
      <Section title="Server Details" icon={Server}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Domain</p>
            <p className="text-white font-mono">{fullDomain}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">IP Address</p>
            <p className="text-white font-mono">{serverIp}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Region</p>
            <p className="text-white">{state.digitalOcean.selectedRegion}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Server Name</p>
            <p className="text-white">{state.server.name}</p>
          </div>
        </div>
      </Section>

      {/* SSH Access */}
      <Section title="Server Access" icon={Key}>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-white mb-2">Option 1: DigitalOcean Console (Easiest)</h4>
            <p className="text-sm text-slate-400 mb-2">
              Access your server directly from the DigitalOcean dashboard—no SSH client needed:
            </p>
            <ol className="space-y-1 text-sm text-slate-300 list-decimal list-inside mb-3">
              <li>Go to <a href="https://cloud.digitalocean.com/droplets" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">DigitalOcean Droplets</a></li>
              <li>Click on your droplet ({state.server.name})</li>
              <li>Select "Access" in the left menu</li>
              <li>Click "Launch Droplet Console"</li>
              <li>Switch to the foundry user: <code className="bg-slate-800 px-1 rounded">su - foundry</code></li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium text-white mb-2">Option 2: SSH (Advanced)</h4>
            <p className="text-sm text-slate-400 mb-2">
              Connect using the private key you downloaded:
            </p>
            <CodeBlock copyText={sshCommand}>{sshCommand}</CodeBlock>
            <p className="text-xs text-slate-500 mt-2">
              Make sure to set correct permissions on your key file:
            </p>
            <CodeBlock>{`chmod 600 ${state.server.name}-ssh-key.pem`}</CodeBlock>
          </div>
        </div>
      </Section>

      {/* PM2 Commands */}
      <Section title="PM2 Commands" icon={Terminal}>
        <p className="text-sm text-slate-400 mb-3">
          Foundry runs as a PM2 process. Use these commands after SSHing into your server:
        </p>
        <div className="space-y-2">
          <div>
            <p className="text-xs text-slate-500 mb-1">Check status</p>
            <CodeBlock>pm2 status</CodeBlock>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">View logs (live)</p>
            <CodeBlock>pm2 logs foundry</CodeBlock>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Restart Foundry</p>
            <CodeBlock>pm2 restart foundry</CodeBlock>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Stop/Start Foundry</p>
            <CodeBlock>pm2 stop foundry && pm2 start foundry</CodeBlock>
          </div>
        </div>
      </Section>

      {/* Spaces Storage */}
      <Section title="Asset Storage (Spaces)" icon={Database} defaultOpen={state.spaces.enabled}>
        {state.spaces.enabled ? (
          <>
            <Alert type="success" title="Spaces Configured">
              Your server is configured to use DigitalOcean Spaces for asset storage.
            </Alert>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Bucket</p>
                <p className="text-white font-mono">{state.spaces.newSpaceName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Region</p>
                <p className="text-white">{spacesRegion}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Endpoint</p>
                <p className="text-white font-mono text-sm break-all">
                  https://{state.spaces.newSpaceName}.{spacesRegion}.digitaloceanspaces.com
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Config Location</p>
              <CodeBlock>/home/foundry/foundrydata/Config/aws.json</CodeBlock>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-400 mb-3">
              You didn't configure Spaces, but you can add it later. Here's how:
            </p>
            <Collapsible title="How to add Spaces storage later">
              <ol className="space-y-3 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">1</span>
                  <span>
                    Create a Space at{' '}
                    <a href="https://cloud.digitalocean.com/spaces" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                      DigitalOcean Spaces
                    </a>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">2</span>
                  <span>
                    Create an access key at{' '}
                    <a href="https://cloud.digitalocean.com/spaces/access_keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                      Spaces Access Keys
                    </a>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">3</span>
                  <span>SSH into your server and create the config file:</span>
                </li>
              </ol>
              <div className="mt-3">
                <CodeBlock>{`cat > /home/foundry/foundrydata/Config/aws.json << 'EOF'
{
  "accessKeyId": "YOUR_ACCESS_KEY_ID",
  "secretAccessKey": "YOUR_SECRET_ACCESS_KEY",
  "region": "nyc3",
  "endpoint": "https://nyc3.digitaloceanspaces.com",
  "bucket": "your-bucket-name"
}
EOF`}</CodeBlock>
              </div>
              <p className="text-sm text-slate-400 mt-3">
                Then restart Foundry: <code className="bg-slate-800 px-1 rounded">pm2 restart foundry</code>
              </p>
            </Collapsible>
          </>
        )}
      </Section>

      {/* Maintenance */}
      <Section title="Server Maintenance" icon={RefreshCw}>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-white mb-2">Automatic Security Updates</h4>
            <p className="text-sm text-slate-400">
              Your server automatically installs security updates daily.
              If a reboot is required, it will happen at <strong>{String(state.maintenance.updateHour).padStart(2, '0')}:00 UTC</strong>.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-white mb-2">Updating Foundry VTT</h4>
            <p className="text-sm text-slate-400 mb-2">
              Updates and backups are managed through Foundry's built-in features:
            </p>
            <ol className="space-y-2 text-sm text-slate-300">
              <li className="flex gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-xs">1</span>
                <span>
                  Go to <a href={`https://${fullDomain}/setup`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Foundry Setup</a>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-xs">2</span>
                <span>Navigate to the "Update Software" tab</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-xs">3</span>
                <span>Follow the prompts to update to the latest version</span>
              </li>
            </ol>
            <p className="text-xs text-slate-500 mt-2">
              Foundry automatically creates backups before updates. You can also create manual backups from the Setup screen.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-white mb-2">Data Location</h4>
            <p className="text-sm text-slate-400">
              Your game data is stored in <code className="bg-slate-800 px-1 rounded">/home/foundry/foundrydata</code>
            </p>
          </div>
        </div>
      </Section>

      {/* Security Reminders */}
      <Section title="Security Reminders" icon={Shield}>
        <Alert type="warning" title="Important Security Steps">
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span>•</span>
              <span>
                <strong>Delete your DigitalOcean API key</strong> from{' '}
                <a href="https://cloud.digitalocean.com/account/api/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                  API settings
                </a>
                . You don't need it anymore.
              </span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>
                <strong>Store your SSH private key securely</strong>. Anyone with this key can access your server.
              </span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>
                <strong>Set a strong admin password</strong> in Foundry VTT setup when you first log in.
              </span>
            </li>
          </ul>
        </Alert>
      </Section>

      {/* Useful Links */}
      <Section title="Useful Links" icon={Globe}>
        <div className="grid gap-2 sm:grid-cols-2">
          <a
            href={`https://${fullDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="text-white">Your Foundry Server</span>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>
          <a
            href={`https://${fullDomain}/setup`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="text-white">Foundry Setup/Admin</span>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>
          <a
            href="https://cloud.digitalocean.com/droplets"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="text-white">DigitalOcean Dashboard</span>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>
          <a
            href="https://dash.cloudflare.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="text-white">Cloudflare Dashboard</span>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>
          <a
            href="https://foundryvtt.com/me/licenses"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="text-white">Foundry Licenses</span>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>
          <a
            href="https://foundryvtt.com/kb/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="text-white">Foundry Knowledge Base</span>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>
        </div>
      </Section>

      {/* Print-only footer */}
      <div className="hidden print:block text-center text-sm text-slate-500 mt-8 pt-4 border-t border-slate-700">
        Generated by Foundry VTT Installer • {new Date().toLocaleDateString()}
      </div>
    </div>
  )
}
