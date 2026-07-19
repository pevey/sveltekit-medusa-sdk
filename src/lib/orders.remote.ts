import { query } from '$app/server'
import * as v from 'valibot'
import { requestContext } from './server/request'

export const getOrders = query(async () => {
  const ctx = requestContext()
  const { orders } = await ctx.client.store.order.list({}, ctx.headers())
  return orders
})

export const getOrderById = query(v.pipe(v.string(), v.nonEmpty()), async (id: string) => {
  const ctx = requestContext()
  const { order } = await ctx.client.store.order.retrieve(id, {}, ctx.headers())
  return order ?? null
})
