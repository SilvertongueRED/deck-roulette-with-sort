import {
	ButtonItem,
	PanelSection,
	PanelSectionRow,
	staticClasses,
} from "@decky/ui"
import { definePlugin } from "@decky/api"
import { useState } from "react"
import { GiPerspectiveDiceSixFacesRandom } from "react-icons/gi"

import {
	EXCLUDE_COLLECTION_IDS,
	navigateToRandomGame,
	SortMode,
	SORT_MODE_LABELS,
	getNextSortMode,
	loadSortMode,
	saveSortMode,
	loadRouletteTimestamps,
	saveRouletteTimestamp,
	sortCollections,
} from "./utils"

const DeckRoulette = () => {
	const { collectionStore }: { collectionStore: CollectionStore } =
		window as any

	const collections = collectionStore.userCollections

	const localGames: SteamCollection = collectionStore.localGamesCollection

	const allInstalled = [
		...localGames.visibleApps,
		...collectionStore.deckDesktopApps.visibleApps,
	]

	const myGamesCollection = collectionStore.myGamesCollection

	const [sortMode, setSortMode] = useState<SortMode>(loadSortMode())
	const [rouletteTimestamps, setRouletteTimestamps] = useState<
		Record<string, number>
	>(loadRouletteTimestamps())

	const cycleSortMode = () => {
		const nextMode = getNextSortMode(sortMode)
		setSortMode(nextMode)
		saveSortMode(nextMode)
	}

	const handleRouletteClick = (
		collectionId: string,
		appIds: number[]
	) => {
		const newTimestamps = saveRouletteTimestamp(collectionId)
		setRouletteTimestamps(newTimestamps)
		navigateToRandomGame(appIds)
	}

	const filteredCollections = collections.filter(
		(c) => !EXCLUDE_COLLECTION_IDS.includes(c.id)
	)
	const sortedCollections = sortCollections(
		filteredCollections,
		sortMode,
		rouletteTimestamps
	)

	/* Uncomment to enable in-plugin custom lists
	const [customLists, setCustomLists] = useState<{
		[key: string]: number[]
	}>()
	const [editingList, setEditingList] = useState<{
		listName?: string
		appIds: number[]
	}>()

	useEffect(() => {
		call<[], { [key: string]: number[] }>("get_game_lists")
			.then((result) => {
				console.log(result)
				setCustomLists(result)
			})
	}, [])

	if (editingList)
		return (
			<ListEditor
				currentName={editingList.listName}
				currentList={editingList.appIds}
				setEditingList={setEditingList}
				setCustomLists={setCustomLists}
			/>
		)
  */

	return (
		<div>
			<PanelSection title="Random Game">
				{localGames ? (
					<PanelSectionRow>
						<ButtonItem
							layout="below"
							onClick={() =>
								navigateToRandomGame(
									allInstalled.map((app) => app.appid)
								)
							}
						>
							{localGames.displayName} ({allInstalled.length})
						</ButtonItem>
					</PanelSectionRow>
				) : null}
				<PanelSectionRow>
					<ButtonItem
						layout="below"
						onClick={() =>
							navigateToRandomGame(
								myGamesCollection.visibleApps.map(
									(app) => app.appid
								)
							)
						}
					>
						{myGamesCollection.displayName} (
						{myGamesCollection.visibleApps.length})
					</ButtonItem>
				</PanelSectionRow>
			</PanelSection>
			{/* <PanelSection title="Custom Game Lists">
				{customLists
					? Object.entries(customLists).map(([listName, appIds]) => (
							<PanelSectionRow key={listName}>
								<CustomListItem
									onSelect={() =>
										navigateToRandomGame(appIds)
									}
									onEdit={() =>
										setEditingList({ listName, appIds })
									}
									onDelete={() =>
										call("delete_game_list", listName)
											.then((result) => {
												setCustomLists(result as { [key: string]: number[] })
											})
									}
								>
									<span>
										{listName} ({appIds.length})
									</span>
								</CustomListItem>
							</PanelSectionRow>
					  ))
					: null}
				<PanelSectionRow>
					<ButtonItem
						layout="below"
						onClick={() => {
							showModal(
								<ListNameModal
									initialText=""
									onOK={(listName) =>
										setEditingList({ listName, appIds: [] })
									}
								/>
							)
						}}
					>
						Add New List
					</ButtonItem>
				</PanelSectionRow>
			</PanelSection> */}
			<PanelSection title="Steam Collections">
				<PanelSectionRow>
					<ButtonItem layout="below" onClick={cycleSortMode}>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: "2px",
							}}
						>
							<div style={{ fontWeight: "bold" }}>
								Sort: {SORT_MODE_LABELS[sortMode]}
							</div>
							<div
								style={{
									fontSize: "0.75em",
									opacity: 0.6,
								}}
							>
								Next:{" "}
								{
									SORT_MODE_LABELS[
										getNextSortMode(sortMode)
									]
								}
							</div>
						</div>
					</ButtonItem>
				</PanelSectionRow>
				{sortedCollections.map((collection) => (
					<PanelSectionRow key={collection.id}>
						<ButtonItem
							layout="below"
							onClick={() =>
								handleRouletteClick(
									collection.id,
									collection.visibleApps.map(
										(app) => app.appid
									)
								)
							}
						>
							{collection.displayName} (
							{collection.visibleApps.length})
						</ButtonItem>
					</PanelSectionRow>
				))}
			</PanelSection>
		</div>
	)
}

export default definePlugin(() => {
	return {
		name: "DeckRoulette",
		titleView: <div className={staticClasses.Title}>DeckRoulette</div>,
		content: <DeckRoulette />,
		icon: <GiPerspectiveDiceSixFacesRandom />,
		alwaysRender: false,
		onDismount() {},
	}
})
