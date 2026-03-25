import { Request, Response } from 'express';
import Stripe from 'stripe';

let stripe: Stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

// @desc    Create Stripe Checkout Session
// @route   POST /api/payments/create-checkout-session
// @access  Private
export const createCheckoutSession = async (req: Request, res: Response) => {
  if (!stripe) {
    res.status(500).json({ message: 'Stripe not configured' });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Silentium Premium' },
          unit_amount: 999, // $9.99
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/?success=true`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/?canceled=true`,
      customer_email: (req as any).user.email,
    });

    res.json({ id: session.id });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
