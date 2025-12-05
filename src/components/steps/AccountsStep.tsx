import { useState } from 'react'
import { ExternalLink, CheckCircle2, BookOpen, Check } from 'lucide-react'
import { siDigitalocean, siCloudflare } from 'simple-icons'
import { Button } from '../ui/Button'
import { Collapsible } from '../ui/Collapsible'
import { InfoTooltip } from '../ui/InfoTooltip'
import { InfrastructureExplainer } from '../InfrastructureExplainer'
import { DnsExplainer } from '../DnsExplainer'
import type { ProviderId } from '../../api/providers/types'

interface Props {
  provider: ProviderId
  onNext: () => void
  onBack: () => void
}

const hetznerSvg = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0v24h24V0zm18.08 18.45h-2.15v-5.93h-2.74l-.01 2.06c-.01 2.12-.08 3.08-.38 3.64-.42.76-1.2 1.06-2.14 1.06-.42 0-.94-.08-1.33-.22l.19-1.74c.22.08.44.12.68.12.51 0 .82-.3.95-.87.08-.38.1-.87.1-2.49l.02-3.3h6.81zm-9.87 0H5.92V5.55h2.29v5.26h3.56V5.55h2.29v12.9h-2.29v-5.61H8.21z"/></svg>`

const providerConfig = {
  digitalocean: {
    name: 'DigitalOcean',
    icon: siDigitalocean.svg,
    color: '#0080FF',
    signupUrl: 'https://m.do.co/c/ea9292afc8cc',
    signupBonus: '$200 free credit',
    description: 'Hosts your Foundry server • From $6/month',
    tooltip: 'Cloud hosting provider. Your Foundry server will run on their infrastructure 24/7. Servers start at $6/month.',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    bonusColor: 'text-blue-400',
  },
  hetzner: {
    name: 'Hetzner Cloud',
    icon: hetznerSvg,
    color: '#D50C2D',
    signupUrl: 'https://www.hetzner.com/cloud',
    signupBonus: 'European servers',
    description: 'Hosts your Foundry server • From €3.79/month',
    tooltip: 'German cloud hosting provider. Competitive pricing with excellent privacy standards. Popular in Europe.',
    buttonColor: 'bg-red-600 hover:bg-red-700',
    bonusColor: 'text-red-400',
  },
}

export function AccountsStep({ provider, onNext, onBack }: Props) {
  const [hasCloudProvider, setHasCloudProvider] = useState(false)
  const [hasCloudflare, setHasCloudflare] = useState(false)

  const config = providerConfig[provider]
  const canProceed = hasCloudProvider && hasCloudflare

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-xl font-semibold text-white mb-2">
          Before we begin
        </h2>
        <p className="text-slate-400">
          You'll need accounts with these two services, plus a domain on Cloudflare.
        </p>
      </div>

      <div className="space-y-4">
        {/* Cloud Provider (DigitalOcean or Hetzner) */}
        <div
          className={`p-4 rounded-lg border transition-colors ${
            hasCloudProvider
              ? 'border-green-500/50 bg-green-500/5'
              : 'border-slate-600 bg-slate-900/50'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              dangerouslySetInnerHTML={{
                __html: config.icon.replace('<svg', `<svg fill="${config.color}" `)
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-white">{config.name}</h3>
                <InfoTooltip content={config.tooltip} />
                {hasCloudProvider && (
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                )}
              </div>
              <p className="text-sm text-slate-400 mb-3">
                {config.description}
              </p>
              <div className="flex items-center gap-3">
                <a
                  href={config.signupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-3 py-1.5 ${config.buttonColor} text-white text-sm font-medium rounded-lg transition-colors`}
                >
                  Create Account
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <span className={`text-xs ${config.bonusColor}`}>{config.signupBonus}</span>
              </div>
            </div>
            <button
              onClick={() => setHasCloudProvider(!hasCloudProvider)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                hasCloudProvider
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Check className={`w-4 h-4 ${hasCloudProvider ? 'opacity-100' : 'opacity-50'}`} />
              Done
            </button>
          </div>
        </div>

        {/* Cloudflare */}
        <div
          className={`p-4 rounded-lg border transition-colors ${
            hasCloudflare
              ? 'border-green-500/50 bg-green-500/5'
              : 'border-slate-600 bg-slate-900/50'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              dangerouslySetInnerHTML={{
                __html: siCloudflare.svg.replace('<svg', `<svg fill="#F38020" `)
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-white">Cloudflare</h3>
                <InfoTooltip content="DNS and security provider. Gives your server a custom domain (like foundry.yourdomain.com) with free SSL and DDoS protection." />
                {hasCloudflare && (
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                )}
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Requires a domain you own • Free SSL + DDoS protection
              </p>
              <div className="space-y-2">
                <a
                  href="https://dash.cloudflare.com/sign-up"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Create Account
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <p className="text-xs text-slate-500">
                  Your domain's DNS must be managed by Cloudflare.{' '}
                  <a
                    href="https://www.cloudflare.com/products/registrar/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:underline"
                  >
                    Buy a domain
                  </a>{' '}
                  if you don't have one.
                </p>
              </div>
            </div>
            <button
              onClick={() => setHasCloudflare(!hasCloudflare)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                hasCloudflare
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Check className={`w-4 h-4 ${hasCloudflare ? 'opacity-100' : 'opacity-50'}`} />
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Learn more section - collapsed by default */}
      <Collapsible
        title={
          <span className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Learn more about how this works
          </span>
        }
      >
        <div className="space-y-4 pt-2">
          <InfrastructureExplainer />
          <DnsExplainer />

          {/* Referral note - only show for DigitalOcean */}
          {provider === 'digitalocean' && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 text-sm">
                <strong>Note:</strong> The DigitalOcean link is a referral link. You get $200 in free credits,
                and if you spend $25+ after that, I get a $25 credit to help maintain this tool. No extra cost to you!
              </p>
            </div>
          )}
        </div>
      </Collapsible>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Continue
        </Button>
      </div>
    </div>
  )
}
