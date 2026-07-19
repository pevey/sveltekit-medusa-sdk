import { query, command, getRequestEvent } from '$app/server'
import * as v from 'valibot'
import { requestContext } from './server/request'
import { getConfig } from './internal/state'

function isAuthenticated(): boolean {
  return !!getRequestEvent().cookies.get(getConfig().cookies.session)
}

export const getCustomer = query(async () => {
  if (!isAuthenticated()) return null
  const ctx = requestContext()
  const { customer } = await ctx.client.store.customer.retrieve({}, ctx.headers())
  return customer ?? null
})

export const updateCustomer = command(
  v.object({
    first_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    email: v.optional(v.pipe(v.string(), v.nonEmpty(), v.email())),
    phone: v.optional(v.string())
  }),
  async (data) => {
    const ctx = requestContext()
    const { customer } = await ctx.client.store.customer.update(data, {}, ctx.headers())
    return customer
  }
)
