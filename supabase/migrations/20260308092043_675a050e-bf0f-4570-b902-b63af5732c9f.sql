
-- Allow anonymous users to read intake_responses by access_token (for client-facing form)
CREATE POLICY "Public can read intake response by token"
ON public.intake_responses
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to update intake_responses (submit answers)
CREATE POLICY "Public can submit intake response by token"
ON public.intake_responses
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow anonymous read of intake_templates (needed to display questions in form)
CREATE POLICY "Public can read intake templates"
ON public.intake_templates
FOR SELECT
TO anon
USING (true);

-- Allow anonymous read of profiles (for professional name on form)
CREATE POLICY "Public can read professional name"
ON public.profiles
FOR SELECT
TO anon
USING (true);
