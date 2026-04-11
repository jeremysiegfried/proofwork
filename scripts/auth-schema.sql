-- User profiles linked to Supabase Auth
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  role TEXT DEFAULT 'candidate' CHECK (role IN ('candidate', 'employer', 'admin')),
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own profile
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Let authenticated users read applications they submitted
CREATE POLICY "Users can read own applications" ON applications
  FOR SELECT USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- Let employers read applications for their company's jobs
CREATE POLICY "Employers can read their job applications" ON applications
  FOR SELECT USING (
    job_id IN (
      SELECT j.id FROM jobs j
      JOIN companies c ON j.company_id = c.id
      JOIN profiles p ON p.company_id = c.id
      WHERE p.id = auth.uid() AND p.role = 'employer'
    )
  );

-- Let employers update application status
CREATE POLICY "Employers can update application status" ON applications
  FOR UPDATE USING (
    job_id IN (
      SELECT j.id FROM jobs j
      JOIN companies c ON j.company_id = c.id
      JOIN profiles p ON p.company_id = c.id
      WHERE p.id = auth.uid() AND p.role = 'employer'
    )
  );
