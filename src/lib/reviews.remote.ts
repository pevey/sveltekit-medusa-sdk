import { query, command } from '$app/server'
import * as v from 'valibot'
import { requestContext } from './server/request'

/**
 * List approved reviews for a product (requires the reviews plugin on the
 * backend). Replays the session so a signed-in customer also gets their own
 * still-pending reviews.
 */
export const getReviews = query(
	v.object({
		productId: v.pipe(v.string(), v.nonEmpty()),
		limit: v.optional(v.number()),
		offset: v.optional(v.number())
	}),
	async ({ productId, limit, offset }) => {
		const ctx = requestContext()
		return ctx.client.store.review.list(
			productId,
			{
				...(limit !== undefined ? { limit } : {}),
				...(offset !== undefined ? { offset } : {})
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
