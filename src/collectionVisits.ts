import { collectionSourceId } from "./gamePools"
import type { StorageLike } from "./sortSettings"

export const COLLECTION_VISITS_KEY = "deck-roulette-collection-visits"

const COLLECTION_ROUTE = /\/library\/collection\/([^/?#]+)/

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

export const recordCollectionVisit = (
	collectionId: string,
	storage: StorageLike | undefined = defaultStorage(),
	now: number = Date.now()
) => {
	const visits = {
		...loadCollectionVisits(storage),
		[collectionSourceId(collectionId)]: now,
	}
	try {
		storage?.setItem(COLLECTION_VISITS_KEY, JSON.stringify(visits))
	} catch {
		/* ignore */
	}
	return visits
}

/**
 * Watches the Steam UI's current location and records a visit each time the
 * user navigates into a library collection. Returns a function that stops it.
 */
export const startCollectionVisitTracker = (
	getLocation: () => string | undefined,
	options: {
		storage?: StorageLike
		intervalMs?: number
		now?: () => number
	} = {}
) => {
	let lastCollectionId: string | undefined
	const check = () => {
		let location: string | undefined
		try {
			location = getLocation()
		} catch {
			return
		}
		const collectionId = collectionIdFromLocation(location)
		if (collectionId && collectionId !== lastCollectionId) {
			recordCollectionVisit(
				collectionId,
				options.storage ?? defaultStorage(),
				options.now?.()
			)
		}
		lastCollectionId = collectionId
	}

	check()
	const interval = setInterval(check, options.intervalMs ?? 1000)
	return () => clearInterval(interval)
}
