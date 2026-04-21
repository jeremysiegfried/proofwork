import { createClient } from '@supabase/supabase-js'

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    // Simple auth check
    var authHeader = request.headers.get('authorization')
    var cronSecret = process.env.CRON_SECRET || 'showjob-cron-2026'
    if (authHeader !== 'Bearer ' + cronSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    var body = await request.json()
    var frequency = body.frequency || 'weekly' // 'daily' or 'weekly'

    // Get active alerts for this frequency
    var { data: alerts } = await supabase
      .from('job_alerts')
      .select('*')
      .eq('active', true)
      .eq('frequency', frequency)

    if (!alerts || alerts.length === 0) {
      return Response.json({ sent: 0, message: 'No alerts to send' })
    }

    var RESEND_KEY = process.env.RESEND_API_KEY
    if (!RESEND_KEY) {
      return Response.json({ error: 'RESEND_API_KEY not configured', alertCount: alerts.length }, { status: 500 })
    }

    var sent = 0
    var failed = 0
    var siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://proofwork-nine.vercel.app'

    for (var i = 0; i < alerts.length; i++) {
      var alert = alerts[i]

      try {
        // Find matching jobs posted since last sent
        var since = alert.last_sent_at || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        
        var q = supabase
          .from('jobs')
          .select('title, slug, location, salary_min, salary_max, remote_policy, companies(name)')
          .eq('active', true)
          .gte('created_at', since)
          .order('trust_score', { ascending: false })
          .limit(10)

        if (alert.query) {
          var words = alert.query.split(/\s+/)
          var clauses = words.map(function(w) { return 'title.ilike.%' + w + '%' }).join(',')
          q = q.or(clauses)
        }

        if (alert.region && alert.region !== 'All') {
          if (alert.region === 'Remote') q = q.ilike('remote_policy', '%Remote%')
          else q = q.ilike('location', '%' + alert.region + '%')
        }

        if (alert.min_salary > 0) q = q.gte('salary_min', alert.min_salary)

        if (alert.remote_filter) {
          q = q.eq('remote_policy', alert.remote_filter)
        }

        if (alert.industry) {
          var indWords = alert.industry.split(',').slice(0, 3)
          var indClauses = indWords.map(function(w) { return 'title.ilike.%' + w.trim() + '%' }).join(',')
          q = q.or(indClauses)
        }

        var { data: jobs } = await q

        if (!jobs || jobs.length === 0) continue // No new jobs, skip

        // Build email HTML
        var jobListHtml = jobs.map(function(job) {
          var salary = job.salary_min > 0 ? '£' + Math.round(job.salary_min/1000) + 'k–£' + Math.round(job.salary_max/1000) + 'k' : ''
          return '<tr><td style="padding:12px 0;border-bottom:1px solid #E8E4DE;">' +
            '<a href="' + siteUrl + '/jobs/' + job.slug + '" style="color:#1a1a1a;text-decoration:none;font-weight:600;font-size:15px;">' + job.title + '</a>' +
            '<br><span style="color:#888;font-size:13px;">' + (job.companies?.name || '') + ' · ' + job.location +
            (salary ? ' · ' + salary : '') +
            (job.remote_policy !== 'On-site' ? ' · ' + job.remote_policy : '') +
            '</span></td></tr>'
        }).join('')

        var description = []
        if (alert.query) description.push('"' + alert.query + '"')
        if (alert.region !== 'All') description.push('in ' + alert.region)

        var emailHtml = '<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#FEFCF8;">' +
          '<div style="text-align:center;margin-bottom:24px;">' +
          '<span style="font-size:24px;font-weight:900;letter-spacing:-1px;color:#1a1a1a;">Show<span style="color:#C8E972;">Job</span></span>' +
          '</div>' +
          '<h2 style="font-size:18px;margin:0 0 4px;">New jobs ' + (description.length > 0 ? description.join(' ') : 'for you') + '</h2>' +
          '<p style="color:#888;font-size:13px;margin:0 0 20px;">' + jobs.length + ' new ' + (frequency === 'daily' ? 'today' : 'this week') + '</p>' +
          '<table style="width:100%;">' + jobListHtml + '</table>' +
          '<div style="margin-top:24px;text-align:center;">' +
          '<a href="' + siteUrl + '/jobs?q=' + encodeURIComponent(alert.query || '') + '&region=' + encodeURIComponent(alert.region || 'All') + '" ' +
          'style="display:inline-block;padding:12px 32px;background:#C8E972;color:#1a1a1a;font-weight:700;border-radius:8px;text-decoration:none;font-size:14px;">View all jobs</a>' +
          '</div>' +
          '<div style="margin-top:32px;padding-top:16px;border-top:1px solid #E8E4DE;text-align:center;">' +
          '<a href="' + siteUrl + '/unsubscribe?id=' + alert.id + '" style="color:#888;font-size:11px;">Unsubscribe from this alert</a>' +
          '</div>' +
          '</body></html>'

        // Send via Resend
        var emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + RESEND_KEY
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'alerts@showjob.co.uk',
            to: alert.email,
            subject: (jobs.length + ' new ' + (alert.query || 'jobs') + ' ' + (alert.region !== 'All' ? 'in ' + alert.region : 'on ShowJob')),
            html: emailHtml
          })
        })

        if (emailRes.ok) {
          await supabase.from('job_alerts').update({ last_sent_at: new Date().toISOString() }).eq('id', alert.id)
          sent++
        } else {
          failed++
        }
      } catch (err) {
        failed++
      }
    }

    return Response.json({ sent: sent, failed: failed, total: alerts.length })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
