<script lang="ts">
	import { page } from '$app/state'
	import { captureAffiliate } from '../affiliate.remote'

	interface Props {
		/** URL query param carrying the affiliate code (e.g. `?via=alice`). */
		param?: string
	}

	let { param = 'via' }: Props = $props()

	let lastCode: string | undefined

	// Capture the affiliate code whenever it appears in the URL — on landing or a
	// client-side navigation. Effects run only in the browser, so the command is
	// never invoked during SSR. The command sets the cookie and (if a cart exists)
	// applies the code; a pending code is applied on cart creation otherwise.
	$effect(() => {
		const code = page.url.searchParams.get(param)
		if (code && code !== lastCode) {
			lastCode = code
			void captureAffiliate({ code })
		}
	})
</script>
