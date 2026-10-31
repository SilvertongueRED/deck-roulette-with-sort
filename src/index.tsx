import { Router, staticClasses } from "@decky/ui"
import { definePlugin, routerHook } from "@decky/api"
import { GiPerspectiveDiceSixFacesRandom } from "react-icons/gi"

import { startCollectionVisitTracker } from "./collectionVisits"
import { CollectionSettings } from "./components/CollectionSettings"
import { QuickAccess } from "./components/QuickAccess"
import { SETTINGS_ROUTE } from "./routes"
import { SettingsStore } from "./settingsStore"

export default definePlugin(() => {
	const settingsStore = new SettingsStore()
	// Remember which library collections you open so "Recently Opened" can sort by them.
	const stopCollectionVisitTracker = startCollectionVisitTracker(() => {
		const mainWindow =
			Router.WindowStore?.GamepadUIMainWindowInstance?.BrowserWindow
		const location = mainWindow?.location ?? window.location
		return `${location.pathname}${location.hash}`
	})

	routerHook.addRoute(SETTINGS_ROUTE, () => (
		<CollectionSettings store={settingsStore} />
	))

	return {
		name: "DeckRoulette",
		titleView: <div className={staticClasses.Title}>DeckRoulette</div>,
		content: <QuickAccess store={settingsStore} />,
		icon: <GiPerspectiveDiceSixFacesRandom />,
		onDismount() {
			stopCollectionVisitTracker()
			routerHook.removeRoute(SETTINGS_ROUTE)
		},
	}
})
