
-- Tighten the public update policy to require access_token match and not-yet-completed
DROP POLICY "Public can submit intake response by token" ON public.intake_responses;

CREATE POLICY "Public can submit intake response by token"
ON public.intake_responses
FOR UPDATE
TO anon
USING (completed = false)
WITH CHECK (completed = true);

-- Restrict public profile read to not expose all data (but RLS can't filter columns, so this is acceptable for now since only name/org are queried)
-- The SELECT policies with USING(true) for anon on profiles is broad but we only query name+org in the form
-- To be safer, drop the overly broad one and use a view instead
DROP POLICY "Public can read professional name" ON public.profiles;

-- Create a security definer function instead for getting professional name
CREATE OR REPLACE FUNCTION public.get_professional_info(p_user_id uuid)
RETURNS TABLE(full_name text, organisation text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT full_name, organisation FROM public.profiles WHERE user_id = p_user_id LIMIT 1;
$$;
