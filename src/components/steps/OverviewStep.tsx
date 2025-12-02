import { useState } from 'react'
import { siDigitalocean, siCloudflare, siCaddy, siPm2 } from 'simple-icons'
import { Button } from '../ui/Button'
import { ArrowRight } from 'lucide-react'

interface Props {
  onNext: () => void
}

interface ServiceInfo {
  name: string
  icon: string
  iconType?: 'svg' | 'img'
  color: string
  novice: { label: string; details: string }
  expert: { label: string; details: string }
}

const services: ServiceInfo[] = [
  {
    name: 'DigitalOcean',
    icon: siDigitalocean.svg,
    color: '#0080FF',
    novice: {
      label: 'Your server',
      details: 'A computer in the cloud that runs Foundry for you 24/7. Protected by a firewall that only lets game traffic through.',
    },
    expert: {
      label: 'Cloud Infrastructure',
      details: 'Ubuntu 24.04 LTS droplet with UFW firewall (ports 22, 80, 443) and fail2ban for SSH brute-force protection.',
    },
  },
  {
    name: 'Cloudflare',
    icon: siCloudflare.svg,
    color: '#F38020',
    novice: {
      label: 'Your web address',
      details: 'Lets you use a nice address like "foundry.mydomain.com" instead of a random IP number. Also keeps bad guys out.',
    },
    expert: {
      label: 'DNS & Security',
      details: 'Manages DNS A records pointing to droplet IP. Provides DDoS protection and CDN caching at the edge.',
    },
  },
  {
    name: 'Caddy',
    icon: siCaddy.svg,
    color: '#22D3EE',
    novice: {
      label: 'The secure lock',
      details: 'Adds the little padlock icon to your browser so connections are private and encrypted. Sets itself up automatically.',
    },
    expert: {
      label: 'Reverse Proxy',
      details: 'Automatic HTTPS via Let\'s Encrypt with ACME. Handles TLS termination and proxies to Foundry on localhost:30000.',
    },
  },
  {
    name: 'PM2',
    icon: siPm2.svg,
    color: '#9966FF',
    novice: {
      label: 'The babysitter',
      details: 'Watches Foundry and restarts it if it ever crashes. Makes sure it\'s always running when your players need it.',
    },
    expert: {
      label: 'Process Manager',
      details: 'Node.js process manager with systemd integration. Auto-restarts on crash, starts on boot, handles log rotation.',
    },
  },
  {
    name: 'Foundry VTT',
    icon: 'https://r2.foundryvtt.com/website-static-public/assets/icons/fvtt.png',
    iconType: 'img',
    color: '#E74C3C',
    novice: {
      label: 'The game',
      details: 'Where you and your friends play tabletop RPGs online with maps, character sheets, dice, and all the fun stuff.',
    },
    expert: {
      label: 'Virtual Tabletop',
      details: 'Self-hosted Node.js application. Configured with reverse proxy settings (proxySSL, proxyPort 443) for HTTPS.',
    },
  },
]

function ServiceIcon({ icon, iconType, color }: { icon: string; iconType?: 'svg' | 'img'; color: string }) {
  if (iconType === 'img') {
    return (
      <div className="w-12 h-12 flex items-center justify-center">
        <img src={icon} alt="" className="w-10 h-10 object-contain" />
      </div>
    )
  }

  // Add fill color and size class to SVG
  const styledSvg = icon.replace('<svg', `<svg fill="${color}" class="w-10 h-10"`)

  return (
    <div
      className="w-12 h-12 flex items-center justify-center"
      dangerouslySetInnerHTML={{ __html: styledSvg }}
    />
  )
}

export function OverviewStep({ onNext }: Props) {
  const [expertMode, setExpertMode] = useState(false)

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">
          Foundry VTT Server Installer
        </h1>
        <p className="text-slate-400">
          Deploy a production-ready Foundry VTT server in minutes
        </p>
      </div>

      <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
        <div className="flex items-center justify-end mb-4">
          <button
            onClick={() => setExpertMode(!expertMode)}
            className="flex items-center gap-2 px-2 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <span className={expertMode ? 'text-slate-500' : 'text-blue-400'}>Simple</span>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${expertMode ? 'bg-blue-600' : 'bg-slate-600'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${expertMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className={expertMode ? 'text-blue-400' : 'text-slate-500'}>Expert</span>
          </button>
        </div>
        <div className="space-y-4">
          {services.map((service) => {
            const mode = expertMode ? service.expert : service.novice
            return (
              <div key={service.name} className="flex gap-4">
                <div className="shrink-0">
                  <ServiceIcon icon={service.icon} iconType={service.iconType} color={service.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-medium text-white">{service.name}</h3>
                    <span className="text-xs text-slate-500">{mode.label}</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">{mode.details}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
        <h3 className="font-medium text-blue-400 mb-2">What you'll need</h3>
        <ul className="text-sm text-slate-300 space-y-1">
          <li>• A DigitalOcean account (get $200 free credit with new signup)</li>
          <li>• A Cloudflare account and a domain you own</li>
          <li>• A Foundry VTT license and download link</li>
        </ul>
      </div>

      <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
        <h3 className="font-medium text-white mb-2">Estimated costs</h3>
        <div className="text-sm text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>DigitalOcean Droplet</span>
            <span className="text-slate-300">$6-18/month</span>
          </div>
          <div className="flex justify-between">
            <span>DigitalOcean Spaces (optional, for large asset libraries)</span>
            <span className="text-slate-300">$5/month</span>
          </div>
          <div className="flex justify-between">
            <span>Cloudflare DNS</span>
            <span className="text-green-400">Free</span>
          </div>
          <div className="flex justify-between">
            <span>SSL Certificate (Let's Encrypt)</span>
            <span className="text-green-400">Free</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext}>
          Get Started
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
