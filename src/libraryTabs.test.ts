import { describe, expect, test } from "vitest"

import { findSelectedTabLabel } from "./libraryTabs"

const element = (text: string, title?: string) => ({
	textContent: text,
	querySelector: () => (title === undefined ? null : { textContent: title }),
})

const documentWith = (matches: Record<string, ReturnType<typeof element>[]>) => ({
	querySelectorAll: (selector: string) => matches[selector] ?? [],
})

const classes = { Tab: "t1", Selected: "sel", Active: "act", TabTitle: "ttl" }

describe("findSelectedTabLabel", () => {
	test("reads the title of the selected tab", () => {
		const doc = documentWith({ ".t1.sel": [element("Cozy 77", "Cozy")] })
		expect(findSelectedTabLabel(doc, classes)).toBe("Cozy")
	})

	test("falls back to the active tab, and to the whole tab text", () => {
		const doc = documentWith({ ".t1.act": [element("  Horror ")] })
		expect(findSelectedTabLabel(doc, classes)).toBe("Horror")
	})

	test("returns nothing when the library tab bar is not showing", () => {
		expect(findSelectedTabLabel(documentWith({}), classes)).toBeUndefined()
	})

	test("returns nothing when class names are unavailable", () => {
		const doc = documentWith({ ".t1.sel": [element("Cozy", "Cozy")] })
		expect(findSelectedTabLabel(doc, {})).toBeUndefined()
		expect(
			findSelectedTabLabel(doc, { ...classes, Tab: "has space" })
		).toBeUndefined()
	})
})
