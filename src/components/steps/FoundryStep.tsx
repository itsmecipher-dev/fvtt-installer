import { useState } from 'react'
import { ExternalLink, Loader2, CheckCircle2, Key } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Alert } from '../ui/Alert'
import { Collapsible } from '../ui/Collapsible'
import * as foundryApi from '../../api/foundry'
import type { WizardState } from '../../types'

interface Props {
  state: WizardState
  setFoundry: (updates: Partial<WizardState['foundry']>) => void
  onNext: () => void
  onBack: () => void
}

type AuthMode = 'credentials' | 'manual'

function extractMajorVersionFromUrl(url: string): number | null {
  // Extract version from URL like https://r2.foundryvtt.com/releases/12.343/FoundryVTT-12.343.zip
  const match = url.match(/releases\/(\d+)\.\d+\//)
  if (match) {
    return parseInt(match[1], 10)
  }
  return null
}

export function FoundryStep({ state, setFoundry, onNext, onBack }: Props) {
  const [authMode, setAuthMode] = useState<AuthMode>('credentials')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [licenses, setLicenses] = useState<foundryApi.FoundryLicense[]>([])
  const [selectedLicense, setSelectedLicense] = useState<string>('')
  const [selectedVersion, setSelectedVersion] = useState('351')
  const [authenticated, setAuthenticated] = useState(false)

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter your username and password')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await foundryApi.authenticateAndGetLicenses(username, password)

      if (!result.success) {
        setError(result.error || 'Authentication failed')
        return
      }

      if (result.licenses && result.licenses.length > 0) {
        setLicenses(result.licenses)
        setSelectedLicense(result.licenses[0].key)
        setAuthenticated(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  const handleGetDownloadUrl = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await foundryApi.getDownloadUrl(
        username,
        password,
        selectedVersion,
        'node'
      )

      if (!result.success) {
        setError(result.error || 'Failed to get download URL')
        return
      }

      if (result.url) {
        const selectedVersionData = foundryApi.FOUNDRY_VERSIONS.find(v => v.value === selectedVersion)
        setFoundry({
          downloadUrl: result.url,
          licenseKey: selectedLicense,
          majorVersion: selectedVersionData?.generation || 13,
        })
        onNext()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get download URL')
    } finally {
      setLoading(false)
    }
  }

  // Manual mode validation
  const isValidUrl = state.foundry.downloadUrl.startsWith('https://') &&
    (state.foundry.downloadUrl.includes('foundryvtt.com') ||
     state.foundry.downloadUrl.includes('r2.foundryvtt.com'))

  const canProceedManual = isValidUrl

  return (
    <div className="space-y-6">
      <Alert type="info" title="Foundry VTT License Required">
        You need a valid Foundry VTT license to continue. Choose how you'd like to provide it.
      </Alert>

      {/* Mode selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setAuthMode('credentials')}
          className={`flex-1 p-3 rounded-lg border transition-colors ${
            authMode === 'credentials'
              ? 'border-blue-500 bg-blue-500/10 text-white'
              : 'border-slate-600 text-slate-400 hover:border-slate-500'
          }`}
        >
          <Key className="w-5 h-5 mx-auto mb-1" />
          <div className="text-sm font-medium">Login to Foundry</div>
          <div className="text-xs text-slate-400">Automatic (recommended)</div>
        </button>
        <button
          onClick={() => setAuthMode('manual')}
          className={`flex-1 p-3 rounded-lg border transition-colors ${
            authMode === 'manual'
              ? 'border-blue-500 bg-blue-500/10 text-white'
              : 'border-slate-600 text-slate-400 hover:border-slate-500'
          }`}
        >
          <ExternalLink className="w-5 h-5 mx-auto mb-1" />
          <div className="text-sm font-medium">Manual URL</div>
          <div className="text-xs text-slate-400">Paste download link</div>
        </button>
      </div>

      {authMode === 'credentials' ? (
        <>
          {!authenticated ? (
            <>
              <Input
                label="Foundry Username"
                placeholder="your-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                error={error && !username ? 'Username required' : undefined}
              />

              <Input
                label="Foundry Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                secret
                error={error && !password ? 'Password required' : undefined}
                hint="Your credentials are sent securely to Foundry VTT and are not stored"
              />

              {error && username && password && (
                <Alert type="error">{error}</Alert>
              )}
            </>
          ) : (
            <>
              <Alert type="success" title="Logged in successfully">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Found {licenses.length} license{licenses.length !== 1 ? 's' : ''}
                </div>
              </Alert>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Select License
                </label>
                <select
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedLicense}
                  onChange={(e) => setSelectedLicense(e.target.value)}
                >
                  {licenses.map((license) => (
                    <option key={license.key} value={license.key}>
                      {license.name || 'Unnamed'} - {license.key.substring(0, 9)}... ({license.purchaseDate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Foundry Version
                </label>
                <select
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedVersion}
                  onChange={(e) => setSelectedVersion(e.target.value)}
                >
                  {foundryApi.FOUNDRY_VERSIONS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              {error && <Alert type="error">{error}</Alert>}

              <div className="flex justify-between">
                <Button variant="secondary" onClick={onBack}>
                  Back
                </Button>
                <Button onClick={handleGetDownloadUrl} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Getting download...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
              </div>
            </>
          )}

          {!authenticated && (
            <div className="flex justify-between">
              <Button variant="secondary" onClick={onBack}>
                Back
              </Button>
              <Button onClick={handleLogin} disabled={loading || !username || !password}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Login & Get Licenses'
                )}
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <Input
            label="Foundry VTT Download URL"
            placeholder="https://r2.foundryvtt.com/releases/..."
            value={state.foundry.downloadUrl}
            onChange={(e) => {
              const url = e.target.value
              const majorVersion = extractMajorVersionFromUrl(url)
              setFoundry({
                downloadUrl: url,
                ...(majorVersion && { majorVersion })
              })
            }}
            hint="This is a timed download link from your Foundry account"
          />

          <Collapsible title="How do I get the download URL?">
            <ol className="space-y-3 text-sm text-slate-300">
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>
                  Go to{' '}
                  <a
                    href="https://foundryvtt.com/me/licenses"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    Foundry VTT Licenses
                    <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  and log in
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>Select your version and choose <strong>"Node.js"</strong> as the Operating System</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>Click "Timed URL" to copy the download link</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                  4
                </span>
                <span>Paste the URL above</span>
              </li>
            </ol>
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-300">
                <strong>Note:</strong> This link expires after 5 minutes. Complete
                the setup quickly or get a new link if needed.
              </p>
            </div>
          </Collapsible>

          <Input
            label="License Key (optional)"
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
            value={state.foundry.licenseKey}
            onChange={(e) => setFoundry({ licenseKey: e.target.value })}
            hint="If provided, Foundry will be pre-activated. Otherwise, you'll enter it on first launch."
          />

          <div className="flex justify-between">
            <Button variant="secondary" onClick={onBack}>
              Back
            </Button>
            <Button onClick={onNext} disabled={!canProceedManual}>
              Continue
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
