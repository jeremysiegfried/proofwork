export async function POST(request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('Resend not configured — skipping email')
      return Response.json({ skipped: true })
    }

    var { to, subject, html, type } = await request.json()

    if (!to || !subject) {
      return Response.json({ error: 'Missing to or subject' }, { status: 400 })
    }

    var fromEmail = process.env.RESEND_FROM_EMAIL || 'ShowJob <notifications@showjob.co.uk>'

    var response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: to,
        subject: subject,
        html: html,
      })
    })

    if (!response.ok) {
      var errText = await response.text()
      console.error('Resend error:', errText)
      return Response.json({ error: 'Email failed' }, { status: 500 })
    }

    var data = await response.json()
    return Response.json({ sent: true, id: data.id })

  } catch (err) {
    console.error('Notify error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// Email templates
export function buildApplicationEmail(candidateName, jobTitle, companyName, dashboardUrl) {
  return {
    subject: 'New application: ' + candidateName + ' applied for ' + jobTitle,
    html: '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1A1A1A;">' +
      '<div style="border-bottom:3px solid #16A34A;padding-bottom:15px;margin-bottom:20px;">' +
      '<span style="font-size:20px;font-weight:900;">show<span style="color:#16A34A;">job</span></span>' +
      '</div>' +
      '<h2 style="margin:0 0 10px;">New application received</h2>' +
      '<p style="color:#6B6560;margin:0 0 20px;">' + candidateName + ' has applied for <strong>' + jobTitle + '</strong> at ' + companyName + '.</p>' +
      '<div style="background:#F5F5F0;border:1px solid #E8E4DE;border-radius:8px;padding:15px;margin-bottom:20px;">' +
      '<p style="margin:0 0 5px;font-size:14px;"><strong>Candidate:</strong> ' + candidateName + '</p>' +
      '<p style="margin:0 0 5px;font-size:14px;"><strong>Role:</strong> ' + jobTitle + '</p>' +
      '<p style="margin:0;font-size:14px;"><strong>Status:</strong> New — awaiting review</p>' +
      '</div>' +
      '<a href="' + dashboardUrl + '" style="display:inline-block;background:#16A34A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">View in dashboard →</a>' +
      '<p style="color:#999;font-size:12px;margin-top:30px;">You received this because you are an employer on ShowJob.</p>' +
      '</body></html>'
  }
}

export function buildStatusUpdateEmail(candidateName, jobTitle, companyName, status, jobUrl) {
  var statusMessages = {
    reviewing: 'Your application is being reviewed by ' + companyName + '.',
    interview: 'Great news! ' + companyName + ' wants to interview you for this role.',
    offer: 'Congratulations! ' + companyName + ' has sent you an offer!',
    rejected: companyName + ' has decided not to progress your application at this time.',
  }

  var message = statusMessages[status] || 'Your application status has been updated.'

  return {
    subject: jobTitle + ' at ' + companyName + ' — ' + (status === 'interview' ? 'Interview invitation!' : status === 'offer' ? 'You got an offer!' : 'Application update'),
    html: '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1A1A1A;">' +
      '<div style="border-bottom:3px solid #16A34A;padding-bottom:15px;margin-bottom:20px;">' +
      '<span style="font-size:20px;font-weight:900;">show<span style="color:#16A34A;">job</span></span>' +
      '</div>' +
      '<h2 style="margin:0 0 10px;">Application update</h2>' +
      '<p style="color:#6B6560;margin:0 0 5px;">Hi ' + candidateName + ',</p>' +
      '<p style="color:#6B6560;margin:0 0 20px;">' + message + '</p>' +
      '<div style="background:#F5F5F0;border:1px solid #E8E4DE;border-radius:8px;padding:15px;margin-bottom:20px;">' +
      '<p style="margin:0 0 5px;font-size:14px;"><strong>Role:</strong> ' + jobTitle + '</p>' +
      '<p style="margin:0 0 5px;font-size:14px;"><strong>Company:</strong> ' + companyName + '</p>' +
      '<p style="margin:0;font-size:14px;"><strong>Status:</strong> ' + status.charAt(0).toUpperCase() + status.slice(1) + '</p>' +
      '</div>' +
      '<a href="' + jobUrl + '" style="display:inline-block;background:#16A34A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">View job listing →</a>' +
      '<p style="color:#999;font-size:12px;margin-top:30px;">You received this because you applied for a job on ShowJob.</p>' +
      '</body></html>'
  }
}
