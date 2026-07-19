import { getClient, getConfig } from './state'

let resolved = false
let cachedRegionId: string | undefined

/**
 * Pure region-default decision: a configured id wins; otherwise a single-region backend's
 * only region; otherwise undefined (zero or multiple regions with no configured default).
 */
export function pickDefaultRegionId(
  configured: string | undefined,
  regions: { id: string }[]
): string | undefined {
  if (configured) return configured
  return regions.length === 1 ? regions[0].id : undefined
}

/**
 * The effective default region id, resolved lazily and cached for the server's lifetime:
 *
 * 1. `config.defaultRegionId` if set, else
 * 2. when the backend has exactly **one** region, that region's id (fetched once), else
 * 3. `undefined` — a multi-region backend with no configured default, so the caller must
 *    pass `region_id` explicitly.
 *
 * This lets a single-region store work with zero region configuration.
 */
export async function getDefaultRegionId(): Promise<string | undefined> {
  const configured = getConfig().defaultRegionId
  if (configured) return configured
  if (resolved) return cachedRegionId
  const { regions } = await getClient().store.region.list()
  cachedRegionId = pickDefaultRegionId(undefined, regions)
  resolved = true
  return cachedRegionId
}

/** Test-only: clear the cached single-region lookup. */
export function __resetRegionCache(): void {
  resolved = false
  cachedRegionId = undefined
}
