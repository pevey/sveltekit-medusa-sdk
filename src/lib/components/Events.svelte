<script lang="ts">
	import { browser } from '$app/env'
	import { createCollector } from 'medusa-js-sdk'
	import { setCollector, clearCollector } from '../internal/events-singleton'

	interface Props {
		endpoint?: string
		batchSize?: number
		flushInterval?: number
	}

	let { endpoint = '/api/ping', batchSize, flushInterval }: Props = $props()

	// Create the collector once, browser-only, and register it as the singleton
	// that `track`/`identify` delegate to. Identity is server-stamped, so there is
	// no cart id to sync here. Cleanup destroys it and clears the singleton.
	$effect(() => {
		if (!browser) return

		const collector = createCollector({ endpoint, batchSize, flushInterval })
		setCollector(collector)

		return () => {
			collector.destroy()
			clearCollector()
		}
	})
</script>
