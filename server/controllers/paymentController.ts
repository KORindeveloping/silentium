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
    const rawAppUrl = process.env.APP_URL || 'http://localhost:3000';
    const appUrl = (process.env.NODE_ENV === 'production' && rawAppUrl.startsWith('http://'))
      ? rawAppUrl.replace('http://', 'https://')
      : rawAppUrl;

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
      success_url: `${appUrl}/?success=true`,
      cancel_url: `${appUrl}/?canceled=true`,
      customer_email: (req as any).user.email,
    });

    res.json({ id: session.id });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
