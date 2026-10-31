import type { RouletteSource } from "./gamePools"

export enum SortMode {
	Alphabetical = "alphabetical",
	RecentlyRouletted = "recently-rouletted",
	RecentlyOpened = "recently-opened",
}

export const SORT_MODE_LABELS: Record<SortMode, string> = {
	[SortMode.Alphabetical]: "Alphabetical",
	[SortMode.RecentlyRouletted]: "Recently Rouletted",
	[SortMode.RecentlyOpened]: "Recently Opened",
}

const SORT_MODE_ORDER: SortMode[] = [
	SortMode.Alphabetical,
	SortMode.RecentlyRouletted,
	SortMode.RecentlyOpened,
]

export const DEFAULT_SORT_MODE = SortMode.Alphabetical

export const getNextSortMode = (current: SortMode): SortMode => {
	const currentIndex = SORT_MODE_ORDER.indexOf(current)
	return SORT_MODE_ORDER[(currentIndex + 1) % SORT_MODE_ORDER.length]
}

// Same keys the fork used, so existing preferences carry over.
export const SORT_MODE_KEY = "deck-roulette-sort-mode"
export const ROULETTE_TIMESTAMPS_KEY = "deck-roulette-roulette-timestamps"

export type StorageLike = Pick<Storage, "getItem" | "setItem">

const defaultStorage = (): StorageLike | undefined => {
	try {
		return typeof localStorage === "undefined" ? undefined : localStorage
	} catch {
		return undefined
	}
}

export const loadSortMode = (
	storage: StorageLike | undefined = defaultStorage()
): SortMode => {
	try {
		const stored = storage?.getItem(SORT_MODE_KEY)
		if (stored && SORT_MODE_ORDER.includes(stored as SortMode)) {
			return stored as SortMode
		}
	} catch {
		/* ignore */
	}
	// Unknown or legacy values (such as the fork's old "recently-created")
	// fall back to the alphabetical order the plugin has always used.
	return DEFAULT_SORT_MODE
}

export const saveSortMode = (
	mode: SortMode,
	storage: StorageLike | undefined = defaultStorage()
) => {
	try {
		storage?.setItem(SORT_MODE_KEY, mode)
	} catch {
		/* ignore */
	}
}

export const loadRouletteTimestamps = (
	storage: StorageLike | undefined = defaultStorage()
): Record<string, number> => {
	try {
		const stored = storage?.getItem(ROULETTE_TIMESTAMPS_KEY)
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

export const saveRouletteTimestamp = (
	sourceId: string,
	storage: StorageLike | undefined = defaultStorage(),
	now: number = Date.now()
): Record<string, number> => {
	const timestamps = { ...loadRouletteTimestamps(storage), [sourceId]: now }
	try {
		storage?.setItem(ROULETTE_TIMESTAMPS_KEY, JSON.stringify(timestamps))
	} catch {
		/* ignore */
	}
	return timestamps
}

const rouletteTime = (
	source: RouletteSource,
	timestamps: Record<string, number>
) =>
	timestamps[source.id] ??
	// The fork keyed timestamps by raw collection ID.
	(source.collectionId ? timestamps[source.collectionId] : undefined) ??
	0

/**
 * "Opened" means any of: you picked the list with the roulette button, you
 * visited it in the Steam Library, or you played a game from it, whichever
 * happened last. Roulette picks and visits are in milliseconds; Steam's
 * last-played times are in seconds.
 */
const openedTime = (
	source: RouletteSource,
	rouletteTimestamps: Record<string, number>,
	collectionVisits: Record<string, number>
) =>
	Math.max(
		rouletteTime(source, rouletteTimestamps),
		collectionVisits[source.id] ?? 0,
		(source.lastPlayed ?? 0) * 1000
	)

const byLabel = (left: RouletteSource, right: RouletteSource) =>
	left.label.localeCompare(right.label)

/**
 * Sorts roulette sources. The built-in Installed / My Games entries always stay
 * first (as they do today); collections follow in the chosen order. Ties in the
 * recency modes fall back to alphabetical.
 */
export const sortSources = (
	sources: RouletteSource[],
	mode: SortMode,
	rouletteTimestamps: Record<string, number> = {},
	collectionVisits: Record<string, number> = {}
): RouletteSource[] => {
	const builtIns = sources.filter(({ kind }) => kind !== "collection")
	const collections = sources.filter(({ kind }) => kind === "collection")

	const sortedCollections = [...collections].sort((left, right) => {
		switch (mode) {
			case SortMode.RecentlyRouletted: {
				const difference =
					rouletteTime(right, rouletteTimestamps) -
					rouletteTime(left, rouletteTimestamps)
				return difference || byLabel(left, right)
			}
			case SortMode.RecentlyOpened: {
				const difference =
					openedTime(right, rouletteTimestamps, collectionVisits) -
					openedTime(left, rouletteTimestamps, collectionVisits)
				return difference || byLabel(left, right)
			}
			default:
				return byLabel(left, right)
		}
	})

	return [...builtIns, ...sortedCollections]
}
