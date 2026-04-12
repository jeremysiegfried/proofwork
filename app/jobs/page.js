import JobsList from '@/components/JobsList'
import { Suspense } from 'react'

export const metadata = {
  title: 'Browse Jobs — ShowJob',
  description: 'UK jobs with full salary transparency and employer trust scores.',
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-6 py-20 text-center text-pw-muted text-sm">Loading...</div>}>
      <JobsList />
    </Suspense>
  )
}
