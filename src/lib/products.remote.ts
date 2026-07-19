import { prerender, query } from '$app/server'
import * as v from 'valibot'
import type Medusa from 'medusa-js-sdk'
import { getClient, getConfig } from './internal/state'
import { getDefaultRegionId } from './internal/region'
import { requestContext } from './server/request'

const regionSchema = v.object({
  region_id: v.optional(v.string()),
  country_code: v.optional(v.string())
})

const productArgsSchema = v.object({
  id: v.optional(v.string()),
  slug: v.optional(v.string()),
  region_id: v.optional(v.string()),
  country_code: v.optional(v.string())
})

type RegionArgs = { region_id?: string; country_code?: string }
type ProductArgs = RegionArgs & { id?: string; slug?: string }

/**
 * Resolve region/country for the prerender variants: an explicit arg wins; otherwise
 * fall back to the store's default region (`config.defaultRegionId`, or a single-region
 * backend's only region — see `getDefaultRegionId`) and `config.defaultCountryCode`.
 * All are request-independent, so this is safe at build time. Makes `getProduct({ slug })`
 * prerender at the store's default region (the common single-region case) while
 * multi-region stores pass an explicit `region_id` (e.g. routed by URL).
 */
async function withDefaultRegion<T extends RegionArgs>(a: T): Promise<T> {
  return {
    ...a,
    region_id: a.region_id || (await getDefaultRegionId()),
    country_code: a.country_code || getConfig().defaultCountryCode
  }
}

function regionParams(a: RegionArgs): Record<string, string> {
  const p: Record<string, string> = {}
  if (a.region_id) p.region_id = a.region_id
  if (a.country_code) p.country_code = a.country_code
  return p
}

async function listProductsCore(client: Medusa, a: RegionArgs, headers?: Record<string, string>) {
  const { products } = await client.store.product.list(regionParams(a), headers)
  return products
}

async function getProductCore(client: Medusa, a: ProductArgs, headers?: Record<string, string>) {
  if (!a.id && !a.slug) return null
  const params = { ...regionParams(a), fields: '*variants.calculated_price' }
  if (a.id) {
    const { product } = await client.store.product.retrieve(a.id, params, headers)
    return product
  }
  const { products } = await client.store.product.list({ handle: a.slug, ...params }, headers)
  return products.length ? products[0] : null
}

// Prerender (cacheable, request-independent). Region: explicit arg ?? config default
// ?? single-region auto-detect. Errors propagate — a consumer that wants a flaky backend
// to warn instead of failing the build sets `kit.prerender.handleHttpError` in its config.
export const getProducts = prerender(
  v.optional(regionSchema, {}),
  async (a: RegionArgs) => listProductsCore(getClient(), await withDefaultRegion(a)),
  { dynamic: true }
)

export const getProduct = prerender(
  productArgsSchema,
  async (a: ProductArgs) => getProductCore(getClient(), await withDefaultRegion(a)),
  { dynamic: true }
)

// Query twins (fresh, personalized — region from cookie ?? default). Propagate errors.
export const getProductsQuery = query(v.optional(regionSchema, {}), async (a: RegionArgs) => {
  const ctx = requestContext()
  const region_id = a.region_id || ctx.region_id || (await getDefaultRegionId())
  return listProductsCore(ctx.client, { region_id, country_code: a.country_code || ctx.country_code }, ctx.headers())
})

export const getProductQuery = query(productArgsSchema, async (a: ProductArgs) => {
  const ctx = requestContext()
  const region_id = a.region_id || ctx.region_id || (await getDefaultRegionId())
  return getProductCore(ctx.client, { ...a, region_id, country_code: a.country_code || ctx.country_code }, ctx.headers())
})
