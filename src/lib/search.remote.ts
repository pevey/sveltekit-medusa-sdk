import { query } from '$app/server'
import * as v from 'valibot'
import { requestContext } from './server/request'

/**
 * Generic storefront search (requires the search plugin on the backend). Returns
 * the raw hits; consumers cast to their own hit type.
 */
export const search = query(
  v.object({ q: v.string(), limit: v.optional(v.number()) }),
  async ({ q, limit }) => {
    const term = q.trim()
    if (term.length < 2) return { hits: [] }
    const ctx = requestContext()
    const res = await ctx.client.store.search.query({ q: term, ...(limit ? { limit } : {}) }, ctx.headers())
    return { hits: res.hits ?? [] }
  }
)
