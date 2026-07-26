import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vitest/config'
import adapter from '@sveltejs/adapter-auto'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

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
