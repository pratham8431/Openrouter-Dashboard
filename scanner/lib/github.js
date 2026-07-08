// Thin GitHub REST client: code search + file content, with backoff on rate limits.

const GITHUB_API = 'https://api.github.com'

function authHeaders(token) {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${token}`,
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function githubRequest(url, token, attempt = 0) {
  const res = await fetch(url, { headers: authHeaders(token) })

  if ((res.status === 403 || res.status === 429) && attempt < 3) {
    const retryAfter = Number(res.headers.get('retry-after'))
    const resetAt = Number(res.headers.get('x-ratelimit-reset'))
    const waitMs = retryAfter
      ? retryAfter * 1000
      : resetAt
        ? Math.max(0, resetAt * 1000 - Date.now()) + 1000
        : 60_000
    console.log(`  rate limited — waiting ${Math.round(waitMs / 1000)}s before retrying...`)
    await sleep(waitMs)
    return githubRequest(url, token, attempt + 1)
  }

  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${url}`)
  return res.json()
}

// Code search is far more rate-limited than the rest of the API (roughly
// 10 requests/min even with a token) — always pace requests between pages.
export async function searchCode(query, token, maxResults = 100) {
  const perPage = 100
  const pages = Math.ceil(maxResults / perPage)
  const items = []

  for (let page = 1; page <= pages; page++) {
    const url = `${GITHUB_API}/search/code?q=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`
    const data = await githubRequest(url, token)
    items.push(...(data.items ?? []))
    if (!data.items || data.items.length < perPage) break
    if (page < pages) await sleep(2500)
  }

  return items.slice(0, maxResults)
}

export async function fetchFileContent(item, token) {
  const data = await githubRequest(item.url, token)
  if (data.encoding === 'base64' && data.content) {
    return Buffer.from(data.content, 'base64').toString('utf8')
  }
  // Large files omit inline content — fall back to the raw download URL.
  if (data.download_url) {
    const res = await fetch(data.download_url)
    if (res.ok) return res.text()
  }
  return null
}
