interface FoundryLicense {
  key: string
  name: string
  purchaseDate: string
}

interface FoundryAuthResult {
  success: boolean
  error?: string
  licenses?: FoundryLicense[]
  username?: string
}

interface FoundryDownloadResult {
  success: boolean
  error?: string
  url?: string
  lifetime?: number
}

export async function handleFoundryAuth(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405)
  }

  const { username, password } = await request.json() as { username: string; password: string }

  if (!username || !password) {
    return json({ success: false, error: 'Username and password required' }, 400)
  }

  try {
    const result = await loginAndGetLicenses(username, password)
    return json(result)
  } catch (err) {
    return json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }, 500)
  }
}

export async function handleFoundryDownload(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405)
  }

  const { username, password, build, platform } = await request.json() as {
    username: string
    password: string
    build: string
    platform: string
  }

  if (!username || !password) {
    return json({ success: false, error: 'Username and password required' }, 400)
  }

  if (!build || !platform) {
    return json({ success: false, error: 'Build and platform required' }, 400)
  }

  try {
    const result = await loginAndGetDownloadUrl(username, password, build, platform)
    return json(result)
  } catch (err) {
    return json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }, 500)
  }
}

async function loginAndGetLicenses(username: string, password: string): Promise<FoundryAuthResult> {
  // Step 1: Get the login page to obtain CSRF token
  const loginPageRes = await fetch('https://foundryvtt.com/auth/login/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  })

  const loginPageHtml = await loginPageRes.text()
  const csrfMatch = loginPageHtml.match(/name="csrfmiddlewaretoken" value="([^"]+)"/)
  if (!csrfMatch) {
    return { success: false, error: 'Could not obtain CSRF token' }
  }
  const csrfToken = csrfMatch[1]

  // Get cookies from login page
  const cookies = loginPageRes.headers.getSetCookie?.() || []
  const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ')

  // Step 2: Submit login form
  const formData = new URLSearchParams()
  formData.append('csrfmiddlewaretoken', csrfToken)
  formData.append('username', username)
  formData.append('password', password)
  formData.append('next', '/me/licenses')

  const loginRes = await fetch('https://foundryvtt.com/auth/login/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://foundryvtt.com/auth/login/',
    },
    body: formData.toString(),
    redirect: 'manual',
  })

  // Check for redirect (successful login)
  if (loginRes.status !== 302) {
    return { success: false, error: 'Login failed. Check your username and password.' }
  }

  // Get session cookies
  const sessionCookies = loginRes.headers.getSetCookie?.() || []
  const allCookies = [...cookies, ...sessionCookies].map(c => c.split(';')[0]).join('; ')

  // Step 3: Fetch licenses page
  const licensesRes = await fetch('https://foundryvtt.com/me/licenses', {
    headers: {
      'Cookie': allCookies,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    redirect: 'follow',
  })

  if (!licensesRes.ok) {
    return { success: false, error: 'Could not access licenses page' }
  }

  const licensesHtml = await licensesRes.text()

  // Parse licenses from HTML
  const licenses: FoundryLicense[] = []
  const licenseRegex = /<div class="license" data-key="([^"]+)"[\s\S]*?<input[^>]*value="([^"]+)"[^>]*readonly[\s\S]*?<span class="value">([^<]*)<\/span>[\s\S]*?<label>Purchase Date:<\/label>\s*([^<]+)/g

  let match
  while ((match = licenseRegex.exec(licensesHtml)) !== null) {
    licenses.push({
      key: match[2], // The formatted key (XXXX-XXXX-...)
      name: match[3].trim() || 'Unnamed',
      purchaseDate: match[4].trim(),
    })
  }

  if (licenses.length === 0) {
    return { success: false, error: 'No licenses found on your account' }
  }

  // Extract username from page
  const usernameMatch = licensesHtml.match(/<h3 class="user-name">([^<]+)<\/h3>/)

  return {
    success: true,
    licenses,
    username: usernameMatch?.[1] || username,
  }
}

async function loginAndGetDownloadUrl(
  username: string,
  password: string,
  build: string,
  platform: string
): Promise<FoundryDownloadResult> {
  // Step 1: Get the login page to obtain CSRF token
  const loginPageRes = await fetch('https://foundryvtt.com/auth/login/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  })

  const loginPageHtml = await loginPageRes.text()
  const csrfMatch = loginPageHtml.match(/name="csrfmiddlewaretoken" value="([^"]+)"/)
  if (!csrfMatch) {
    return { success: false, error: 'Could not obtain CSRF token' }
  }
  const csrfToken = csrfMatch[1]

  const cookies = loginPageRes.headers.getSetCookie?.() || []
  const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ')

  // Step 2: Submit login form
  const formData = new URLSearchParams()
  formData.append('csrfmiddlewaretoken', csrfToken)
  formData.append('username', username)
  formData.append('password', password)
  formData.append('next', '/')

  const loginRes = await fetch('https://foundryvtt.com/auth/login/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://foundryvtt.com/auth/login/',
    },
    body: formData.toString(),
    redirect: 'manual',
  })

  if (loginRes.status !== 302) {
    return { success: false, error: 'Login failed. Check your username and password.' }
  }

  const sessionCookies = loginRes.headers.getSetCookie?.() || []
  const allCookies = [...cookies, ...sessionCookies].map(c => c.split(';')[0]).join('; ')

  // Step 3: Get timed download URL
  const downloadRes = await fetch(
    `https://foundryvtt.com/releases/download?build=${build}&platform=${platform}&response_type=json`,
    {
      headers: {
        'Cookie': allCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    }
  )

  if (!downloadRes.ok) {
    const errorData = await downloadRes.json().catch(() => ({})) as { error?: string }
    return { success: false, error: errorData.error || 'Could not get download URL' }
  }

  const downloadData = await downloadRes.json() as { url: string; lifetime: number }

  return {
    success: true,
    url: downloadData.url,
    lifetime: downloadData.lifetime,
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
