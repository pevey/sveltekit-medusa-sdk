import { prerender } from '$app/server'
import { getClient } from './internal/state'

export const getRegions = prerender(async () => {
	const { regions } = await getClient().store.region.list()
	return regions
})
