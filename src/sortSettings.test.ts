import { describe, expect, test } from "vitest"

import { availableRouletteSources, RouletteSource } from "./gamePools"
import {
	getNextSortMode,
	loadRouletteTimestamps,
	loadSortMode,
	ROULETTE_TIMESTAMPS_KEY,
	saveRouletteTimestamp,
	saveSortMode,
	SORT_MODE_KEY,
	SortMode,
	sortSources,
	StorageLike,
} from "./sortSettings"

const memoryStorage = (initial: Record<string, string> = {}): StorageLike => {
	const values = new Map(Object.entries(initial))
	return {
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => void values.set(key, value),
	}
}

const collectionSource = (
	id: string,
	label: string,
	lastPlayed = 0
): RouletteSource => ({
	id: `collection:${id}`,
	kind: "collection",
	label,
	appIds: [1],
	collectionId: id,
	lastPlayed,
})

const builtIn = (kind: "installed" | "my-games", label: string): RouletteSource => ({
	id: `builtin:${kind}`,
	kind,
	label,
	appIds: [1],
	lastPlayed: 999,
})

const labels = (sources: RouletteSource[]) => sources.map(({ label }) => label)

describe("sort modes", () => {
	test("cycles through every mode and wraps around", () => {
		let mode: SortMode = SortMode.Alphabetical
		const seen: SortMode[] = [mode]
		for (let index = 0; index < 3; index += 1) {
			mode = getNextSortMode(mode)
			seen.push(mode)
		}
		expect(seen).toEqual([
			SortMode.Alphabetical,
			SortMode.RecentlyRouletted,
			SortMode.RecentlyOpened,
			SortMode.Alphabetical,
		])
	})

	test("defaults to alphabetical for missing, unknown, or legacy values", () => {
		expect(loadSortMode(memoryStorage())).toBe(SortMode.Alphabetical)
		expect(
			loadSortMode(memoryStorage({ [SORT_MODE_KEY]: "recently-created" }))
		).toBe(SortMode.Alphabetical)
		expect(loadSortMode(undefined)).toBe(SortMode.Alphabetical)
	})

	test("persists the chosen mode", () => {
		const storage = memoryStorage()
		saveSortMode(SortMode.RecentlyOpened, storage)
		expect(loadSortMode(storage)).toBe(SortMode.RecentlyOpened)
	})
})

describe("roulette timestamps", () => {
	test("records the most recent use per source", () => {
		const storage = memoryStorage()
		saveRouletteTimestamp("collection:a", storage, 100)
		const timestamps = saveRouletteTimestamp("collection:b", storage, 200)
		expect(timestamps).toEqual({ "collection:a": 100, "collection:b": 200 })
		expect(loadRouletteTimestamps(storage)).toEqual(timestamps)
	})

	test("ignores corrupt stored data", () => {
		expect(
			loadRouletteTimestamps(memoryStorage({ [ROULETTE_TIMESTAMPS_KEY]: "{oops" }))
		).toEqual({})
		expect(
			loadRouletteTimestamps(
				memoryStorage({ [ROULETTE_TIMESTAMPS_KEY]: '{"a":"x","b":5}' })
			)
		).toEqual({ b: 5 })
	})
})

describe("sortSources", () => {
	const sources = [
		collectionSource("z", "Zebra", 50),
		builtIn("installed", "Installed"),
		collectionSource("a", "Apple", 10),
		builtIn("my-games", "My Games"),
		collectionSource("m", "Mango", 90),
	]

	test("alphabetical keeps built-ins first, then collections A-Z", () => {
		expect(labels(sortSources(sources, SortMode.Alphabetical))).toEqual([
			"Installed",
			"My Games",
			"Apple",
			"Mango",
			"Zebra",
		])
	})

	test("recently rouletted puts latest use first, ties alphabetical", () => {
		const timestamps = { "collection:z": 300, "collection:a": 100 }
		expect(
			labels(sortSources(sources, SortMode.RecentlyRouletted, timestamps))
		).toEqual(["Installed", "My Games", "Zebra", "Apple", "Mango"])
	})

	test("recently rouletted understands the fork's raw collection IDs", () => {
		expect(
			labels(sortSources(sources, SortMode.RecentlyRouletted, { m: 5 }))
		).toEqual(["Installed", "My Games", "Mango", "Apple", "Zebra"])
	})

	test("recently opened orders by last played time", () => {
		expect(labels(sortSources(sources, SortMode.RecentlyOpened))).toEqual([
			"Installed",
			"My Games",
			"Mango",
			"Zebra",
			"Apple",
		])
	})

	test("does not mutate its input", () => {
		const copy = [...sources]
		sortSources(sources, SortMode.RecentlyOpened)
		expect(sources).toEqual(copy)
	})

	test("availableRouletteSources reports the latest played time per list", () => {
		const collection = (id: string, name: string, played: number[]) =>
			({
				id,
				displayName: name,
				visibleApps: played.map((time, index) => ({
					appid: index + 1,
					rt_last_time_played: time,
				})),
			}) as unknown as SteamCollection
		const store = {
			userCollections: [collection("c1", "Cozy", [5, 20, 0])],
			localGamesCollection: collection("local-install", "Installed", [7]),
			myGamesCollection: collection("my-games", "My Games", [3, 9]),
		} as unknown as CollectionStore

		const result = availableRouletteSources(store, [])
		expect(result.map(({ lastPlayed }) => lastPlayed)).toEqual([7, 9, 20])
	})
})
