import { command } from '$app/server'
import * as v from 'valibot'
import { requestContext } from './server/request'

/**
 * Generic form-submission primitive (requires the forms plugin on the backend).
 * Consumers build their own `form(schema, ...)` wrappers that call this with a
 * form handle, the submitted data, and an optional verification token.
 */
export const submitForm = command(
  v.object({
    handle: v.pipe(v.string(), v.nonEmpty()),
    data: v.record(v.string(), v.unknown()),
    token: v.optional(v.string())
  }),
  async ({ handle, data, token }) => {
    const ctx = requestContext()
    return ctx.client.store.form.submit(handle, { token, data }, ctx.headers())
  }
)
