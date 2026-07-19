import { form, command, getRequestEvent } from '$app/server'
import * as v from 'valibot'
import { createAuthClient, getClient, getConfig } from './internal/state'
import { parseSetCookieSession } from './internal/session'
import { stitchAnalyticsIdentity } from './server/events'
import type { AuthResult } from './types'

const credentialsSchema = v.object({
  email: v.pipe(v.string(), v.nonEmpty(), v.email()),
  password: v.pipe(v.string(), v.nonEmpty())
})

/**
 * Exchange a bearer token for a backend session and re-issue it to the storefront
 * under the configured (renamed) cookie. Transfers the anonymous cart on success.
 */
async function establishSession(token: string): Promise<boolean> {
  const cfg = getConfig()
  const { cookies } = getRequestEvent()
  const res = await fetch(`${cfg.baseUrl}/auth/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': cfg.publishableKey,
      ...cfg.globalHeaders,
      Authorization: `Bearer ${token}`
    }
  })
  if (!res.ok) return false
  const session = parseSetCookieSession(res.headers.getSetCookie?.() ?? [], cfg.backendSessionCookie, Date.now())
  if (!session) return false
  cookies.set(cfg.cookies.session, session.value, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    ...(session.maxAge ? { maxAge: session.maxAge } : {})
  })
  if (cfg.transferCartOnLogin) {
    const cartId = cookies.get(cfg.cookies.cart)
    if (cartId) {
      await getClient()
        .store.cart.transferCart(cartId, {}, { Cookie: `${cfg.backendSessionCookie}=${session.value}` })
        .catch(() => {})
    }
  }
  // Merge the anonymous analytics identity into this customer (best-effort).
  await stitchAnalyticsIdentity(session.value)
  return true
}

export const login = form(credentialsSchema, async ({ email, password }): Promise<AuthResult> => {
  const authClient = createAuthClient()
  let token: string
  try {
    const result = await authClient.auth.login('customer', 'emailpass', { email, password })
    if (typeof result !== 'string') return { ok: false, code: 'unsupported' }
    token = result
  } catch (e) {
    const err = e as { status?: number }
    if (err.status === 401) return { ok: false, code: 'invalid_credentials' }
    if (err.status === 429) return { ok: false, code: 'rate_limited' }
    return { ok: false, code: 'unknown' }
  }
  return (await establishSession(token)) ? { ok: true } : { ok: false, code: 'unknown' }
})

export const register = form(credentialsSchema, async ({ email, password }): Promise<AuthResult> => {
  const authClient = createAuthClient()
  let token: string
  try {
    const result = await authClient.auth.register('customer', 'emailpass', { email, password })
    if (typeof result !== 'string') return { ok: false, code: 'unsupported' }
    token = result
  } catch (e) {
    const err = e as { status?: number; message?: string }
    const message = String(err.message ?? '')
    if (err.status === 401 || err.status === 409 || /exist/i.test(message)) return { ok: false, code: 'email_exists' }
    return { ok: false, code: 'unknown' }
  }
  try {
    await authClient.store.customer.create({ email }, {}, { Authorization: `Bearer ${token}` })
  } catch {
    return { ok: false, code: 'unknown' }
  }
  // The register token has no actor attached yet — log in again to get a session token.
  const loginResult = await createAuthClient().auth.login('customer', 'emailpass', { email, password })
  if (typeof loginResult !== 'string') return { ok: false, code: 'unsupported' }
  return (await establishSession(loginResult)) ? { ok: true } : { ok: false, code: 'unknown' }
})

export const requestResetPassword = form(
  v.object({ email: v.pipe(v.string(), v.nonEmpty(), v.email()) }),
  async ({ email }): Promise<AuthResult> => {
    try {
      await getClient().auth.resetPassword('customer', 'emailpass', { identifier: email })
    } catch {
      // Do not reveal whether the email exists.
    }
    return { ok: true }
  }
)

export const resetPassword = form(
  v.object({
    password: v.pipe(v.string(), v.nonEmpty()),
    token: v.pipe(v.string(), v.nonEmpty())
  }),
  async ({ password, token }): Promise<AuthResult> => {
    try {
      await getClient().auth.updateProvider('customer', 'emailpass', { password }, token)
      return { ok: true }
    } catch {
      return { ok: false, code: 'unknown' }
    }
  }
)

export const logout = command(async (): Promise<AuthResult> => {
  const { cookies } = getRequestEvent()
  const cfg = getConfig()
  cookies.delete(cfg.cookies.session, { path: '/' })
  // Start a fresh anonymous identity for the next visitor on this device (the
  // handle re-issues one on the next request).
  cookies.delete(cfg.cookies.anonymousId, { path: '/' })
  return { ok: true }
})
