import { createClient } from '@supabase/supabase-js'

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    var body = await request.json()
    var { email, query, region, industry, min_salary, remote_filter, frequency } = body

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Valid email required' }, { status: 400 })
    }

    // Check for duplicate
    var { data: existing } = await supabase
      .from('job_alerts')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('query', query || '')
      .eq('region', region || 'All')
      .eq('active', true)
      .single()

    if (existing) {
      return Response.json({ error: 'You already have this alert set up' }, { status: 409 })
    }

    var { data, error } = await supabase.from('job_alerts').insert({
      email: email.toLowerCase(),
      query: query || '',
      region: region || 'All',
      industry: industry || '',
      min_salary: min_salary || 0,
      remote_filter: remote_filter || '',
      frequency: frequency || 'weekly',
      active: true,
    }).select().single()

    if (error) throw error

    return Response.json({ ok: true, id: data.id })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
