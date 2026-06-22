import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type Plan = 'trial' | 'pro' | 'free';

interface PlanInfo {
  plan: Plan;
  isLoading: boolean;
  isPro: boolean;
  isTrial: boolean;
  trialDaysLeft: number;
  trialExpired: boolean;
}

export function usePlan(): PlanInfo {
  const [plan, setPlan] = useState<Plan>('trial');
  const [trialStartsAt, setTrialStartsAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
      const { data } = await supabase.from('orion_users').select('plan, trial_starts_at').eq('id', user.id).single();
      if (data) { setPlan(data.plan || 'trial'); setTrialStartsAt(data.trial_starts_at); }
      setIsLoading(false);
    };
    load();
  }, []);

  const trialDaysLeft = trialStartsAt
    ? Math.max(0, 7 - Math.floor((Date.now() - new Date(trialStartsAt).getTime()) / (1000 * 60 * 60 * 24)))
    : 7;

  const trialExpired = plan === 'trial' && trialDaysLeft === 0;

  return { plan, isLoading, isPro: plan === 'pro', isTrial: plan === 'trial' && !trialExpired, trialDaysLeft, trialExpired };
}
