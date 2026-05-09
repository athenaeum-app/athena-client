import { createMemo, For, Show, type Component } from 'solid-js'
import { ClearFilterButton } from './ClearFilterButton'
import {
    selectedTagIds,
    setSelectedTagIds,
    allTags,
    type Tag,
    type TagId,
} from '../modules/data'
import {
    animatedIconClasses,
    getFilteredMoments,
    sortTags,
} from '../modules/globals'

export const TagBar: Component = () => {
    const toggleTag = (tagId: TagId) => {
        setSelectedTagIds((prev) => {
            if (prev.includes(tagId)) {
                return prev.filter((current_tag) => current_tag != tagId)
            }
            return [...prev, tagId]
        })
    }

    const availableTags = createMemo(() => {
        const currentSelected = selectedTagIds()
        const filteredMoments = getFilteredMoments()

        const remainingMoments = filteredMoments.filter((moment) =>
            currentSelected.every((tagId) => moment.tagIds.includes(tagId)),
        )

        const remainingTags = new Set<Tag>()
        remainingMoments.forEach((moment) =>
            moment.tagIds.forEach((tagId) => {
                if (allTags[tagId]) {
                    remainingTags.add(allTags[tagId])
                }
            }),
        )

        const result = sortTags(
            Array.from(remainingTags).filter((tag) => !!tag),
        )

        return result
    })

    return (
        <div class="bg-element z-10 flex w-full flex-wrap items-center justify-center gap-2 p-2 backdrop-blur-md transition-all lg:p-6">
            <span class="text-sub text-xs font-black tracking-widest uppercase">
                Selected Tags:
            </span>
            <For each={availableTags()}>
                {(tagData) => {
                    return (
                        <div
                            style={`background-color: ${tagData.colour}`}
                            class="group flex items-center justify-between rounded-xl"
                        >
                            <button
                                onClick={() => toggleTag(tagData.id)}
                                class={`text-tag-text p-2 text-xs font-extrabold tracking-wide uppercase transition-all duration-100 hover:cursor-pointer ${
                                    selectedTagIds().includes(tagData.id)
                                        ? 'shadow-highlight-strongest border-plain border-2 shadow-sm'
                                        : `over:scale-105 hover:text-sub`
                                }`}
                            >
                                #{tagData.name}
                            </button>
                        </div>
                    )
                }}
            </For>
            <Show when={selectedTagIds().length > 0}>
                <ClearFilterButton onClick={() => setSelectedTagIds([])} />
            </Show>
        </div>
    )
}
