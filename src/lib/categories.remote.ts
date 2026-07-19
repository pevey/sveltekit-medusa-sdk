import { prerender, query } from '$app/server'
import * as v from 'valibot'
import type Medusa from 'medusa-js-sdk'
import { getClient } from './internal/state'
import { requestContext } from './server/request'

const bySlugSchema = v.object({
  id: v.optional(v.string()),
  slug: v.optional(v.string())
})

type BySlug = { id?: string; slug?: string }

async function listCategoriesCore(client: Medusa, headers?: Record<string, string>) {
  const { product_categories } = await client.store.category.list({}, headers)
  return product_categories
}

async function getCategoryCore(client: Medusa, a: BySlug, headers?: Record<string, string>) {
  if (!a.id && !a.slug) return null
  if (a.id) {
    const { product_category } = await client.store.category.retrieve(a.id, {}, headers)
    return product_category
  }
  const { product_categories } = await client.store.category.list({ handle: a.slug }, headers)
  return product_categories.length ? product_categories[0] : null
}

export const getProductCategories = prerender(async () => listCategoriesCore(getClient()), {
  dynamic: true
})

export const getProductCategory = prerender(bySlugSchema, async (a: BySlug) => getCategoryCore(getClient(), a), {
  dynamic: true
})

export const getProductCategoriesQuery = query(async () => {
  const ctx = requestContext()
  return listCategoriesCore(ctx.client, ctx.headers())
})

export const getProductCategoryQuery = query(bySlugSchema, async (a: BySlug) => {
  const ctx = requestContext()
  return getCategoryCore(ctx.client, a, ctx.headers())
})
