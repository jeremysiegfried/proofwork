import Link from 'next/link'

export var metadata = {
  title: 'Privacy Policy — ShowJob',
  description: 'How ShowJob collects, uses, and protects your personal data under UK GDPR.',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <p className="font-mono text-xs text-pw-green uppercase tracking-[3px] mb-3">Legal</p>
      <h1 className="font-display text-3xl font-black tracking-tight mb-2 text-pw-text1">Privacy Policy</h1>
      <p className="text-xs text-pw-muted font-mono mb-8">Last updated: 12 April 2026</p>

      <div className="prose-custom">
        <h2>1. Who We Are</h2>
        <p>ShowJob Ltd ("we", "us") is the data controller for personal data processed through the ShowJob platform (showjob.co.uk). Contact: hello@showjob.co.uk.</p>

        <h2>2. What Data We Collect</h2>

        <h3>Candidates</h3>
        <p>Account data: email address, name, password (hashed). CV data: when you upload your CV, our AI extracts skills, job titles, experience level, education, salary expectations, and location preferences. This parsed data is stored in our database. Assessment data: your responses to skill assessments, scores, behavioural signals (keystroke patterns, paste events, tab switches), and AI detection results. Application data: cover notes, contact details, and application status.</p>

        <h3>Employers</h3>
        <p>Account data: work email, name, job title. Company data: benefits, progression pathways, satisfaction scores, website, careers URL. Payment data: processed by Stripe — we do not store card details.</p>

        <h3>All Users</h3>
        <p>Usage data: pages visited, search queries, device type, IP address, browser. Cookies: essential cookies only (authentication). We do not use advertising or tracking cookies.</p>

        <h2>3. How We Use Your Data</h2>
        <p>We process your data for the following purposes and legal bases:</p>
        <p><strong>Contract performance:</strong> providing the Platform, matching candidates to jobs, processing applications, grading assessments, managing subscriptions.</p>
        <p><strong>Legitimate interest:</strong> improving the Platform, calculating transparency scores, detecting fraudulent assessment submissions, generating aggregated salary statistics, preventing abuse.</p>
        <p><strong>Consent:</strong> sending marketing emails (only with explicit opt-in).</p>

        <h2>4. AI Processing</h2>
        <p>We use AI (Claude by Anthropic) to: parse CVs and extract structured data; generate and grade skill assessments; detect AI-assisted assessment responses; match candidates to jobs. AI decisions that significantly affect you (such as assessment scores) include human-reviewable outputs and are not fully automated. You have the right to contest AI-generated scores by contacting us.</p>

        <h2>5. Who We Share Data With</h2>
        <p><strong>Employers:</strong> when you apply for a job, the employer sees your name, email, parsed CV data, assessment scores, and application details. Employers cannot see your data until you apply.</p>
        <p><strong>Service providers:</strong> Supabase (database hosting, EU), Vercel (website hosting, US — with EU data processing), Anthropic (AI processing, US — data not used for training), Stripe (payments, PCI compliant), Resend (email delivery).</p>
        <p><strong>Aggregated data:</strong> salary statistics on our /salaries pages use anonymised, aggregated data that cannot identify individuals.</p>
        <p>We do not sell your personal data to third parties.</p>

        <h2>6. Data Retention</h2>
        <p>Account data: retained until you delete your account. CV data: retained until you delete or update it. Assessment data: retained for 2 years after completion. Application data: retained for 2 years after the application. Payment records: retained for 7 years (legal requirement). Usage logs: retained for 90 days.</p>

        <h2>7. Your Rights (UK GDPR)</h2>
        <p>You have the right to:</p>
        <p><strong>Access</strong> your personal data — request a copy of all data we hold about you. <strong>Rectification</strong> — correct inaccurate data. <strong>Erasure</strong> — request deletion of your data ("right to be forgotten"). <strong>Restriction</strong> — limit how we process your data. <strong>Portability</strong> — receive your data in a machine-readable format. <strong>Object</strong> — object to processing based on legitimate interest. <strong>Withdraw consent</strong> — where processing is based on consent.</p>
        <p>To exercise any right, email hello@showjob.co.uk. We will respond within 30 days.</p>

        <h2>8. Data Security</h2>
        <p>We implement appropriate technical and organisational measures including: encrypted connections (HTTPS/TLS); hashed passwords; row-level security on database tables; secure API key management; access controls limiting who can view candidate data.</p>

        <h2>9. International Transfers</h2>
        <p>Some of our service providers process data outside the UK. We ensure adequate safeguards through: Standard Contractual Clauses (SCCs); UK adequacy decisions; processor agreements with appropriate data protection commitments.</p>

        <h2>10. Cookies</h2>
        <p>We use only essential cookies required for authentication and session management. We do not use advertising cookies, analytics cookies, or third-party tracking. No cookie consent banner is required for essential-only cookies under UK PECR, but we disclose their use here for transparency.</p>

        <h2>11. Children</h2>
        <p>The Platform is not directed at children under 16. We do not knowingly collect data from anyone under 16. If we become aware of such data, we will delete it promptly.</p>

        <h2>12. Changes</h2>
        <p>We may update this policy. Material changes will be communicated via email. The "last updated" date above reflects the latest revision.</p>

        <h2>13. Complaints</h2>
        <p>If you are unsatisfied with how we handle your data, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk.</p>

        <h2>14. Contact</h2>
        <p>Data Controller: ShowJob Ltd. Email: hello@showjob.co.uk.</p>
      </div>
    </div>
  )
}
