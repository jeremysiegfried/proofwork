// API route that follows an Adzuna redirect URL and returns the final employer URL
// Runs on Vercel's servers = different IP from your home
// Called by the enrichment script locally

export async function POST(request) {
  try {
    var { urls } = await request.json()
    if (!urls || !Array.isArray(urls)) {
      return Response.json({ error: 'Pass { urls: ["..."] }' }, { status: 400 })
    }

    var results = []

    for (var i = 0; i < urls.length; i++) {
      var url = urls[i]
      try {
        var res = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html',
          }
        })

        var finalUrl = res.url

        if (finalUrl && !finalUrl.includes('adzuna') && !finalUrl.includes('suspicious') && finalUrl.startsWith('http')) {
          results.push({ url: url, resolved: finalUrl, ok: true })
        } else {
          // Check for meta redirect in body
          var body = await res.text()
          var match = body.match(/url=["']?(https?:\/\/[^"'\s>]+)/i)
          if (match && !match[1].includes('adzuna')) {
            results.push({ url: url, resolved: match[1], ok: true })
          } else {
            results.push({ url: url, resolved: null, ok: false })
          }
        }
      } catch (err) {
        results.push({ url: url, resolved: null, ok: false, error: err.message })
      }
    }

    return Response.json({ results: results })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
