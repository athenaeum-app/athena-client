import {
    createEffect,
    createMemo,
    createSignal,
    For,
    Show,
    type Component,
    type ComponentProps,
} from 'solid-js'
import { Line } from './Line'
import {
    archives,
    defaultArchiveId,
    allTags,
    type MomentData,
    setTitle,
    setContent,
    setTagsString,
    setEditingMomentId,
    setMomentToDelete,
    getCurrentLibrary,
    serverRole,
} from '../modules/data'
import {
    displayedModal,
    animatedIconClasses,
    setDisplayedModal,
    displayType,
    setDisplayedMomentModalId,
    displayedMomentModalId,
    appSettings,
} from '../modules/globals'
import { TagButton } from './TagBar'
import { FancyTextRenderer } from './FancyTextRenderer'

export type MomentProps = ComponentProps<'div'> & {
    data: MomentData
    isInsideModal?: boolean
    isPreview?: boolean
}

export const Moment: Component<MomentProps> = (props) => {
    const data = props.data
    const [isConfirmingDelete, setIsConfirmingDelete] =
        createSignal<boolean>(false)

    createEffect(() => {
        if (displayedModal() == 'NONE') {
            setIsConfirmingDelete(false)
        }
    })

    const contentDisplayType = createMemo<'All' | 'Minimal'>(() => {
        if (
            displayedMomentModalId() == data.uuid &&
            props.isInsideModal == true
        )
            return 'All'
        if (displayType() == 'Grid') {
            return 'Minimal'
        }
        return 'All'
    })

    return (
        <div
            onClick={() => {
                if (displayType() == 'Grid') {
                    setDisplayedMomentModalId(data.uuid)
                    setDisplayedModal('DISPLAY_MOMENT_MODAL')
                }
            }}
            class={`${contentDisplayType() == 'Minimal' ? 'hover:cursor-pointer' : ''} group hover:bg-element-accent border-element-accent flex w-full flex-col gap-2 rounded border p-4 transition-all duration-300`}
        >
            <div class="flex flex-col flex-wrap gap-2">
                <div class="flex justify-between">
                    <div class="flex w-full flex-col gap-2">
                        <span
                            class={`text-sub ${displayType() == 'Full' ? 'text-md' : 'text-sm'} font-semibold tracking-wider`}
                        >
                            {(() => {
                                const timestamp = props.data.timestamp
                                return new Intl.DateTimeFormat(
                                    navigator.language,
                                    {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true,
                                    },
                                ).format(timestamp)
                            })()}
                        </span>
                        <Show when={data.archiveId != defaultArchiveId}>
                            <span
                                class={`text-sub pr-1 ${displayType() == 'Full' ? 'text-lg' : 'text-md'} font-bold tracking-tight transition-all duration-200`}
                            >
                                [{' '}
                                {
                                    archives()[data.archiveId || ('' as any)]
                                        ?.name
                                }{' '}
                                ]
                            </span>
                        </Show>
                    </div>
                    <Show
                        when={
                            contentDisplayType() == 'All' &&
                            (getCurrentLibrary()?.type === 'server'
                                ? serverRole() == 'admin'
                                : true)
                        }
                    >
                        <div class="flex items-start gap-2">
                            <i
                                class={animatedIconClasses + 'fa-pencil'}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setDisplayedModal('EDIT_MODAL')
                                    setTitle(data.title)
                                    setContent(data.content)
                                    setTagsString(
                                        (
                                            [...data.tagIds]
                                                .map(
                                                    (tagId) =>
                                                        allTags[tagId].name,
                                                )
                                                .join(',') + ','
                                        ).replace(/,\s*$/, ''),
                                    )
                                    setEditingMomentId(data.uuid)
                                }}
                            />
                            <i
                                class={
                                    animatedIconClasses +
                                    `${isConfirmingDelete() ? 'fa-check' : 'fa-trash'}`
                                }
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setMomentToDelete()
                                    if (!isConfirmingDelete()) {
                                        setIsConfirmingDelete(true)
                                    } else {
                                        setMomentToDelete(data.uuid)
                                        setDisplayedModal(
                                            'CONFIRM_MOMENT_DELETE',
                                        )
                                    }
                                }}
                            />
                        </div>
                    </Show>
                </div>
                <span
                    class={`tracking ${displayType() == 'Full' ? 'text-4xl' : 'text-xl'} text-sub font-black break-all`}
                >
                    {data.title}
                </span>
            </div>

            <Show when={contentDisplayType() == 'All'}>
                <FancyTextRenderer
                    content={data.content}
                    isPreview={props.isPreview}
                    textSizeClass={
                        displayType() == 'Full' ? 'prose-lg' : 'prose-base'
                    }
                />
            </Show>

            <Show when={data.tagIds.length > 0}>
                <Line class="bg-element-accent h-1 w-full" />
                <div class="flex flex-wrap items-center gap-1 text-wrap">
                    <For each={data.tagIds}>
                        {(tagId) => {
                            return (
                                <TagButton
                                    noHighlight={
                                        !appSettings()
                                            .highlightSelectedTagsInMoments
                                    }
                                    tagId={tagId}
                                />
                            )
                        }}
                    </For>
                </div>
            </Show>
        </div>
    )
}
