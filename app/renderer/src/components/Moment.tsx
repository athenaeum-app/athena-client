import {
    createEffect,
    createMemo,
    createSignal,
    For,
    onCleanup,
    onMount,
    Show,
    type Component,
    type ComponentProps,
} from 'solid-js'
import { Line } from './Line'
import { FILE_REF_REGEX, URL_REGEX } from '../modules/regex'
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
    rootMarginPixels,
    setDisplayedModal,
    registerMediaFilter,
    extractContentParts,
    iterateUrlsInContentParts,
    displayType,
    setDisplayedMomentModalId,
    displayedMomentModalId,
    GetContrastingColourForHSL,
    appSettings,
} from '../modules/globals'
import { AttachmentPreview } from './AttachmentPreview'
import { TagButton } from './TagBar'
import { SolidMarkdown } from 'solid-markdown'

export type MomentProps = ComponentProps<'div'> & {
    data: MomentData
    isInsideModal?: boolean
}

export const Moment: Component<MomentProps> = (props) => {
    let containerRef: HTMLDivElement | undefined
    const data = props.data
    const [isConfirmingDelete, setIsConfirmingDelete] =
        createSignal<boolean>(false)

    createEffect(() => {
        if (displayedModal() == 'NONE') {
            setIsConfirmingDelete(false)
        }
    })

    // keep as memo, or else content is not reactive.
    const contentParts = createMemo(() => extractContentParts(data.content))

    // extract urls
    iterateUrlsInContentParts(contentParts(), (fragment) => {
        if (fragment.match(URL_REGEX)) {
            registerMediaFilter(fragment)
        }
    })

    const [inView, setInView] = createSignal<boolean>(false)

    onMount(() => {
        const viewObserver = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true)
                    viewObserver.disconnect()
                } else {
                    setInView(false)
                }
            },
            { rootMargin: `${rootMarginPixels}px` },
        )
        if (containerRef) viewObserver.observe(containerRef)
        onCleanup(() => viewObserver.disconnect())
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
            ref={containerRef}
            onClick={() => {
                if (displayType() == 'Grid') {
                    setDisplayedMomentModalId(data.uuid)
                    setDisplayedModal('DISPLAY_MOMENT_MODAL')
                }
            }}
            class={`${contentDisplayType() == 'Minimal' ? 'hover:cursor-pointer' : ''} group hover:bg-element-accent border-element-accent flex w-full flex-col gap-2 rounded border p-4 transition-all duration-300`}
        >
            <Show when={inView()}>
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
                                        archives()[
                                            data.archiveId || ('' as any)
                                        ]?.name
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
                                        e.stopPropagation() // prevents triggering modal open
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
                                        e.stopPropagation() // prevents triggering modal open
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
                    <div class="text-element-accent-highlight flex flex-col gap-2 whitespace-pre-line">
                        <For each={contentParts()}>
                            {(text) => {
                                if (
                                    text.match(FILE_REF_REGEX) ||
                                    text.match(URL_REGEX)
                                ) {
                                    return <AttachmentPreview link={text} />
                                }
                                return (
                                    <div
                                        class={`prose max-w-none leading-normal ${
                                            displayType() == 'Full'
                                                ? 'prose-lg'
                                                : 'prose-base'
                                        } prose-p:text-sub prose-code:text-sub prose-li:text-sub prose-strong:text-md-strong prose-h1:text-md-heading prose-h2:text-md-heading/95 prose-h3:text-md-heading/90 prose-h4:text-md-heading/85 prose-h5:text-md-heading/80 prose-h6:text-md-heading/75 prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0 prose-blockquote:text-sub prose-table:text-sub prose-thead:text-sub prose-tr:text-sub prose-th:text-sub prose-td:text-sub prose-a:text-element-accent-highlight prose-a:hover:text-element-accent-focus prose-a:underline prose-a:decoration-element-accent prose-a:hover:decoration-element-accent-focus prose-img:rounded-lg prose-img:border prose-img:border-element-accent prose-img:shadow-md prose-video:rounded-lg prose-video:border prose-video:border-element-accent prose-video:shadow-md prose-hr:border-element-accent prose-figure:my-2 prose-figcaption:text-sm prose-figcaption:text-sub prose-figcaption:italic prose-figcaption:text-center`}
                                    >
                                        <SolidMarkdown children={text.trim()} />
                                    </div>
                                )
                            }}
                        </For>
                    </div>
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
            </Show>
        </div>
    )
}
