import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

var supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  var stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  try {
    var body = await request.text()
    var sig = request.headers.get('stripe-signature')

    var event
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return Response.json({ error: 'Invalid signature' }, { status: 400 })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        var session = event.data.object
        var companyId = session.metadata?.company_id
        var plan = session.metadata?.plan
        var customerEmail = session.customer_email

        if (companyId) {
          // Update company subscription status
          await supabaseAdmin.from('companies').update({
            subscription_plan: plan,
            subscription_status: 'active',
            stripe_customer_id: session.customer,
            updated_at: new Date().toISOString(),
          }).eq('id', companyId)
        }

        console.log('Subscription created:', plan, customerEmail)
        break
      }

      case 'customer.subscription.deleted': {
        var subscription = event.data.object
        var customerId = subscription.customer

        // Find company by stripe customer ID and downgrade
        await supabaseAdmin.from('companies').update({
          subscription_plan: 'free',
          subscription_status: 'cancelled',
          updated_at: new Date().toISOString(),
        }).eq('stripe_customer_id', customerId)

        console.log('Subscription cancelled:', customerId)
        break
      }

      case 'invoice.payment_failed': {
        var invoice = event.data.object
        console.log('Payment failed:', invoice.customer_email)
        break
      }
    }

    return Response.json({ received: true })

  } catch (err) {
    console.error('Webhook error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
