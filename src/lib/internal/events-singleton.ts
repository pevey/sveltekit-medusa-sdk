// Private module singleton holding the browser event collector created by
// the <Analytics> layout component. `track`/`identify` (public, in ../events)
// delegate to it. Only ever set in the browser, so SSR keeps it null (no
// cross-request state leak).
import type { Collector } from 'medusa-js-sdk'

let collector: Collector | null = null

export function setCollector(c: Collector): void {
	collector = c
}

export function clearCollector(): void {
	collector = null
}

export function getCollector(): Collector | null {
	return collector
}
