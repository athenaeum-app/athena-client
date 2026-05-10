import {
    createMemo,
    For,
    Show,
    type Component,
    type ComponentProps,
} from 'solid-js'
import { ClearFilterButton } from './ClearFilterButton'
import {
    selectedTagIds,
    setSelectedTagIds,
    allTags,
    type Tag,
    type TagId,
} from '../modules/data'
import {
    GetContrastingColourForHSL,
    getFilteredMoments,
    sortTags,
} from '../modules/globals'

export const toggleTag = (tagId: TagId) => {
    setSelectedTagIds((prev) => {
        if (prev.includes(tagId)) {
            return prev.filter((current_tag) => current_tag != tagId)
        }
        return [...prev, tagId]
    })
}

export const TagButton: Component<
    { tagId: TagId; noHighlight?: boolean } & ComponentProps<'button'>
> = (props) => {
    const tagData = allTags[props.tagId]
    return (
        <button
            onClick={() => toggleTag(tagData.id)}
            class={`rounded-xl p-2 text-xs font-black tracking-wide uppercase transition-all duration-100 hover:cursor-pointer ${
                selectedTagIds().includes(tagData.id) && !props.noHighlight
                    ? 'shadow-highlight-strongest border-plain border-2 shadow-sm'
                    : `hover:scale-105`
            }`}
            style={{
                'background-color': `${tagData.colour}`,
                color: `${GetContrastingColourForHSL(tagData.colour)}`,
            }}
        >
            #{tagData.name}
        </button>
    )
}

export const TagBar: Component = () => {
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
                    return <TagButton tagId={tagData.id} />
                }}
            </For>
            <Show when={selectedTagIds().length > 0}>
                <ClearFilterButton onClick={() => setSelectedTagIds([])} />
            </Show>
        </div>
    )
}
