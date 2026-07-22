/**
 * Merge the SDK's baseline Medusa `fields` tokens with a consumer's `fields` string
 * (Medusa's comma-separated select syntax: `+add`, `-omit`, `*relation`, bare `field`).
 *
 * A baseline token is DROPPED when the consumer already references that same bare field
 * (regardless of the consumer's `+`/`-`/`*` prefix), so an explicit strip or override
 * wins instead of fighting the baseline; otherwise the baseline is kept and the
 * consumer's tokens are appended. With no consumer fields, just the baseline is returned.
 *
 * @example mergeFields(['*variants.calculated_price'])                                → '*variants.calculated_price'
 * @example mergeFields(['*variants.calculated_price'], '+variants.inventory_quantity') → '*variants.calculated_price,+variants.inventory_quantity'
 * @example mergeFields(['*variants.calculated_price'], '-variants.calculated_price')   → '-variants.calculated_price'
 */
export function mergeFields(baseline: string[], fields?: string): string {
  const consumer = (fields ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  const bare = (t: string) => t.replace(/^[+\-*]/, '')
  const consumerBare = new Set(consumer.map(bare))
  const kept = baseline.filter((b) => !consumerBare.has(bare(b)))
  return [...kept, ...consumer].join(',')
}
