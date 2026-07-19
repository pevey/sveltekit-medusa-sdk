import * as v from 'valibot'

/**
 * Checkout schema for the Braintree flow. Exported from a non-`.remote.` module
 * because remote files cannot export schemas. Consumers can reuse or extend it
 * when building their own checkout form. A `stripeCheckoutSchema` will follow.
 */
export const braintreeCheckoutSchema = v.object({
  email: v.pipe(v.string(), v.nonEmpty('Email is required'), v.email('Invalid email address')),
  first_name: v.pipe(v.string(), v.nonEmpty('First name is required')),
  last_name: v.pipe(v.string(), v.nonEmpty('Last name is required')),
  address_1: v.pipe(v.string(), v.nonEmpty('Address is required')),
  address_2: v.optional(v.string()),
  city: v.pipe(v.string(), v.nonEmpty('City is required')),
  province: v.pipe(v.string(), v.nonEmpty('Province is required')),
  country_code: v.pipe(v.string(), v.nonEmpty('Country is required')),
  postal_code: v.pipe(v.string(), v.nonEmpty('Postal code is required')),
  phone: v.optional(v.string()),
  billing_first_name: v.optional(v.string()),
  billing_last_name: v.optional(v.string()),
  billing_address_1: v.optional(v.string()),
  billing_address_2: v.optional(v.string()),
  billing_city: v.optional(v.string()),
  billing_province: v.optional(v.string()),
  billing_country_code: v.optional(v.string()),
  billing_postal_code: v.optional(v.string()),
  billing_phone: v.optional(v.string()),
  hideBilling: v.optional(v.boolean(), true),
  extra: v.optional(v.string())
})
