import type { SSHKeyPair } from '../types'

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function arrayBufferToPem(buffer: ArrayBuffer, type: 'PUBLIC' | 'PRIVATE'): string {
  const base64 = arrayBufferToBase64(buffer)
  const lines = base64.match(/.{1,64}/g) || []
  return `-----BEGIN ${type} KEY-----\n${lines.join('\n')}\n-----END ${type} KEY-----`
}

async function getPublicKeyFingerprint(publicKeyBuffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', publicKeyBuffer)
  const hashArray = new Uint8Array(hashBuffer)
  const hashHex = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(':')
  return `SHA256:${hashHex}`
}

function parseAsn1Length(bytes: Uint8Array, offset: number): { length: number; bytesRead: number } {
  const firstByte = bytes[offset]
  if (firstByte < 0x80) {
    return { length: firstByte, bytesRead: 1 }
  }
  const numBytes = firstByte & 0x7f
  let length = 0
  for (let i = 0; i < numBytes; i++) {
    length = (length << 8) | bytes[offset + 1 + i]
  }
  return { length, bytesRead: 1 + numBytes }
}

function extractRsaComponents(spkiBuffer: ArrayBuffer): { modulus: Uint8Array; exponent: Uint8Array } {
  const bytes = new Uint8Array(spkiBuffer)

  // SPKI structure:
  // SEQUENCE {
  //   SEQUENCE { algorithm OID, parameters }
  //   BIT STRING { public key data }
  // }

  let offset = 0

  // Skip outer SEQUENCE tag and length
  if (bytes[offset] !== 0x30) throw new Error('Expected SEQUENCE')
  offset++
  const outerLen = parseAsn1Length(bytes, offset)
  offset += outerLen.bytesRead

  // Skip algorithm SEQUENCE
  if (bytes[offset] !== 0x30) throw new Error('Expected algorithm SEQUENCE')
  offset++
  const algoLen = parseAsn1Length(bytes, offset)
  offset += algoLen.bytesRead + algoLen.length

  // BIT STRING containing the RSA public key
  if (bytes[offset] !== 0x03) throw new Error('Expected BIT STRING')
  offset++
  const bitStringLen = parseAsn1Length(bytes, offset)
  offset += bitStringLen.bytesRead

  // Skip the "unused bits" byte in BIT STRING
  offset++

  // Now we have the RSAPublicKey SEQUENCE
  if (bytes[offset] !== 0x30) throw new Error('Expected RSAPublicKey SEQUENCE')
  offset++
  const rsaKeyLen = parseAsn1Length(bytes, offset)
  offset += rsaKeyLen.bytesRead

  // Extract modulus (INTEGER)
  if (bytes[offset] !== 0x02) throw new Error('Expected modulus INTEGER')
  offset++
  const modLen = parseAsn1Length(bytes, offset)
  offset += modLen.bytesRead
  let modulus = bytes.slice(offset, offset + modLen.length)
  offset += modLen.length

  // Extract exponent (INTEGER)
  if (bytes[offset] !== 0x02) throw new Error('Expected exponent INTEGER')
  offset++
  const expLen = parseAsn1Length(bytes, offset)
  offset += expLen.bytesRead
  let exponent = bytes.slice(offset, offset + expLen.length)

  // Strip leading zeros (but keep one if high bit is set)
  while (modulus.length > 1 && modulus[0] === 0 && !(modulus[1] & 0x80)) {
    modulus = modulus.slice(1)
  }
  while (exponent.length > 1 && exponent[0] === 0) {
    exponent = exponent.slice(1)
  }

  // Add leading zero if high bit is set (for SSH format)
  if (modulus[0] & 0x80) {
    const padded = new Uint8Array(modulus.length + 1)
    padded[0] = 0
    padded.set(modulus, 1)
    modulus = padded
  }

  return { modulus, exponent }
}

function publicKeyToOpenSSH(spkiBuffer: ArrayBuffer): string {
  const { modulus, exponent } = extractRsaComponents(spkiBuffer)

  const encodeLength = (len: number): Uint8Array => {
    const buf = new ArrayBuffer(4)
    new DataView(buf).setUint32(0, len)
    return new Uint8Array(buf)
  }

  const keyType = new TextEncoder().encode('ssh-rsa')
  const keyTypeLen = encodeLength(keyType.length)
  const expLen = encodeLength(exponent.length)
  const modLen = encodeLength(modulus.length)

  const blob = new Uint8Array(
    keyTypeLen.length + keyType.length +
    expLen.length + exponent.length +
    modLen.length + modulus.length
  )
  let pos = 0
  blob.set(keyTypeLen, pos); pos += keyTypeLen.length
  blob.set(keyType, pos); pos += keyType.length
  blob.set(expLen, pos); pos += expLen.length
  blob.set(exponent, pos); pos += exponent.length
  blob.set(modLen, pos); pos += modLen.length
  blob.set(modulus, pos)

  return `ssh-rsa ${arrayBufferToBase64(blob.buffer)} foundry-installer`
}

export async function generateSSHKeyPair(): Promise<SSHKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  )

  const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey)
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)

  const publicKeyOpenSSH = publicKeyToOpenSSH(publicKeyBuffer)
  const privateKeyPem = arrayBufferToPem(privateKeyBuffer, 'PRIVATE')
  const fingerprint = await getPublicKeyFingerprint(publicKeyBuffer)

  return {
    publicKey: publicKeyOpenSSH,
    privateKey: privateKeyPem,
    fingerprint,
  }
}

export function downloadPrivateKey(privateKey: string, filename: string): void {
  const blob = new Blob([privateKey], { type: 'application/x-pem-file' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
