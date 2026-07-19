import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vitest/config'
import adapter from '@sveltejs/adapter-auto'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

// kit 3.0.0-next: config is passed (flattened) to the `sveltekit(...)` plugin —
// there is no `svelte.config.js` and no `kit:` wrapper.
export default defineConfig({
	plugins: [
		sveltekit({
			preprocess: vitePreprocess(),
			compilerOptions: { experimental: { async: true } },
			adapter: adapter(),
			experimental: { remoteFunctions: true }
		})
	],
	test: { include: ['src/**/*.{test,spec}.{js,ts}'] }
})
