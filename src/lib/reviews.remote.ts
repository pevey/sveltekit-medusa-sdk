import { query, command, form, getRequestEvent } from '$app/server'
import * as v from 'valibot'
import { requestContext } from './server/request'
import { getConfig } from './internal/state'

function isAuthenticated(): boolean {
	return !!getRequestEvent().cookies.get(getConfig().cookies.session)
}

/**
 * List approved reviews for a product (requires the reviews plugin on the
 * backend). Replays the session so a signed-in customer also gets their own
 * still-pending reviews.
 */
export const getReviews = query(
	v.object({
		productId: v.pipe(v.string(), v.nonEmpty()),
		limit: v.optional(v.number()),
		offset: v.optional(v.number()),
		order: v.optional(v.string()),
		featured: v.optional(v.boolean()),
		rating: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(5)))
	}),
	async ({ productId, limit, offset, order, featured, rating }) => {
		const ctx = requestContext()
		return ctx.client.store.review.list(
			productId,
			{
				...(limit !== undefined ? { limit } : {}),
				...(offset !== undefined ? { offset } : {}),
				...(order !== undefined ? { order } : {}),
				...(featured !== undefined ? { featured } : {}),
				...(rating !== undefined ? { rating } : {})
			},
			ctx.headers()
		)
	}
)

/**
 * Create a review for a product. Requires a signed-in customer — the session
 * replayed via `ctx.headers()` supplies `customer_id`, and the review is created
 * with the backend's default (typically pending) status.
 */
export const createReview = command(
	v.object({
		productId: v.pipe(v.string(), v.nonEmpty()),
		rating: v.pipe(v.number(), v.minValue(1), v.maxValue(5)),
		title: v.optional(v.string()),
		body: v.pipe(v.string(), v.nonEmpty()),
		author_name: v.pipe(v.string(), v.nonEmpty()),
		author_email: v.optional(v.pipe(v.string(), v.email())),
		order_id: v.optional(v.string())
	}),
	async ({ productId, ...input }) => {
		const ctx = requestContext()
		return ctx.client.store.review.create(productId, input, ctx.headers())
	}
)

/**
 * Edit the signed-in customer's own review. The session replayed via `ctx.headers()`
 * supplies `customer_id`; the backend rejects a non-owner with 403 and resets the
 * review to its default (typically pending) status for re-moderation. Callers should
 * refresh the list afterwards, e.g. `await getReviews({ productId }).refresh()`.
 */
export const updateReview = command(
	v.object({
		productId: v.pipe(v.string(), v.nonEmpty()),
		reviewId: v.pipe(v.string(), v.nonEmpty()),
		rating: v.pipe(v.number(), v.minValue(1), v.maxValue(5)),
		title: v.optional(v.string()),
		body: v.pipe(v.string(), v.nonEmpty()),
		author_name: v.pipe(v.string(), v.nonEmpty()),
		order_id: v.optional(v.string())
	}),
	async ({ productId, reviewId, ...input }) => {
		const ctx = requestContext()
		return ctx.client.store.review.update(productId, reviewId, input, ctx.headers())
	}
)

/**
 * Delete the signed-in customer's own review. The session replayed via `ctx.headers()`
 * supplies `customer_id`; the backend rejects a non-owner with 403. Callers should
 * refresh the list afterwards, e.g. `await getReviews({ productId }).refresh()`.
 */
export const deleteReview = command(
	v.object({
		productId: v.pipe(v.string(), v.nonEmpty()),
		reviewId: v.pipe(v.string(), v.nonEmpty())
	}),
	async ({ productId, reviewId }) => {
		const ctx = requestContext()
		return ctx.client.store.review.delete(productId, reviewId, ctx.headers())
	}
)

/** Aggregate rating summary (average, count, per-star distribution) for a product. */
export const getReviewSummary = query(v.object({ productId: v.pipe(v.string(), v.nonEmpty()) }), async ({ productId }) => {
	const ctx = requestContext()
	return ctx.client.store.review.summary(productId, ctx.headers())
})

/**
 * List reviews created by the signed-in customer across all products.
 * Requires authentication — unauthenticated requests return { reviews: [], count: 0 }.
 * Shows all review statuses (pending, approved, rejected) for the owner.
 */
export const getMyReviews = query(
	v.object({
		limit: v.optional(v.number()),
		offset: v.optional(v.number()),
		order: v.optional(v.string()),
		status: v.optional(v.picklist(['pending', 'approved', 'rejected']))
	}),
	async ({ limit, offset, order, status }) => {
		if (!isAuthenticated()) return { reviews: [], count: 0 }

		const ctx = requestContext()
		return ctx.client.store.review.listMine(
			{
				...(limit !== undefined ? { limit } : {}),
				...(offset !== undefined ? { offset } : {}),
				...(order !== undefined ? { order } : {}),
				...(status !== undefined ? { status } : {})
			},
			ctx.headers()
		)
	}
)

/**
 * Submit a review via a native form (progressive-enhancement). Requires a signed-in
 * customer; the session replayed via `ctx.headers()` supplies `customer_id`. Form fields
 * arrive as strings, hence the `rating` string→number coercion.
 */
export const reviewForm = form(
	v.object({
		productId: v.pipe(v.string(), v.nonEmpty()),
		author_name: v.pipe(v.string(), v.nonEmpty('Please enter your name.')),
		rating: v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1, 'Please choose a rating.'), v.maxValue(5)),
		title: v.optional(v.string()),
		body: v.pipe(v.string(), v.nonEmpty('Please write your review.'))
	}),
	async ({ productId, ...input }) => {
		if (!isAuthenticated()) return { ok: false as const, code: 'unauthenticated' as const }
		const ctx = requestContext()
		try {
			const { review } = await ctx.client.store.review.create(productId, input, ctx.headers())
			return { ok: true as const, review }
		} catch (e: any) {
			if (e?.status === 401) return { ok: false as const, code: 'unauthenticated' as const }
			return { ok: false as const, code: 'error' as const }
		}
	}
)
