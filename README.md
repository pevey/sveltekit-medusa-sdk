# sveltekit-medusa-sdk

A SvelteKit client for communicating with a [Medusa](https://medusajs.com) v2 backend built on top of the Medusa JS SDK. It is designed to access the Medusa backend **only from the storefront server**. It is not designed for having the client browser make network calls to the Medusa backend directly.

This package is the successor to [sveltekit-medusa-client](https://www.npmjs.com/package/sveltekit-medusa-client), a SvelteKit library for communicating with a v1 Medusa backend.

## What changed from `sveltekit-medusa-client`

The SvelteKit client for Medusa v1 exported a **class** (`new MedusaClient(url)`) that you instantiated somewhere in your app and then imported into each load function, form action, or endpoint that needed Medusa access. This successor client for Medusa v2 is built around SvelteKit's **remote functions** feature. You import ready-made `query`/`command`/`form` functions (e.g. `getProducts`, `addToCart`, `login`) and call them directly from components. Under the hood, they use a single shared `@medusajs/js-sdk` instance, configured once via a hook. Credentials and region are pulled from the request context and injected on every call. So you get the benefit of avoiding per-request client construction while still getting request-scoped pass-through of credentials from the browser to the Medusa backend.

## Warning

Remote functions are still classified as **experimental** by the SvelteKit team. Breaking changes in the remote functions API may be introduced between SvelteKit releases without a major version bump. Moreover, shipping an external package with remote functions is bleeding edge and undocumented.

This library is being developed with planned SvelteKit 3.0.0 features in mind and is targeted for stable release after 3.0.0 is out of preview. Usage in the meantime is intended only for testing and providing feedback. Pin your SvelteKit version and review the changelog when upgrading.

## Requirements

- SvelteKit `>= 2.22` and Svelte `>= 5.36` (versions with remote functions).
- Experimental flags enabled in your app's `svelte.config.js`:

```js
// svelte.config.js
const config = {
	compilerOptions: {
		experimental: {
			async: true
		}
	},
	kit: {
		experimental: {
			remoteFunctions: true
		}
	}
}
export default config
```

- Vite configured to treat the package as internal to your app so that $app/server can resolve (ssr: noExternal). Also, prevent remote functions being dropped by the bundler in dev mode by excluding from optimizeDeps.

```js
// vite.config.js
	optimizeDeps: {
		exclude: ['sveltekit-medusa-sdk'] // don't prebundle to prevent SvelteKit from dropping the remote functions in installed packages
	},
	ssr: {
		noExternal: ['sveltekit-medusa-sdk'] // treat the package as internal to the app so that $app/server can resolve
	},
```

## Installation

```bash
yarn add -D sveltekit-medusa-sdk
```

## Configuration

Wire the handle once in `src/hooks.server.ts` (the only place your private env is read):

```ts
// src/hooks.server.ts
import { createMedusaHandle } from 'sveltekit-medusa-sdk/server'
import { MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY } from '$env/static/private'

export const handle = createMedusaHandle({
	// required:
	baseUrl: MEDUSA_BACKEND_URL,
	publishableKey: MEDUSA_PUBLISHABLE_KEY,
	// optional:
	defaultRegionId: 'reg_...',
	defaultCountryCode: 'us',
	globalHeaders: {
		// e.g. Cloudflare Access, if your backend is firewalled behind it
		// 'CF-Access-Client-Id': CLOUDFLARE_ACCESS_ID,
		// 'CF-Access-Client-Secret': CLOUDFLARE_ACCESS_SECRET
	},
	cookies: {
		// the names you want for the cookies that will be set in the client browser
		session: 'sid',
		region: 'region',
		country: 'country',
		cart: 'cartid'
	},
	backendSessionCookie: 'connect.sid', // the name of the session cookie coming from your Medusa backend
	transferCartOnLogin: true
})
```

Augment `App.Locals` so the per-request context is typed (the handle assigns
`event.locals.medusa`, so you can use the configured client in your own load functions and
endpoints):

```ts
// src/app.d.ts
import type { MedusaContext } from 'sveltekit-medusa-sdk'
declare global {
	namespace App {
		interface Locals {
			medusa: MedusaContext
		}
	}
}
export {}
```

### Config options

| Option                     | Default       | Description                                                                          |
| -------------------------- | ------------- | ------------------------------------------------------------------------------------ |
| `baseUrl`                  | —             | Medusa backend URL (required)                                                        |
| `publishableKey`           | —             | Medusa publishable API key (required)                                                |
| `globalHeaders`            | `{}`          | Headers sent on every backend request (e.g. Cloudflare Access)                       |
| `defaultRegionId`          | —             | Fallback region when no `region` cookie is set                                       |
| `defaultCountryCode`       | —             | Fallback country when no `country` cookie is set                                     |
| `backendSessionCookie`     | `connect.sid` | The session cookie name Medusa issues                                                |
| `cookies.session`          | `sid`         | The session cookie name on your storefront (the rename)                              |
| `cookies.region`           | `region`      | Region cookie name                                                                   |
| `cookies.country`          | `country`     | Country cookie name                                                                  |
| `cookies.cart`             | `cartid`      | Cart id cookie name                                                                  |
| `cookies.anonymousId`      | `aid`         | Stable anonymous-visitor id (the analytics `actor_id`)                               |
| `affiliate.cookie`         | `aff`         | Affiliate-code cookie name                                                           |
| `affiliate.maxAgeDays`     | `30`          | How long a captured affiliate code persists (sales cycle)                            |
| `affiliate.basis`          | `last-click`  | `last-click` (overwrite on new code) or `first-touch` (keep first)                   |
| `analytics.clientIpHeader` | _(auto)_      | Override the header the client IP is read from (auto-detects CF / `X-Forwarded-For`) |
| `analytics.omitIp`         | `false`       | Store only the country and drop the raw IP (IP-restricted jurisdictions)             |
| `transferCartOnLogin`      | `true`        | Transfer the anonymous cart to the customer on login                                 |
| `debug`                    | `false`       | Enable SDK debug logging                                                             |

### The `sid` cookie rename

On login, this library establishes a Medusa backend session and re-issues it to your storefront under a **neutral cookie name** (default `sid`) instead of Medusa's`connect.sid`. Two reasons: it makes it less obvious your backend is Medusa (a small hurdle against broad vulnerability scanning), and a distinct name tells you at a glance, while
debugging, that _your storefront_ set the cookie. Both names are configurable.

## Usage

```svelte
<script lang="ts">
  import { getProducts, addToCart } from 'sveltekit-medusa-sdk'
</script>

<ul>
  {#each await getProducts() as product}
    <li>{product.title}</li>
  {/each}
</ul>
```

## Available Functions

All functions are exported from the package root. Each `*.remote.ts` module is also available as a subpath import (e.g. `sveltekit-medusa-sdk/cart`, `sveltekit-medusa-sdk/auth`). Schemas are exported from `sveltekit-medusa-sdk/schemas`.

Two conventions to know:

- **Catalog reads ship two variants** — a **prerender** default (takes explicit `region_id`/`country_code` args) and a `*Query` twin (reads region/country from the request's cookies, can be updated dynamically).
- **Auth functions return a structured `{ ok: boolean, code?: string }`** so you can map stable codes (`invalid_credentials`, `email_exists`, `rate_limited`, `unsupported`, `unknown`) to your own copy/i18n.

### regions

- `getRegions` — prerender

### products

- `getProducts` — prerender
- `getProduct` — prerender (by `id` or `slug`)
- `getProductsQuery` — query
- `getProductQuery` — query (by `id` or `slug`)

### categories

- `getProductCategories` — prerender
- `getProductCategory` — prerender (by `id` or `slug`)
- `getProductCategoriesQuery` — query
- `getProductCategoryQuery` — query (by `id` or `slug`)

### collections

- `getCollections` — prerender
- `getCollection` — prerender (by `id` or `slug`)
- `getCollectionsQuery` — query
- `getCollectionQuery` — query (by `id` or `slug`)

### cart

- `getCart` — query
- `getCartById` — query
- `createCart` — command
- `addToCart` — command
- `removeFromCart` — command
- `updateCartItem` — command
- `updateCart` — command
- `selectShippingOption` — command
- `getShippingOptions` — query
- `completeCart` — command

### promotions

- `addPromotion` — command
- `removePromotion` — command

### payment

- `listPaymentProviders` — query
- `initiatePaymentSession` — command (generic, any provider)

### braintree

- `braintreeCheckoutForm` — form
- `initiateBraintreePaymentSession` — command
- `braintreeCheckoutSchema` — valibot schema (from `sveltekit-medusa-sdk/schemas`)

### orders

- `getOrders` — query
- `getOrderById` — query

### auth

- `login` — form (returns `{ ok, code }`)
- `register` — form (returns `{ ok, code }`)
- `requestResetPassword` — form (returns `{ ok, code }`)
- `resetPassword` — form (returns `{ ok, code }`)
- `logout` — command (returns `{ ok, code }`)

### customer

- `getCustomer` — query
- `updateCustomer` — command

### address

- `getAddresses` — query
- `saveAddress` — form (create or update by `id`)
- `deleteAddress` — command

### search

- `search` — query (requires medusa-plugin-search on the backend)

### forms

- `submitForm` — command (requires medusa-plugin-forms on the backend)

### reviews

- `getReviews` — query (approved reviews for a product; plus the customer's own pending reviews when signed in)
- `createReview` — command (requires a signed-in customer; requires medusa-plugin-reviews on the backend)

### content

- `getContentCollections` — query (list collections)
- `getContentCollection` — query (one collection by `slug`)
- `getContentItems` — query (published items in a collection, with `tag`/`q`/paging)
- `getContentItem` — query (one item by `slug` + `itemSlug`)

Dynamic reads by default (edits show without a rebuild); wrap in `prerender` in your app for static content pages. Requires medusa-plugin-content on the backend.

### affiliate

- `<Affiliate>` — layout component that captures `?via=CODE` into a cookie and applies it to the cart
- `captureAffiliate` — the underlying command (the component calls it; rarely used directly)

See [Affiliate](#affiliate). Requires medusa-plugin-affiliates on the backend.

### analytics

- `<Analytics>` — headless layout component; `track` / `setTraits` — app-wide capture API
- `analyticsPOST` / `forwardAnalytics` / `setTraits` — server-side (from `sveltekit-medusa-sdk/server`)

Analytics is set up differently from the remote functions above — see [Analytics](#analytics) (requires medusa-plugin-analytics on the backend).

## Analytics

Analytics is the one feature that **doesn't** use a remote function. Capturing events as the tab closes needs `navigator.sendBeacon`, which can't attach the publishable key — so events are sent to a **same-origin endpoint** in your app that forwards them to Medusa (keeping the key server-side and working even when the backend isn't reachable from the browser). The SDK ships both halves: a headless `<Analytics>` component and the forwarder.

Identity is server-managed: `createMedusaHandle` assigns each visitor a stable `anonymous_id` cookie, and the forwarder stamps it as `actor_id`. That id survives across carts and orders (a cart id is cleared on order completion) and the browser never sees it. On **login** the anonymous identity is automatically merged into the customer (past events are re-attributed); on **logout** a fresh anonymous id starts — so there is no client-side `identify` to call.

Every visitor also gets a lightweight **identity record** with their **country** (and IP, unless `analytics.omitIp`), read server-side from the Cloudflare headers (`CF-IPCountry` / `CF-Connecting-IP`, falling back to `X-Forwarded-For`) and refreshed about once per session. That's what powers funnel geo drill-downs; it never leaves your infrastructure. Medusa can't see the visitor's IP itself (events are proxied through your server), which is why capture happens at the edge.

**Attach your own traits** with `setTraits` — from the browser for things it knows, or server-side (`sveltekit-medusa-sdk/server`) for request-derived data like a first-touch country:

```ts
// server: e.g. inside your own remote function / +server.ts
import { getRequestEvent } from '$app/server'
import { setTraits } from 'sveltekit-medusa-sdk/server'

const country = getRequestEvent().request.headers.get('cf-ipcountry')
if (country) await setTraits({ first_country: country }) // your own first-touch guard
```

```svelte
<!-- browser -->
<script lang="ts">
  import { setTraits } from 'sveltekit-medusa-sdk'
  // setTraits({ plan_interest: 'pro' })
</script>
```

**1. Add the component to your root layout.** It owns the browser-side batcher and registers an app-wide tracking API.

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { Analytics } from 'sveltekit-medusa-sdk'
  let { children } = $props()
</script>

<Analytics />
{@render children()}
```

Props: `endpoint` (default `/api/analytics`), `batchSize`, `flushInterval`.

**2. Create the forwarding endpoint** the component posts to — re-export the ready-made handler:

```ts
// src/routes/api/analytics/+server.ts
export { analyticsPOST as POST } from 'sveltekit-medusa-sdk/server'
```

Need your own auth or rate-limiting around it? Call `forwardAnalytics(request)` from your own handler instead.

**3. Track from anywhere.** `track` no-ops until `<Analytics>` has mounted (and on the server), so it's safe to call from any component or module:

```svelte
<script lang="ts">
  import { track } from 'sveltekit-medusa-sdk'

  function onView(id: string) {
    track('product_viewed', { properties: { id } })
  }
</script>
```

Sales-channel attribution and event gating (rubrics) are handled backend-side by the analytics plugin. The framework-agnostic batcher, `createCollector`, is also re-exported if you want to drive it yourself.

## Affiliate

Attribute orders to affiliates with no cart wiring on the storefront. An affiliate is linked to a Medusa promotion (via medusa-plugin-affiliates); when a customer's order carries that promotion, the plugin credits the affiliate on the admin dashboard. This SDK's only job is to capture the affiliate's code from the URL and get it onto the cart.

**Add the component to your layout** — it captures `?via=CODE` on landing (and on client-side navigation) into a cookie:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { Affiliate } from 'sveltekit-medusa-sdk'
</script>

<Affiliate />
```

Prop: `param` (the URL query param, default `via`). Cookie behavior is configured in `createMedusaHandle`:

```ts
affiliate: { cookie: 'aff', maxAgeDays: 30, basis: 'last-click' } // basis: 'last-click' | 'first-touch'
```

That's the whole setup. The captured code is applied to the cart automatically — immediately if a cart already exists, otherwise when the cart is first created (first add-to-cart). The affiliate plugin's cart guard enforces one affiliate code per cart and last-click replacement **server-side**, so none of that logic (and no discount math) lives in the browser.

## Extending the client

Because the library exposes its per-request context, you can add your own remote functions in your app that reuse the same configured Medusa instance. This is useful if you have custom routes added by your own Medusa plugins or if you want to customize any of the functions included in the library. Call `getMedusaContext()` within a custom remote function get an object with the relevant context (`{ client, region_id, country_code, headers() }`) for the current request. Passing `headers()` sends the logged-in customer's session.

`getMedusaContext` is server-only (it reads the request via `$app/server`), so it is imported from the **`sveltekit-medusa-sdk/server`** subpath rather than the package root. Importing it only inside a `*.remote.ts` file is safe — SvelteKit compiles those to client stubs, so the server dependency never reaches the browser.

```ts
// src/lib/orders.remote.ts
import { query } from '$app/server'
import { getMedusaContext } from 'sveltekit-medusa-sdk/server'

// Fetches the signed-in customer's orders — requires credentials, which
// getMedusaContext().headers() supplies from the request's session cookie.
export const getMyOrders = query(async () => {
	const ctx = getMedusaContext()
	const { orders } = await ctx.client.store.order.list(
		{ limit: 20 },
		ctx.headers() // <-- replays the session; without it the call is anonymous
	)
	return orders
})
```

```svelte
<script lang="ts">
  import { getMyOrders } from '$lib/orders.remote'
</script>

<ul>
  {#each await getMyOrders() as order}
    <li>#{order.display_id} — {order.total}</li>
  {/each}
</ul>
```

`getMedusaContext()` may only be called inside a remote function (it reads the current request). Only `form` and `command` functions can **write** cookies; `query` and `prerender` cannot.

## Rendering data server-side (SSR)

With `experimental.async` you can `await` a query directly in markup (`{#each await getProducts() as p}`) so it renders during SSR. An `{#await getCart() then cart}` block, by contrast, defers to the client. Use direct `await` when you want the data in the server-rendered HTML.
