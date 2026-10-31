import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import {
	collectionIdFromLocation,
	loadCollectionVisits,
	loadRouteSamples,
	recordCollectionVisit,
	startCollectionVisitTracker,
} from "./collectionVisits"
import type { RouletteSource } from "./gamePools"
import { SortMode, sortSources, StorageLike } from "./sortSettings"

const memoryStorage = (): StorageLike => {
	const values = new Map<string, string>()
	return {
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => void values.set(key, value),
	}
}

describe("collectionIdFromLocation", () => {
	test("finds the collection ID in a library collection route", () => {
		expect(collectionIdFromLocation("/library/collection/uc-123")).toBe(
			"uc-123"
		)
		expect(collectionIdFromLocation("/routes/library/collection/uc%2D5?x=1")).toBe(
			"uc-5"
		)
		expect(collectionIdFromLocation("/library/collections/uc-9")).toBe("uc-9")
	})

	test("ignores other pages", () => {
		expect(collectionIdFromLocation("/library/app/123")).toBeUndefined()
		expect(collectionIdFromLocation("/library/home")).toBeUndefined()
		expect(collectionIdFromLocation("/library/collections")).toBeUndefined()
		expect(
			collectionIdFromLocation("/deck-roulette/settings/shortcuts")
		).toBeUndefined()
		expect(collectionIdFromLocation(undefined)).toBeUndefined()
	})
})

describe("startCollectionVisitTracker", () => {
	beforeEach(() => vi.useFakeTimers())
	afterEach(() => vi.useRealTimers())

	test("records one visit per entry into a collection, not per poll", () => {
		const storage = memoryStorage()
		let location = "/library/home"
		let now = 1000
		const stop = startCollectionVisitTracker(() => ({ main: location }), {
			storage,
			now: () => now,
		})

		vi.advanceTimersByTime(3000)
		expect(loadCollectionVisits(storage)).toEqual({})

		location = "/library/collection/uc-a"
		now = 2000
		vi.advanceTimersByTime(3000)
		expect(loadCollectionVisits(storage)).toEqual({ "collection:uc-a": 2000 })

		location = "/library/app/5"
		vi.advanceTimersByTime(1000)
		location = "/library/collection/uc-a"
		now = 9000
		vi.advanceTimersByTime(1000)
		expect(loadCollectionVisits(storage)).toEqual({ "collection:uc-a": 9000 })

		stop()
		location = "/library/collection/uc-b"
		vi.advanceTimersByTime(5000)
		expect(loadCollectionVisits(storage)["collection:uc-b"]).toBeUndefined()
	})

	test("finds a collection reported by any source and logs what it saw", () => {
		const storage = memoryStorage()
		let history: string | undefined = "/library/home"
		const stop = startCollectionVisitTracker(
			() => ({
				"steam-history": history,
				"this-window": "/routes/shared",
				missing: undefined,
			}),
			{ storage, now: () => 42 }
		)

		history = "/library/collection/uc-x"
		vi.advanceTimersByTime(2000)
		stop()

		expect(loadCollectionVisits(storage)).toEqual({ "collection:uc-x": 42 })
		expect(loadRouteSamples(storage)).toEqual([
			{ source: "steam-history", path: "/library/home" },
			{ source: "this-window", path: "/routes/shared" },
			{ source: "steam-history", path: "/library/collection/uc-x" },
		])
	})

	test("survives location lookups that throw", () => {
		const stop = startCollectionVisitTracker(
			() => {
				throw new Error("not ready")
			},
			{ storage: memoryStorage() }
		)
		expect(() => vi.advanceTimersByTime(2000)).not.toThrow()
		stop()
	})
})

describe("Recently Opened with collection visits", () => {
	const source = (id: string, label: string, lastPlayed = 0): RouletteSource => ({
		id: `collection:${id}`,
		kind: "collection",
		label,
		appIds: [1],
		collectionId: id,
		lastPlayed,
	})

	test("a collection you just visited outranks one with older play history", () => {
		const sources = [
			source("a", "Apple", 1_000), // played at 1,000,000 ms
			source("b", "Banana", 0), // never played, but visited later
			source("c", "Cherry", 0),
		]
		const visits = recordCollectionVisit("b", memoryStorage(), 5_000_000)

		expect(
			sortSources(sources, SortMode.RecentlyOpened, {}, visits).map(
				({ label }) => label
			)
		).toEqual(["Banana", "Apple", "Cherry"])
	})

	test("a game played after the last visit wins", () => {
		const sources = [source("a", "Apple", 9_000), source("b", "Banana", 0)]
		const visits = recordCollectionVisit("b", memoryStorage(), 5_000_000)

		expect(
			sortSources(sources, SortMode.RecentlyOpened, {}, visits).map(
				({ label }) => label
			)
		).toEqual(["Apple", "Banana"])
	})
})
