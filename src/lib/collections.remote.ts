import { prerender, query } from '$app/server'
import * as v from 'valibot'
import type Medusa from 'medusa-js-sdk'
import { getClient } from './internal/state'
import { listParams, type ListArgs } from './internal/list-params'
import { requestContext } from './server/request'
import type { StoreCollection } from '@medusajs/types'

const bySlugSchema = v.object({
	id: v.optional(v.string()),
	slug: v.optional(v.string())
})

const collectionListSchema = v.object({
	limit: v.optional(v.number()),
	offset: v.optional(v.number()),
	order: v.optional(v.string()),
	q: v.optional(v.string()),
	fields: v.optional(v.string())
})

type BySlug = { id?: string; slug?: string }
type CollectionListArgs = ListArgs & { fields?: string }

export type CollectionListResult = {
	collections: StoreCollection[]
	count: number
	limit: number
	offset: number
}

async function listCollectionsCore(client: Medusa, a: CollectionListArgs, headers?: Record<string, string>): Promise<CollectionListResult> {
	const params: Record<string, string | string[]> = { ...listParams(a) }
	if (a.fields) params.fields = a.fields
	const res = await client.store.collection.list(params as Record<string, string>, headers)
	return {
		collections: res.collections,
		count: res.count,
		limit: res.limit,
		offset: res.offset
	}
}

async function getCollectionCore(client: Medusa, a: BySlug, headers?: Record<string, string>) {
	if (!a.id && !a.slug) return null
	if (a.id) {
		const { collection } = await client.store.collection.retrieve(a.id, {}, headers)
		return collection
	}
	const { collections } = await client.store.collection.list({ handle: a.slug }, headers)
	return collections.length ? collections[0] : null
}

export const getCollections = prerender(v.optional(collectionListSchema, {}), async (a: CollectionListArgs) => listCollectionsCore(getClient(), a), {
	dynamic: true
})

export const getCollection = prerender(bySlugSchema, async (a: BySlug) => getCollectionCore(getClient(), a), {
	dynamic: true
})

export const getCollectionsQuery = query(v.optional(collectionListSchema, {}), async (a: CollectionListArgs) => {
	const ctx = requestContext()
	return listCollectionsCore(ctx.client, a, ctx.headers())
})

export const getCollectionQuery = query(bySlugSchema, async (a: BySlug) => {
	const ctx = requestContext()
	return getCollectionCore(ctx.client, a, ctx.headers())
})
