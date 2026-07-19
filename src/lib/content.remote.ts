import { query } from '$app/server'
import * as v from 'valibot'
import { requestContext } from './server/request'

// Storefront CMS reads (requires the content plugin on the backend). All are
// dynamic queries so admin edits show without a rebuild; wrap in prerender in
// your own app if you want static content pages.

/** List content collections. */
export const getContentCollections = query(
	v.optional(
		v.object({
			q: v.optional(v.string()),
			limit: v.optional(v.number()),
			offset: v.optional(v.number())
		}),
		{}
	),
	async ({ q, limit, offset }) => {
		const ctx = requestContext()
		return ctx.client.store.content.list(
			{
				...(q ? { q } : {}),
				...(limit !== undefined ? { limit } : {}),
				...(offset !== undefined ? { offset } : {})
			},
			ctx.headers()
		)
	}
)

/** Retrieve a single content collection by slug. */
export const getContentCollection = query(
	v.object({ slug: v.pipe(v.string(), v.nonEmpty()) }),
	async ({ slug }) => {
		const ctx = requestContext()
		return ctx.client.store.content.retrieve(slug, {}, ctx.headers())
	}
)

/** List published items in a collection. */
export const getContentItems = query(
	v.object({
		slug: v.pipe(v.string(), v.nonEmpty()),
		tag: v.optional(v.string()),
		q: v.optional(v.string()),
		limit: v.optional(v.number()),
		offset: v.optional(v.number())
	}),
	async ({ slug, tag, q, limit, offset }) => {
		const ctx = requestContext()
		return ctx.client.store.content.listItems(
			slug,
			{
				...(tag ? { tag } : {}),
				...(q ? { q } : {}),
				...(limit !== undefined ? { limit } : {}),
				...(offset !== undefined ? { offset } : {})
			},
			ctx.headers()
		)
	}
)

/** Retrieve a single content item by collection slug + item slug. */
export const getContentItem = query(
	v.object({
		slug: v.pipe(v.string(), v.nonEmpty()),
		itemSlug: v.pipe(v.string(), v.nonEmpty()),
		render: v.optional(v.picklist(['html']))
	}),
	async ({ slug, itemSlug, render }) => {
		const ctx = requestContext()
		return ctx.client.store.content.retrieveItem(
			slug,
			itemSlug,
			{ ...(render ? { render } : {}) },
			ctx.headers()
		)
	}
)
