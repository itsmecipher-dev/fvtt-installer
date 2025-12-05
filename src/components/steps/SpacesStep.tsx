import { useState } from 'react'
import { HardDrive, Database, Loader2, CheckCircle2, Shield, ExternalLink } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Alert } from '../ui/Alert'
import { Collapsible } from '../ui/Collapsible'
import * as doApi from '../../api/digitalocean'
import * as spacesApi from '../../api/spaces'
import { getStorageProvider } from '../../api/providers'
import type { WizardState } from '../../types'

type ActionStep = 'idle' | 'creating-bucket' | 'creating-scoped-key' | 'validating' | 'done'

interface Props {
  state: WizardState
  setSpaces: (updates: Partial<WizardState['spaces']>) => void
  onNext: () => void
  onBack: () => void
}

// Estimate ~4GB used by OS + Foundry + dependencies
const SYSTEM_OVERHEAD_GB = 4

const ACTION_LABELS: Record<ActionStep, string> = {
  'idle': '',
  'creating-bucket': 'Creating storage bucket...',
  'creating-scoped-key': 'Creating secure access key...',
  'validating': 'Validating credentials...',
  'done': 'Complete!',
}

const storageConfig = {
  digitalocean: {
    name: 'DigitalOcean Spaces',
    bucketLabel: 'Space',
    priceInfo: '$5/month for 250GB storage + CDN',
    docsUrl: 'https://docs.digitalocean.com/products/spaces/',
    supportsAutoCreate: true,
  },
  hetzner: {
    name: 'Hetzner Object Storage',
    bucketLabel: 'Bucket',
    priceInfo: '€4.45/month for 1TB storage',
    docsUrl: 'https://docs.hetzner.com/storage/object-storage/',
    supportsAutoCreate: false,
  },
}

