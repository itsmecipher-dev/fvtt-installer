import { useState, useCallback } from 'react'
import type { WizardState, SSHKeyPair } from '../types'
import type { ProviderId } from '../api/providers/types'

const initialState: WizardState = {
  currentStep: 0,
  provider: 'digitalocean',
  compute: {
    apiKey: '',
    validated: false,
    regions: [],
    sizes: [],
    selectedRegion: '',
    selectedSize: '',
  },
  digitalOcean: {
    apiKey: '',
    validated: false,
    regions: [],
    sizes: [],
    selectedRegion: '',
    selectedSize: 's-1vcpu-1gb',
  },
  cloudflare: {
    apiToken: '',
    validated: false,
    zones: [],
    selectedZone: '',
    subdomain: 'foundry',
  },
  spaces: {
    enabled: false,
    spaces: [],
    selectedSpace: null,
    selectedRegion: null,
    newSpaceName: 'foundry-assets',
    credentials: null,
    tempKeyId: null,
    tempKeyCredentials: null,
  },
  foundry: {
    downloadUrl: '',
    licenseKey: '',
    majorVersion: 13,
  },
  server: {
    name: 'foundry-vtt',
    sshKeyPair: null,
  },
  maintenance: {
    updateHour: 4, // 4:00 UTC default
  },
  provisioning: {
    status: 'idle',
    dropletId: null,
    dropletIp: null,
    logs: [],
  },
}

export function useWizard() {
  const [state, setState] = useState<WizardState>(initialState)

  const nextStep = useCallback(() => {
    setState((s) => ({ ...s, currentStep: s.currentStep + 1 }))
  }, [])

  const prevStep = useCallback(() => {
    setState((s) => ({ ...s, currentStep: Math.max(0, s.currentStep - 1) }))
  }, [])

  const goToStep = useCallback((step: number) => {
    setState((s) => ({ ...s, currentStep: step }))
  }, [])

  const setProvider = useCallback((provider: ProviderId) => {
    setState((s) => ({ ...s, provider }))
  }, [])

  const setCompute = useCallback(
    (updates: Partial<WizardState['compute']>) => {
      setState((s) => ({
        ...s,
        compute: { ...s.compute, ...updates },
      }))
    },
    []
  )

  const setDigitalOcean = useCallback(
    (updates: Partial<WizardState['digitalOcean']>) => {
      setState((s) => ({
        ...s,
        digitalOcean: { ...s.digitalOcean, ...updates },
      }))
    },
    []
  )

  const setCloudflare = useCallback(
    (updates: Partial<WizardState['cloudflare']>) => {
      setState((s) => ({
        ...s,
        cloudflare: { ...s.cloudflare, ...updates },
      }))
    },
    []
  )

  const setFoundry = useCallback(
    (updates: Partial<WizardState['foundry']>) => {
      setState((s) => ({
        ...s,
        foundry: { ...s.foundry, ...updates },
      }))
    },
    []
  )

  const setSpaces = useCallback(
    (updates: Partial<WizardState['spaces']>) => {
      setState((s) => ({
        ...s,
        spaces: { ...s.spaces, ...updates },
      }))
    },
    []
  )

  const setServer = useCallback(
    (updates: Partial<WizardState['server']>) => {
      setState((s) => ({
        ...s,
        server: { ...s.server, ...updates },
      }))
    },
    []
  )

  const setSshKeyPair = useCallback((keyPair: SSHKeyPair) => {
    setState((s) => ({
      ...s,
      server: { ...s.server, sshKeyPair: keyPair },
    }))
  }, [])

  const setProvisioning = useCallback(
    (updates: Partial<WizardState['provisioning']>) => {
      setState((s) => ({
        ...s,
        provisioning: { ...s.provisioning, ...updates },
      }))
    },
    []
  )

  const addLog = useCallback((message: string) => {
    setState((s) => ({
      ...s,
      provisioning: {
        ...s.provisioning,
        logs: [...s.provisioning.logs, `[${new Date().toLocaleTimeString()}] ${message}`],
      },
    }))
  }, [])

  const setMaintenance = useCallback(
    (updates: Partial<WizardState['maintenance']>) => {
      setState((s) => ({
        ...s,
        maintenance: { ...s.maintenance, ...updates },
      }))
    },
    []
  )

  return {
    state,
    nextStep,
    prevStep,
    goToStep,
    setProvider,
    setCompute,
    setDigitalOcean,
    setCloudflare,
    setSpaces,
    setFoundry,
    setServer,
    setSshKeyPair,
    setProvisioning,
    setMaintenance,
    addLog,
  }
}
