import Stripe from 'stripe';
import { requireNodeEnvVar } from '../../server/utils';

export const stripe = new Stripe(requireNodeEnvVar('STRIPE_API_KEY'), {
  // NOTE:
  // API version below should ideally match the API version in your Stripe dashboard.
  // If that is not the case, you will most likely want to (up/down)grade the `stripe`
  // npm package to the API version that matches your Stripe dashboard's one.
  // For more details and alternative setups check
  // https://docs.stripe.com/api/versioning .
  // Align with installed `stripe` npm version 18.1.0 default; set explicitly if you've pinned a dashboard default.
  // Example: '2024-12-18' — update if your dashboard uses a different default.
  apiVersion: '2024-12-18',
});
