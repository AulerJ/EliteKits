import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

export const stripeServer =
  key ?
    new Stripe(key, { apiVersion: "2026-02-25.clover" })
  : null;
