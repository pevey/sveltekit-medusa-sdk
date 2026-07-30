// Pure conversion of catalog list arguments into Medusa store-API query params.
// Kept separate from the remote modules so it is unit-testable without $app/server.

export type ListArgs = {
	limit?: number
	offset?: number
	order?: string
	q?: string
	category_id?: string | string[]
	collection_id?: string | string[]
	type_id?: string | string[]
	parent_category_id?: string
}

function num(v: number | undefined): string | undefined {
	// `offset: 0` is meaningful, so test for null/negative rather than truthiness.
	if (v == null || !Number.isFinite(v) || v < 0) return undefined
	return String(Math.floor(v))
}

function str(v: string | undefined): string | undefined {
	return v ? v : undefined
}

function rel(v: string | string[] | undefined): string | string[] | undefined {
	if (Array.isArray(v)) return v.length ? v : undefined
	return v ? v : undefined
}

export function listParams(a: ListArgs): Record<string, string | string[]> {
	const p: Record<string, string | string[]> = {}
	const limit = num(a.limit)
	if (limit !== undefined) p.limit = limit
	const offset = num(a.offset)
	if (offset !== undefined) p.offset = offset
	const order = str(a.order)
	if (order !== undefined) p.order = order
	const q = str(a.q)
	if (q !== undefined) p.q = q
	const category_id = rel(a.category_id)
	if (category_id !== undefined) p.category_id = category_id
	const collection_id = rel(a.collection_id)
	if (collection_id !== undefined) p.collection_id = collection_id
	const type_id = rel(a.type_id)
	if (type_id !== undefined) p.type_id = type_id
	const parent_category_id = str(a.parent_category_id)
	if (parent_category_id !== undefined) p.parent_category_id = parent_category_id
	return p
}
