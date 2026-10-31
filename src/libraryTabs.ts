export type TabClasses = {
	Tab?: string
	Selected?: string
	Active?: string
	TabTitle?: string
}

type ElementLike = {
	textContent: string | null
	querySelector?: (selector: string) => ElementLike | null
}

export type DocumentLike = {
	querySelectorAll: (selector: string) => ArrayLike<ElementLike>
}

const usableClass = (name?: string) =>
	name && !/\s/.test(name) ? name : undefined

/**
 * Reads the title of the highlighted tab in Steam's library tab bar (this
 * includes tabs made by Tab Master). Returns undefined when the library is not
 * on screen or the tab bar cannot be read.
 */
export const findSelectedTabLabel = (
	doc: DocumentLike,
	classes: TabClasses
): string | undefined => {
	const tabClass = usableClass(classes.Tab)
	if (!tabClass) return undefined
	const titleClass = usableClass(classes.TabTitle)

	for (const stateClass of [classes.Selected, classes.Active]) {
		const state = usableClass(stateClass)
		if (!state) continue

		const tabs = doc.querySelectorAll(`.${tabClass}.${state}`)
		for (let index = 0; index < tabs.length; index += 1) {
			const tab = tabs[index]
			const title = titleClass
				? tab.querySelector?.(`.${titleClass}`)
				: undefined
			const label = (title?.textContent ?? tab.textContent ?? "").trim()
			if (label) return label
		}
	}

	return undefined
}
