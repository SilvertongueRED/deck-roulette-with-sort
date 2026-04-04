import { Router } from "decky-frontend-lib"

export const EXCLUDE_COLLECTION_IDS = ["local-install", "uncategorized"]

export const randomIndex = (max: number) => Math.floor(Math.random() * max)

export const navigateToRandomGame = (appIds: number[]) => {
	const randomAppId = appIds[randomIndex(appIds.length)]
	Router.Navigate(`/library/app/${randomAppId}}`)
	Router.CloseSideMenus()
}

// Sort mode definitions
export enum SortMode {
	RecentlyPlayed = "recently-played",
	RecentlyRouletted = "recently-rouletted",
	RecentlyCreated = "recently-created",
}

export const SORT_MODE_LABELS: Record<SortMode, string> = {
	[SortMode.RecentlyPlayed]: "Recently Played",
	[SortMode.RecentlyRouletted]: "Recently Rouletted",
	[SortMode.RecentlyCreated]: "Recently Created",
}

const SORT_MODE_ORDER: SortMode[] = [
	SortMode.RecentlyPlayed,
	SortMode.RecentlyRouletted,
	SortMode.RecentlyCreated,
]

export const getNextSortMode = (current: SortMode): SortMode => {
	const currentIndex = SORT_MODE_ORDER.indexOf(current)
	return SORT_MODE_ORDER[(currentIndex + 1) % SORT_MODE_ORDER.length]
}

// Persistence keys
const SORT_MODE_KEY = "deck-roulette-sort-mode"
const ROULETTE_TIMESTAMPS_KEY = "deck-roulette-roulette-timestamps"

export const loadSortMode = (): SortMode => {
	try {
		const stored = localStorage.getItem(SORT_MODE_KEY)
		if (
			stored &&
			Object.values(SortMode).includes(stored as SortMode)
		) {
			return stored as SortMode
		}
	} catch (_e) {
		/* ignore */
	}
	return SortMode.RecentlyCreated
}

export const saveSortMode = (mode: SortMode): void => {
	try {
		localStorage.setItem(SORT_MODE_KEY, mode)
	} catch (_e) {
		/* ignore */
	}
}

export const loadRouletteTimestamps = (): Record<string, number> => {
	try {
		const stored = localStorage.getItem(ROULETTE_TIMESTAMPS_KEY)
		if (stored) return JSON.parse(stored)
	} catch (_e) {
		/* ignore */
	}
	return {}
}

export const saveRouletteTimestamp = (
	collectionId: string
): Record<string, number> => {
	const timestamps = loadRouletteTimestamps()
	timestamps[collectionId] = Date.now()
	try {
		localStorage.setItem(
			ROULETTE_TIMESTAMPS_KEY,
			JSON.stringify(timestamps)
		)
	} catch (_e) {
		/* ignore */
	}
	return timestamps
}

export const sortCollections = (
	collections: SteamCollection[],
	mode: SortMode,
	rouletteTimestamps: Record<string, number>
): SteamCollection[] => {
	const sorted = [...collections]
	switch (mode) {
		case SortMode.RecentlyPlayed:
			sorted.sort((a, b) => {
				const aMax = Math.max(
					0,
					...a.visibleApps.map(
						(app) => app.rt_last_time_played || 0
					)
				)
				const bMax = Math.max(
					0,
					...b.visibleApps.map(
						(app) => app.rt_last_time_played || 0
					)
				)
				return bMax - aMax
			})
			break
		case SortMode.RecentlyRouletted:
			sorted.sort((a, b) => {
				const aTime = rouletteTimestamps[a.id] || 0
				const bTime = rouletteTimestamps[b.id] || 0
				return bTime - aTime
			})
			break
		case SortMode.RecentlyCreated:
			break
	}
	return sorted
}
