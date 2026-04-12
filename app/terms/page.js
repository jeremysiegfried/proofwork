import Link from 'next/link'

export var metadata = {
  title: 'Terms of Service — ShowJob',
  description: 'Terms of service for ShowJob, the UK transparency-first job platform.',
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <p className="font-mono text-xs text-pw-green uppercase tracking-[3px] mb-3">Legal</p>
      <h1 className="font-display text-3xl font-black tracking-tight mb-2 text-pw-text1">Terms of Service</h1>
      <p className="text-xs text-pw-muted font-mono mb-8">Last updated: 12 April 2026</p>

      <div className="prose-custom">
        <h2>1. About ShowJob</h2>
        <p>ShowJob ("we", "us", "our") is a UK-based job platform operated by ShowJob Ltd. Our website at showjob.co.uk and proofwork-nine.vercel.app (the "Platform") connects job seekers with employers through transparency-scored job listings, skill assessments, and CV matching.</p>
        <p>By accessing or using the Platform, you agree to these Terms of Service ("Terms"). If you do not agree, do not use the Platform.</p>

        <h2>2. Eligibility</h2>
        <p>You must be at least 16 years old to use the Platform. By creating an account, you confirm you meet this requirement and that the information you provide is accurate.</p>

        <h2>3. User Accounts</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorised use. We reserve the right to suspend or terminate accounts that violate these Terms.</p>

        <h2>4. Candidate Terms</h2>
        <p>As a candidate, you may upload your CV, complete skill assessments, and apply for jobs through the Platform. By doing so, you agree that:</p>
        <p>Your CV data will be parsed by AI to extract skills, experience, and preferences. This parsed data may be shared with employers you apply to. Skill assessment scores are visible to employers for roles you apply to. You will not submit fraudulent, misleading, or AI-generated assessment responses with intent to deceive. We may flag or penalise submissions detected as AI-generated.</p>

        <h2>5. Employer Terms</h2>
        <p>As an employer, you may claim company profiles, post jobs, and review candidate applications. By doing so, you agree that:</p>
        <p>You have the authority to act on behalf of the company you claim. The information you provide (salary, benefits, culture data) is accurate and not misleading. You will handle candidate data in accordance with UK GDPR and data protection laws. You will not use candidate data obtained through ShowJob for purposes other than recruitment for the listed roles.</p>

        <h2>6. Job Listings</h2>
        <p>Many job listings on ShowJob are aggregated from third-party sources including the Adzuna API. We do not guarantee the accuracy, completeness, or availability of these listings. "Apply" links may redirect to external websites. Salary estimates marked as "estimated" are calculated from market data and may not reflect the actual salary offered. Transparency scores are calculated algorithmically and represent data disclosure, not employer quality.</p>

        <h2>7. Skill Assessments</h2>
        <p>Skill assessments are generated and graded by AI (Claude by Anthropic). Scores are indicative of performance on a specific challenge and should not be interpreted as a comprehensive measure of professional competence. We employ behavioural tracking and verification questions to detect AI-assisted responses. Candidates found to have used AI tools to complete assessments may have their scores adjusted. Each candidate gets one attempt per job assessment.</p>

        <h2>8. Payments and Subscriptions</h2>
        <p>Employer subscriptions are billed monthly through Stripe. Prices are in GBP and exclusive of VAT where applicable. You may cancel at any time — cancellation takes effect at the end of the current billing period. No refunds are provided for partial months. We reserve the right to change pricing with 30 days' notice.</p>

        <h2>9. Data and Privacy</h2>
        <p>We process personal data in accordance with UK GDPR. See our <a href="/privacy">Privacy Policy</a> for full details on how we collect, use, and protect your data.</p>

        <h2>10. Intellectual Property</h2>
        <p>All content, design, and code on the Platform is owned by ShowJob Ltd unless otherwise stated. Job listing content may be owned by the respective employers or sourced from third-party aggregators. You may not scrape, copy, or redistribute Platform content without written permission.</p>

        <h2>11. Limitation of Liability</h2>
        <p>The Platform is provided "as is" without warranties of any kind. We are not liable for: the outcome of any job application; the accuracy of employer-provided data or AI-generated assessments; any loss arising from use of the Platform; actions taken by employers or candidates outside the Platform. Our maximum liability to you is limited to the fees you have paid us in the 12 months preceding the claim.</p>

        <h2>12. Prohibited Conduct</h2>
        <p>You agree not to: use the Platform for any unlawful purpose; submit false or misleading information; attempt to circumvent our AI detection systems; scrape or harvest data from the Platform; interfere with the Platform's security or infrastructure; create multiple accounts to abuse assessment limits.</p>

        <h2>13. Changes to Terms</h2>
        <p>We may update these Terms at any time. Material changes will be communicated via email or Platform notification. Continued use after changes constitutes acceptance.</p>

        <h2>14. Governing Law</h2>
        <p>These Terms are governed by the laws of England and Wales. Disputes shall be subject to the exclusive jurisdiction of the English courts.</p>

        <h2>15. Contact</h2>
        <p>For questions about these Terms, contact us at hello@showjob.co.uk.</p>
      </div>
    </div>
  )
}
