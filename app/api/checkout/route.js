import Stripe from 'stripe'

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    var stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    var { plan, email, companyId } = await request.json()

    if (!plan || !email) {
      return Response.json({ error: 'Missing plan or email' }, { status: 400 })
    }

    // Define price IDs - create these in Stripe dashboard
    // For now use price lookup keys
    var plans = {
      growth: {
        name: 'ShowJob Growth',
        price: 9900, // £99 in pence
        description: 'Unlimited jobs, applicant tracking, analytics',
      },
      scale: {
        name: 'ShowJob Scale',
        price: 49900, // £499 in pence
        description: 'Everything + AI assessments, candidate search, priority',
      }
    }

    var selectedPlan = plans[plan]
    if (!selectedPlan) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 })
    }

    var baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://proofwork-nine.vercel.app'

    var session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: selectedPlan.name,
            description: selectedPlan.description,
          },
          unit_amount: selectedPlan.price,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      metadata: {
        plan: plan,
        company_id: companyId || '',
      },
      success_url: baseUrl + '/checkout/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: baseUrl + '/pricing',
    })

    return Response.json({ url: session.url })

  } catch (err) {
    console.error('Stripe checkout error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
