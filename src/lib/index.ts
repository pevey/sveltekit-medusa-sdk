// ─────────────────────────────────────────────────────────────────────────────
// Source layout — three folders, one rule each:
//
//   lib/server/    MUST run on the server. Statically imports `$app/server` (or
//                  other request-scoped server state). Exposed ONLY at the
//                  `sveltekit-medusa-sdk/server` subpath — NEVER re-exported from
//                  this barrel, or SvelteKit's guard would see a browser path to
//                  `$app/server`. e.g. getMedusaContext.
//
//   lib/helpers/   Client-safe AND meant for reuse. Pure helpers a consumer can
//                  call from their own remote functions. Re-exported from this
//                  barrel. e.g. formatBraintreeAddress.
//
//   lib/internal/  Client-safe but PRIVATE wiring (the shared-client singleton,
//                  config/context/session/region resolution). Not exported from
//                  anywhere — hands off. Client-safety here is incidental, not a
//                  promise; treat these as implementation detail.
//
// Note: the `*.remote.ts` files may import from lib/server freely — SvelteKit
// compiles them to client stubs, so the `$app/server` dependency never reaches
// the browser. Only non-remote, barrel-reachable modules must avoid lib/server.
// ─────────────────────────────────────────────────────────────────────────────
export type { MedusaHandleConfig, MedusaContext, CookieNames, AuthResult } from './types'
export { braintreeCheckoutSchema } from './schemas/braintree'

// Reusable client-safe helpers (see lib/helpers)
export { formatBraintreeAddress } from './helpers/braintree'

// Regions
export { getRegions } from './regions.remote'

// Catalog (prerender defaults + query twins)
export { getProducts, getProduct, getProductsQuery, getProductQuery } from './products.remote'
export {
	getProductCategories,
	getProductCategory,
	getProductCategoriesQuery,
	getProductCategoryQuery
} from './categories.remote'
export {
	getCollections,
	getCollection,
	getCollectionsQuery,
	getCollectionQuery
} from './collections.remote'

// Cart
export {
	getCart,
	getCartById,
	createCart,
	addToCart,
	removeFromCart,
	updateCartItem,
	updateCart,
	selectShippingOption,
	getShippingOptions,
	completeCart
} from './cart.remote'

// Promotions
export { addPromotion, removePromotion } from './promotions.remote'

// Payment
export { listPaymentProviders, initiatePaymentSession } from './payment.remote'
export { braintreeCheckoutForm, initiateBraintreePaymentSession } from './braintree.remote'

// Orders
export { getOrders, getOrderById } from './orders.remote'

// Auth
export { login, register, requestResetPassword, resetPassword, logout } from './auth.remote'

// Customer & addresses
export { getCustomer, updateCustomer } from './customer.remote'
export { getAddresses, saveAddress, deleteAddress } from './address.remote'

// Generic primitives
export { search } from './search.remote'
export { submitForm } from './forms.remote'
export { getReviews, createReview } from './reviews.remote'
export {
	getContentCollections,
	getContentCollection,
	getContentItems,
	getContentItem
} from './content.remote'

// Analytics — layout component + tracking API + the framework-agnostic collector.
// (Server-side beacon forwarder lives at `sveltekit-medusa-sdk/server`.)
export { default as Analytics } from './components/Events.svelte'
export { track, setTraits } from './events'
export { createCollector } from 'medusa-js-sdk'
export type { Collector } from 'medusa-js-sdk'

// Affiliate — layout component that captures the affiliate code from the URL.
export { default as Affiliate } from './components/Affiliate.svelte'
export { captureAffiliate } from './affiliate.remote'
