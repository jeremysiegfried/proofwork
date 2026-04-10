-- ProofWork Database Schema
-- Run this in Supabase SQL Editor

-- Companies table
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_emoji TEXT DEFAULT '',
  website TEXT DEFAULT '',
  careers_url TEXT DEFAULT '',
  employee_count TEXT DEFAULT '',
  founded TEXT DEFAULT '',
  funding TEXT DEFAULT '',
  glassdoor_rating NUMERIC(2,1) DEFAULT 0,
  tech_stack TEXT[] DEFAULT '{}',
  claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMPTZ,
  claimed_by TEXT DEFAULT '',
  benefits TEXT[] DEFAULT '{}',
  progression TEXT DEFAULT '',
  satisfaction NUMERIC(2,1) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Jobs table
CREATE TABLE jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  location TEXT DEFAULT '',
  remote_policy TEXT DEFAULT 'On-site',
  job_type TEXT DEFAULT 'Full-time',
  salary_min INTEGER DEFAULT 0,
  salary_max INTEGER DEFAULT 0,
  salary_estimated TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  requirements TEXT[] DEFAULT '{}',
  trust_score INTEGER DEFAULT 0,
  has_challenge BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'scraped',
  source_url TEXT DEFAULT '',
  posted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, slug)
);

-- Applications table (for later)
CREATE TABLE applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  linkedin TEXT DEFAULT '',
  cv_url TEXT DEFAULT '',
  notice_period TEXT DEFAULT '',
  right_to_work TEXT DEFAULT '',
  cover_note TEXT DEFAULT '',
  challenge_score INTEGER DEFAULT 0,
  experience_score INTEGER DEFAULT 0,
  combined_score INTEGER DEFAULT 0,
  ai_trust TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Public read access for companies and jobs
CREATE POLICY "Public can read companies" ON companies FOR SELECT USING (true);
CREATE POLICY "Public can read active jobs" ON jobs FOR SELECT USING (active = true);
CREATE POLICY "Anyone can insert applications" ON applications FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_jobs_company ON jobs(company_id);
CREATE INDEX idx_jobs_active ON jobs(active) WHERE active = true;
CREATE INDEX idx_jobs_trust ON jobs(trust_score DESC);
CREATE INDEX idx_jobs_salary ON jobs(salary_min DESC);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_claimed ON companies(claimed);

-- Function to calculate trust score
CREATE OR REPLACE FUNCTION calculate_trust_score(
  has_salary BOOLEAN,
  has_benefits BOOLEAN,
  has_progression BOOLEAN,
  has_satisfaction BOOLEAN,
  has_challenge BOOLEAN
) RETURNS INTEGER AS $$
BEGIN
  RETURN
    (CASE WHEN has_salary THEN 30 ELSE 0 END) +
    (CASE WHEN has_benefits THEN 20 ELSE 0 END) +
    (CASE WHEN has_progression THEN 20 ELSE 0 END) +
    (CASE WHEN has_satisfaction THEN 15 ELSE 0 END) +
    (CASE WHEN has_challenge THEN 15 ELSE 0 END);
END;
$$ LANGUAGE plpgsql;
