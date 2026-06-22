import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const session = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      const userId = session.metadata?.userId;
      if (userId) {
        await supabase.from('orion_users').update({
          plan: 'pro',
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          plan_expires_at: null, // illimité tant que l'abo est actif
        }).eq('id', userId);
      }
      break;
    }
    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      const customerId = session.customer;
      await supabase.from('orion_users').update({ plan: 'free' }).eq('stripe_customer_id', customerId);
      break;
    }
  }

  res.status(200).json({ received: true });
}
