// Patch the job detail page to use AssessmentCTA component
// Run: node scripts/patch-job-detail.mjs

import { readFileSync, writeFileSync } from 'fs'

var filePath = 'app/jobs/[slug]/page.js'
var content = readFileSync(filePath, 'utf8')

// Add import if not already there
if (!content.includes('AssessmentCTA')) {
  content = content.replace(
    "import { notFound } from 'next/navigation'",
    "import { notFound } from 'next/navigation'\nimport AssessmentCTA from '@/components/AssessmentCTA'"
  )
}

// Replace the hardcoded assessment section with the component
var oldSection = `          {/* Skill Assessment CTA */}
          <div className="mt-3 bg-pw-card border border-pw-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚡</span>
              <div className="text-sm font-bold text-pw-text1">Skill Assessment</div>
            </div>
            <p className="text-xs text-pw-text2 leading-relaxed mb-3">
              Stand out from other applicants. Complete a timed skill challenge tailored to this role and get a verified score.
            </p>
            <Link href={'/assessment/' + job.id} className="block w-full py-2.5 rounded-lg border-2 border-pw-green text-pw-green font-bold text-sm text-center hover:bg-pw-greenDark transition-all">
              Take assessment →
            </Link>
          </div>`

var newSection = `          {/* Skill Assessment - only for claimed companies with assessments enabled */}
          <AssessmentCTA job={job} company={company} />`

if (content.includes(oldSection)) {
  content = content.replace(oldSection, newSection)
  writeFileSync(filePath, content)
  console.log('✓ Patched ' + filePath)
  console.log('  - Added AssessmentCTA import')
  console.log('  - Replaced hardcoded assessment section with component')
} else {
  console.log('⚠ Could not find the assessment section to replace.')
  console.log('  The file may have already been patched or has different formatting.')
  console.log('  Check app/jobs/[slug]/page.js manually.')
}
