import { prerender, query } from '$app/server'
import * as v from 'valibot'
import type Medusa from 'medusa-js-sdk'
import { getClient } from './internal/state'
import { listParams, type ListArgs } from './internal/list-params'
import { requestContext } from './server/request'
import type { StoreProductCategory } from '@medusajs/types'

const bySlugSchema = v.object({
	id: v.optional(v.string()),
	slug: v.optional(v.string())
})

const categoryListSchema = v.object({
	limit: v.optional(v.number()),
	offset: v.optional(v.number()),
	order: v.optional(v.string()),
	q: v.optional(v.string()),
	fields: v.optional(v.string()),
	parent_category_id: v.optional(v.string())
})

type BySlug = { id?: string; slug?: string }
type CategoryListArgs = ListArgs & { fields?: string }

export type CategoryListResult = {
	product_categories: StoreProductCategory[]
	count: number
	limit: number
	offset: number
}

async function listCategoriesCore(client: Medusa, a: CategoryListArgs, headers?: Record<string, string>): Promise<CategoryListResult> {
	const params: Record<string, string | string[]> = { ...listParams(a) }
	if (a.fields) params.fields = a.fields
	const res = await client.store.category.list(params as Record<string, string>, headers)
	return {
		product_categories: res.product_categories,
		count: res.count,
		limit: res.limit,
		offset: res.offset
	}
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

export const getProductCategories = prerender(v.optional(categoryListSchema, {}), async (a: CategoryListArgs) => listCategoriesCore(getClient(), a), {
	dynamic: true
})

export const getProductCategory = prerender(bySlugSchema, async (a: BySlug) => getCategoryCore(getClient(), a), {
	dynamic: true
})

export const getProductCategoriesQuery = query(v.optional(categoryListSchema, {}), async (a: CategoryListArgs) => {
	const ctx = requestContext()
	return listCategoriesCore(ctx.client, a, ctx.headers())
})

export const getProductCategoryQuery = query(bySlugSchema, async (a: BySlug) => {
	const ctx = requestContext()
	return getCategoryCore(ctx.client, a, ctx.headers())
})
