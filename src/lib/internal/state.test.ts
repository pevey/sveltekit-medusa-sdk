import { describe, it, expect, beforeEach } from 'vitest'
import { setConfig, getClient, getConfig, createAuthClient, __resetForTest } from './state'

const cfg = { baseUrl: 'http://localhost:9000', publishableKey: 'pk_test' }

describe('state', () => {
	beforeEach(() => __resetForTest())

	it('throws before configuration', () => {
		expect(() => getClient()).toThrow(/configured/)
		expect(() => getConfig()).toThrow(/config/)
	})

	it('builds one shared client and returns the same instance', () => {
		setConfig(cfg)
		const a = getClient()
		const b = getClient()
		expect(a).toBe(b)
		expect(getConfig().baseUrl).toBe('http://localhost:9000')
	})

	it('is idempotent — first config wins', () => {
		setConfig(cfg)
		const first = getClient()
		setConfig({ ...cfg, baseUrl: 'http://other:9000' })
		expect(getClient()).toBe(first)
		expect(getConfig().baseUrl).toBe('http://localhost:9000')
	})

	it('createAuthClient returns a fresh instance, not the shared one', () => {
		setConfig(cfg)
		expect(createAuthClient()).not.toBe(getClient())
	})
})
