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
		const mainWindow: any = Router.WindowStore?.GamepadUIMainWindowInstance
		const describe = (location?: {
			pathname?: string
			hash?: string
		}) =>
			location
				? `${location.pathname ?? ""}${location.hash ?? ""}`
				: undefined

		// Steam's UI may keep its page in its own history object rather than in
		// the browser address, so check each place it could be.
		return {
			"steam-history": describe(mainWindow?.m_history?.location),
			"main-window": describe(mainWindow?.BrowserWindow?.location),
			"this-window": describe(window.location),
		}
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