export function SpacesStep({ state, setSpaces, onNext, onBack }: Props) {
  const provider = state.provider
  const config = storageConfig[provider]
  const storageProvider = getStorageProvider(provider)

  const [spaceName, setSpaceName] = useState(state.spaces.newSpaceName)
  const [accessKeyId, setAccessKeyId] = useState('')
  const [secretAccessKey, setSecretAccessKey] = useState('')
  const [selectedStorageRegion, setSelectedStorageRegion] = useState('')
  const [actionStep, setActionStep] = useState<ActionStep>('idle')
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get disk info from selected size
  const selectedSize = provider === 'digitalocean'
    ? state.digitalOcean.selectedSize
    : state.compute.selectedSize
  const diskTotal = selectedSize.includes('35gb') ? 35
    : selectedSize.includes('70gb') ? 70
    : selectedSize.includes('90gb') ? 90
    : selectedSize.includes('120gb') ? 120
    : selectedSize.includes('2gb') ? 50
    : selectedSize.includes('4gb') ? 80
    : selectedSize.includes('cx22') ? 40
    : selectedSize.includes('cx32') ? 80
    : 25
  const diskFree = diskTotal - SYSTEM_OVERHEAD_GB

  // Get storage regions from provider
  const storageRegions = storageProvider.getRegions()
  const computeRegion = provider === 'digitalocean'
    ? state.digitalOcean.selectedRegion
    : state.compute.selectedRegion
  const defaultStorageRegion = storageRegions.find(r => r.slug === computeRegion)?.slug || storageRegions[0]?.slug || ''

  // For DigitalOcean backwards compatibility
  const spacesRegions = doApi.getSpacesRegions()
  const selectedRegion = state.digitalOcean.selectedRegion
  const defaultSpacesRegion = spacesRegions.includes(selectedRegion) ? selectedRegion : spacesRegions[0]

  const handleSkip = () => {
    setSpaces({ enabled: false })
    onNext()
  }

  const handleSpaceNameChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSpaceName(sanitized)
    setSpaces({ newSpaceName: sanitized })
    setError(null)
  }

  const handleCreate = async () => {
    if (spaceName.length < 3) {
      setError('Space name must be at least 3 characters')
      return
    }

    setActionLoading(true)
    setError(null)

    try {
      // Create temporary full-access key for bucket creation
      const tempKey = await doApi.createSpacesKey(
        state.digitalOcean.apiKey,
        `foundry-temp-${Date.now()}`
      )

      // Create the bucket (CORS is configured during provisioning)
      setActionStep('creating-bucket')
      await spacesApi.createSpace(
        { accessKeyId: tempKey.accessKeyId, secretAccessKey: tempKey.secretAccessKey },
        defaultSpacesRegion,
        spaceName
      )

      // Create scoped key for the bucket (used by Foundry for read/write)
      setActionStep('creating-scoped-key')
      const scopedKey = await doApi.createSpacesKey(
        state.digitalOcean.apiKey,
        `foundry-${spaceName}`,
        spaceName,
        defaultSpacesRegion
      )

      setActionStep('done')
      setSpaces({
        enabled: true,
        credentials: {
          accessKeyId: scopedKey.accessKeyId,
          secretAccessKey: scopedKey.secretAccessKey,
        },
        newSpaceName: spaceName,
        selectedSpace: spaceName,
        selectedRegion: defaultSpacesRegion,
        // Keep temp key for CORS setup during provisioning (deleted after)
        tempKeyId: tempKey.id,
        tempKeyCredentials: {
          accessKeyId: tempKey.accessKeyId,
          secretAccessKey: tempKey.secretAccessKey,
        },
      })

      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create Space')
      setActionStep('idle')
    } finally {
      setActionLoading(false)
    }
  }

  const handleHetznerSetup = async () => {
    if (!accessKeyId || !secretAccessKey || !spaceName) {
      setError('Please fill in all fields')
      return
    }

    setActionLoading(true)
    setError(null)
    setActionStep('validating')

    try {
      const region = selectedStorageRegion || defaultStorageRegion
      // Just validate credentials (CORS is configured during provisioning)
      const valid = await storageProvider.validateCredentials(
        { accessKeyId, secretAccessKey },
        region,
        spaceName
      )

      if (!valid) {
        setError('Could not validate credentials. Please check your access keys and try again.')
        setActionStep('idle')
        return
      }

      setActionStep('done')
      setSpaces({
        enabled: true,
        credentials: { accessKeyId, secretAccessKey },
        newSpaceName: spaceName,
        selectedSpace: spaceName,
        selectedRegion: region,
      })

      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate credentials')
      setActionStep('idle')
    } finally {
      setActionLoading(false)
    }
  }

  // Already configured - show success state
  if (state.spaces.enabled && state.spaces.credentials) {
    const configuredRegion = state.spaces.selectedRegion || defaultSpacesRegion
    const endpoint = storageProvider.getEndpoint(configuredRegion)

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
          <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />
          <div>
            <p className="font-medium text-green-400">{config.bucketLabel} configured successfully</p>
            <p className="text-sm text-slate-400">
              {state.spaces.newSpaceName}.{endpoint}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
          <Shield className="w-6 h-6 text-blue-400 shrink-0" />
          <div>
            <p className="font-medium text-blue-400">Access credentials configured</p>
            <p className="text-sm text-slate-400">
              {provider === 'digitalocean'
                ? 'Your server will only have access to this specific bucket, not your entire Spaces account.'
                : 'Your storage credentials have been validated and saved.'}
            </p>
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="secondary" onClick={() => setSpaces({ enabled: false, credentials: null })}>
            Back
          </Button>
          <Button onClick={onNext}>
            Continue
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold text-white mb-2">
          External Asset Storage
        </h2>
        <p className="text-slate-400">
          {provider === 'digitalocean'
            ? 'Create a Space for your game assets'
            : 'Configure object storage for your game assets'}
        </p>
      </div>

      {/* Storage info */}
      <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <HardDrive className="w-6 h-6 text-blue-400" />
          <div>
            <p className="font-medium text-white">Your server has {diskTotal}GB storage</p>
            <p className="text-sm text-slate-400">~{diskFree}GB free after installation</p>
          </div>
        </div>
      </div>

      {/* DigitalOcean: Automated form */}
      {provider === 'digitalocean' && (
        <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
          <Input
            label="Space Name"
            placeholder="foundry-assets"
            value={spaceName}
            onChange={(e) => handleSpaceNameChange(e.target.value)}
            hint={spaceName ? `https://${spaceName}.${defaultSpacesRegion}.digitaloceanspaces.com` : 'Enter a unique name for your Space (must be globally unique)'}
          />
          <p className="mt-2 text-xs text-slate-500">
            {config.priceInfo}
          </p>
        </div>
      )}

      {/* Hetzner: Manual credential form */}
      {provider === 'hetzner' && (
        <>
          <Alert type="info" title="Manual Setup Required">
            Hetzner Object Storage requires you to create credentials manually in the Hetzner console.
            Follow the steps below to get your access keys.
          </Alert>

          <Collapsible title="How to create Hetzner Object Storage credentials">
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
                <span>Select your project, then go to <strong>Object Storage</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>Create a new bucket (e.g., "foundry-assets") — set visibility to <strong>Public (read-only)</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold">
                  4
                </span>
                <span>Click the <strong>⋯ menu</strong> next to your bucket → <strong>Generate credentials</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold">
                  5
                </span>
                <span><strong>Copy both keys</strong> and paste them below</span>
              </li>
            </ol>
          </Collapsible>

          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 space-y-4">
            <Input
              label="Bucket Name"
              placeholder="foundry-assets"
              value={spaceName}
              onChange={(e) => handleSpaceNameChange(e.target.value)}
              hint="The name of your Hetzner Object Storage bucket"
            />

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Storage Region
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                {storageRegions.map((region) => (
                  <button
                    key={region.slug}
                    type="button"
                    onClick={() => setSelectedStorageRegion(region.slug)}
                    className={`p-2 rounded-lg border text-sm transition-all ${
                      (selectedStorageRegion || defaultStorageRegion) === region.slug
                        ? 'border-red-500 bg-red-500/10 text-white'
                        : 'border-slate-600 bg-slate-900/50 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {region.name}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Access Key ID"
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
            />

            <Input
              label="Secret Access Key"
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              secret
            />

            <p className="text-xs text-slate-500">
              {config.priceInfo}
            </p>
          </div>
        </>
      )}

      {error && <Alert type="error">{error}</Alert>}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack} disabled={actionLoading}>
          Back
        </Button>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleSkip} disabled={actionLoading}>
            Skip
          </Button>
          {provider === 'digitalocean' ? (
            <Button
              onClick={handleCreate}
              disabled={actionLoading || !spaceName || spaceName.length < 3}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {ACTION_LABELS[actionStep] || 'Creating...'}
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Create Space (+$5/mo)
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleHetznerSetup}
              disabled={actionLoading || !spaceName || !accessKeyId || !secretAccessKey}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {ACTION_LABELS[actionStep] || 'Validating...'}
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Configure Storage
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
