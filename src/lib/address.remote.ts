import { query, command, form, getRequestEvent } from '$app/server'
import * as v from 'valibot'
import { requestContext } from './server/request'
import { getConfig } from './internal/state'

function isAuthenticated(): boolean {
  return !!getRequestEvent().cookies.get(getConfig().cookies.session)
}

export const getAddresses = query(async () => {
  if (!isAuthenticated()) return []
  const ctx = requestContext()
  const { addresses } = await ctx.client.store.customer.listAddress({}, ctx.headers())
  return addresses
})

export const saveAddress = form(
  v.object({
    id: v.optional(v.string()),
    first_name: v.pipe(v.string(), v.nonEmpty()),
    last_name: v.pipe(v.string(), v.nonEmpty()),
    company: v.optional(v.string()),
    address_1: v.pipe(v.string(), v.nonEmpty()),
    address_2: v.optional(v.string()),
    city: v.pipe(v.string(), v.nonEmpty()),
    province: v.optional(v.string()),
    postal_code: v.pipe(v.string(), v.nonEmpty()),
    country_code: v.pipe(v.string(), v.nonEmpty()),
    phone: v.optional(v.string())
  }),
  async ({ id, ...address }) => {
    const ctx = requestContext()
    if (id) {
      const { customer } = await ctx.client.store.customer.updateAddress(id, address, {}, ctx.headers())
      return { ok: true as const, customer }
    }
    const { customer } = await ctx.client.store.customer.createAddress(address, {}, ctx.headers())
    return { ok: true as const, customer }
  }
)

export const deleteAddress = command(v.pipe(v.string(), v.nonEmpty()), async (addressId: string) => {
  const ctx = requestContext()
  await ctx.client.store.customer.deleteAddress(addressId, ctx.headers())
  return { ok: true as const }
})
