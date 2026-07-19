// lib/helpers — client-safe, reusable helpers. No `$app/server` / request-scoped
// state, so they're re-exported from the package barrel and are safe to call from
// your own remote functions. (Server-only code lives in lib/server; private wiring
// in lib/internal.)
import type { StoreCart } from '@medusajs/types'

/**
 * Map a cart's shipping/billing address to Braintree's address shape.
 * Billing falls back to shipping when a billing field is empty.
 */
export function formatBraintreeAddress(type: 'billing' | 'shipping', cart: StoreCart | null) {
  if (!cart) return {}
  const s = cart.shipping_address
  if (type === 'shipping') {
    return {
      firstName: s?.first_name || '',
      lastName: s?.last_name || '',
      streetAddress: s?.address_1 || '',
      extendedAddress: s?.address_2 || '',
      locality: s?.city || '',
      region: s?.province || '',
      postalCode: s?.postal_code || '',
      countryCodeAlpha2: s?.country_code?.toUpperCase() || ''
    }
  }
  const b = cart.billing_address
  return {
    firstName: b?.first_name || s?.first_name || '',
    lastName: b?.last_name || s?.last_name || '',
    streetAddress: b?.address_1 || s?.address_1 || '',
    extendedAddress: b?.address_2 || '',
    locality: b?.city || s?.city || '',
    region: b?.province || s?.province || '',
    postalCode: b?.postal_code || s?.postal_code || '',
    countryCodeAlpha2: (b?.country_code || s?.country_code)?.toUpperCase() || ''
  }
}
