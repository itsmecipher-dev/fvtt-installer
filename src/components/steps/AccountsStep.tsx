import { useState } from 'react'
import { ExternalLink, CheckCircle2, BookOpen, Check } from 'lucide-react'
import { siDigitalocean, siCloudflare } from 'simple-icons'
import { Button } from '../ui/Button'
import { Collapsible } from '../ui/Collapsible'
import { InfoTooltip } from '../ui/InfoTooltip'
import { InfrastructureExplainer } from '../InfrastructureExplainer'
import { DnsExplainer } from '../DnsExplainer'

interface Props {
  onNext: () => void
  onBack: () => void
}

export function AccountsStep({ onNext, onBack }: Props) {
  const [hasDigitalOcean, setHasDigitalOcean] = useState(false)
  const [hasCloudflare, setHasCloudflare] = useState(false)

  const canProceed = hasDigitalOcean && hasCloudflare

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
        {/* DigitalOcean */}
        <div
          className={`p-4 rounded-lg border transition-colors ${
            hasDigitalOcean
              ? 'border-green-500/50 bg-green-500/5'
              : 'border-slate-600 bg-slate-900/50'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              dangerouslySetInnerHTML={{
                __html: siDigitalocean.svg.replace('<svg', `<svg fill="#0080FF" `)
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-white">DigitalOcean</h3>
                <InfoTooltip content="Cloud hosting provider. Your Foundry server will run on their infrastructure 24/7. Servers start at $6/month." />
                {hasDigitalOcean && (
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                )}
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Hosts your Foundry server • From $6/month
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://m.do.co/c/ea9292afc8cc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Create Account
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <span className="text-xs text-blue-400">$200 free credit</span>
              </div>
            </div>
            <button
              onClick={() => setHasDigitalOcean(!hasDigitalOcean)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                hasDigitalOcean
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Check className={`w-4 h-4 ${hasDigitalOcean ? 'opacity-100' : 'opacity-50'}`} />
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

          {/* Referral note */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong>Note:</strong> The DigitalOcean link is a referral link. You get $200 in free credits,
              and if you spend $25+ after that, I get a $25 credit to help maintain this tool. No extra cost to you!
            </p>
          </div>
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
