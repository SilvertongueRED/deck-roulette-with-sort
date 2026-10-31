import { collectionSourceId } from "./gamePools"
import type { StorageLike } from "./sortSettings"

export const COLLECTION_VISITS_KEY = "deck-roulette-collection-visits"

// Steam's library route has been seen as /library/collection/<id>; stay loose
// about the prefix so a different mount point (or plural) still matches.
const COLLECTION_ROUTE = /\/collections?\/([^/?#]+)/

const defaultStorage = (): StorageLike | undefined => {
	try {
		return typeof localStorage === "undefined" ? undefined : localStorage
	} catch {
		return undefined
	}
}

/** Returns the collection ID when `location` is a library collection page. */
export const collectionIdFromLocation = (location?: string) => {
	const match = location ? COLLECTION_ROUTE.exec(location) : null
	if (!match) return undefined

	try {
		return decodeURIComponent(match[1])
	} catch {
		return match[1]
	}
}

export const loadCollectionVisits = (
	storage: StorageLike | undefined = defaultStorage()
): Record<string, number> => {
	try {
		const stored = storage?.getItem(COLLECTION_VISITS_KEY)
		const parsed = stored ? JSON.parse(stored) : undefined
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return Object.fromEntries(
				Object.entries(parsed).filter(
					([, value]) => typeof value === "number"
				)
			) as Record<string, number>
		}
	} catch {
		/* ignore */
	}
	return {}
}

export const recordSourceVisit = (
	sourceId: string,
	storage: StorageLike | undefined = defaultStorage(),
	now: number = Date.now()
) => {
	const visits = {
		...loadCollectionVisits(storage),
		[sourceId]: now,
	}
	try {
		storage?.setItem(COLLECTION_VISITS_KEY, JSON.stringify(visits))
	} catch {
		/* ignore */
	}
	return visits
}

export const recordCollectionVisit = (
	collectionId: string,
	storage: StorageLike | undefined = defaultStorage(),
	now: number = Date.now()
) => recordSourceVisit(collectionSourceId(collectionId), storage, now)

/**
 * Watches every place the Steam UI might report its current page and records
 * a visit each time the user navigates into a library collection. Returns a
 * function that stops it.
 */
export const startCollectionVisitTracker = (
	getLocations: () => Record<string, string | undefined>,
	options: {
		storage?: StorageLike
		intervalMs?: number
		now?: () => number
	} = {}
) => {
	let lastCollectionId: string | undefined
	const check = () => {
		const storage = options.storage ?? defaultStorage()
		let locations: Record<string, string | undefined>
		try {
			locations = getLocations()
		} catch {
			return
		}

		let collectionId: string | undefined
		for (const path of Object.values(locations)) {
			if (path === undefined) continue
			collectionId ??= collectionIdFromLocation(path)
		}

		if (collectionId && collectionId !== lastCollectionId) {
			recordCollectionVisit(collectionId, storage, options.now?.())
		}
		lastCollectionId = collectionId
	}

	check()
	const interval = setInterval(check, options.intervalMs ?? 1000)
	return () => clearInterval(interval)
}

/**
 * Watches which library tab is highlighted (Steam's own tabs and Tab Master
 * tabs do not change the page address) and records a visit when it changes to
 * a tab whose title matches one of your collections.
 */
export const startLibraryTabTracker = (
	getTabLabel: () => string | undefined,
	resolveSourceId: (label: string) => string | undefined,
	options: {
		storage?: StorageLike
		intervalMs?: number
		now?: () => number
	} = {}
) => {
	let primed = false
	let lastLabel: string | undefined
	const check = () => {
		const storage = options.storage ?? defaultStorage()
		let label: string | undefined
		try {
			label = getTabLabel()
		} catch {
			return
		}

		if (label !== lastLabel) {
			// The first reading is only the starting point, not a visit.
			if (primed && label) {
				let sourceId: string | undefined
				try {
					sourceId = resolveSourceId(label)
				} catch {
					sourceId = undefined
				}
				if (sourceId) recordSourceVisit(sourceId, storage, options.now?.())
			}
		}
		primed = true
		lastLabel = label
	}

	check()
	const interval = setInterval(check, options.intervalMs ?? 1000)
	return () => clearInterval(interval)
}
