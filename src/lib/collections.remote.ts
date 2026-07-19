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

async function listCollectionsCore(client: Medusa, headers?: Record<string, string>) {
  const { collections } = await client.store.collection.list({}, headers)
  return collections
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

export const getCollections = prerender(async () => listCollectionsCore(getClient()), {
  dynamic: true
})

export const getCollection = prerender(bySlugSchema, async (a: BySlug) => getCollectionCore(getClient(), a), {
  dynamic: true
})

export const getCollectionsQuery = query(async () => {
  const ctx = requestContext()
  return listCollectionsCore(ctx.client, ctx.headers())
})

export const getCollectionQuery = query(bySlugSchema, async (a: BySlug) => {
  const ctx = requestContext()
  return getCollectionCore(ctx.client, a, ctx.headers())
})
