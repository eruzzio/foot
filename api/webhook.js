import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const session = event.data.object;

  if (event.type === 'checkout.session.completed') {
    const userId = session.metadata?.userId;
    if (userId) {
      await supabase.from('orion_users').update({
        plan: 'pro',
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
      }).eq('id', userId);
    }
  } else if (event.type === 'invoice.payment_succeeded') {
    // Activer le plan pro via customer_id
    const customerId = session.customer;
    if (customerId) {
      await supabase.from('orion_users').update({ plan: 'pro' }).eq('stripe_customer_id', customerId);
    }
  } else if (event.type === 'customer.subscription.deleted' || event.type === 'invoice.payment_failed') {
    await supabase.from('orion_users').update({ plan: 'free' }).eq('stripe_customer_id', session.customer);
  }

  res.status(200).json({ received: true });
}
