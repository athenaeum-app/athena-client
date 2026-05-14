import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
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
import { URL_REGEX } from '../modules/regex'
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
    appSettings,
    type ContentPart,
} from '../modules/globals'
import { AttachmentPreview } from './AttachmentPreview'
import { TagButton } from './TagBar'
import { micromark } from 'micromark'
import { gfm, gfmHtml } from 'micromark-extension-gfm'
import { InlineReference } from './InlineReference'

export type MomentProps = ComponentProps<'div'> & {
    data: MomentData
    isInsideModal?: boolean
    isPreview?: boolean
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

    const contentParts = createMemo(() => extractContentParts(data.content))

    iterateUrlsInContentParts(contentParts(), (fragment) => {
        if (fragment != '' && fragment.match(URL_REGEX)) {
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

    // For code highlighting
    createEffect(() => {
        contentParts()
        contentDisplayType()

        if (containerRef && inView()) {
            const preBlocks = containerRef.querySelectorAll('pre')

            preBlocks.forEach((pre) => {
                const codeBlock = pre.querySelector('code')

                if (codeBlock && !codeBlock.classList.contains('hljs')) {
                    hljs.highlightElement(codeBlock as HTMLElement)
                }

                if (codeBlock && !pre.querySelector('.copy-btn')) {
                    pre.style.position = 'relative'

                    const btn = document.createElement('button')
                    btn.className =
                        'copy-btn absolute top-2 right-2 bg-element/80 hover:bg-highlight text-slate-400 hover:text-slate-800 px-2 py-1 rounded text-xs font-bold transition-all duration-200 opacity-0'
                    btn.innerText = 'COPY'
                    btn.title = 'Copy to clipboard'

                    pre.addEventListener(
                        'mouseenter',
                        () => (btn.style.opacity = '1'),
                    )
                    pre.addEventListener(
                        'mouseleave',
                        () => (btn.style.opacity = '0'),
                    )

                    btn.addEventListener('click', (e) => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(codeBlock.innerText || '')

                        btn.innerText = 'COPIED!'
                        btn.classList.replace(
                            'bg-element/80',
                            'bg-highlight-strong',
                        )

                        setTimeout(() => {
                            btn.innerText = 'COPY'
                            btn.classList.replace(
                                'bg-highlight-strong',
                                'bg-element/80',
                            )
                        }, 2000)
                    })

                    pre.appendChild(btn)
                }
            })
        }
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
                    <div class="text-element-accent-highlight flex flex-col gap-0 whitespace-pre-line">
                        <For each={contentParts()}>
                            {(text: ContentPart) => {
                                if (text.type === 'url') {
                                    return (
                                        <AttachmentPreview link={text.body} />
                                    )
                                }

                                if (text.type === 'reference') {
                                    if (props.isPreview) {
                                        return (
                                            <button class="bg-element-accent/40 text-highlight mx-1 inline-flex rounded border px-1.5 py-0.5 font-bold">
                                                <i class="fa-solid fa-link text-[10px] opacity-60"></i>
                                                {text.body}
                                            </button>
                                        )
                                    }
                                    return (
                                        <InlineReference contentPart={text} />
                                    )
                                }

                                const rawText = text.body
                                const parsedComponent = micromark(rawText, {
                                    extensions: [gfm()],
                                    htmlExtensions: [gfmHtml()],
                                })
                                return (
                                    <div
                                        class={`prose text-sub flex max-w-none flex-col gap-0 leading-normal ${
                                            displayType() == 'Full'
                                                ? 'prose-lg'
                                                : 'prose-base'
                                        } prose-p:text-sub prose-code:text-sub prose-li:text-sub prose-strong:text-md-strong prose-h1:text-md-heading prose-h2:text-md-heading/95 prose-h3:text-md-heading/90 prose-h4:text-md-heading/85 prose-h5:text-md-heading/80 prose-h6:text-md-heading/75 prose-p:my-0 prose-headings:my-1 prose-ul:-my-3 prose-li:-my-3 prose-blockquote:text-sub prose-table:text-sub prose-thead:text-sub prose-tr:text-sub prose-th:text-sub prose-td:text-sub prose-a:text-element-accent-highlight prose-a:hover:text-element-accent-focus prose-a:underline prose-a:decoration-element-accent prose-a:hover:decoration-element-accent-focus prose-img:rounded-lg prose-img:border prose-img:border-element-accent prose-img:shadow-md prose-video:rounded-lg prose-video:border prose-video:border-element-accent prose-video:shadow-md prose-hr:border-element-accent prose-figure:my-0 prose-figcaption:text-sm prose-figcaption:text-sub prose-figcaption:italic prose-figcaption:text-center prose-pre:p-0 prose-pre:my-2 prose-pre:overflow-x-auto`}
                                        innerHTML={parsedComponent}
                                    />
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
