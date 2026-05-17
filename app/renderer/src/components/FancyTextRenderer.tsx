import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import {
    createEffect,
    createMemo,
    createSignal,
    For,
    onCleanup,
    onMount,
    type Component,
} from 'solid-js'
import { micromark } from 'micromark'
import { gfm, gfmHtml } from 'micromark-extension-gfm'
import {
    extractContentParts,
    iterateUrlsInContentParts,
    registerMediaFilter,
    rootMarginPixels,
    type ContentPart,
} from '../modules/globals'
import { AttachmentPreview } from './AttachmentPreview'
import { InlineReference } from './InlineReference'

export interface RichTextRendererProps {
    content: string
    isPreview?: boolean
    textSizeClass?: string
    compact?: boolean
}

export const FancyTextRenderer: Component<RichTextRendererProps> = (props) => {
    let containerRef: HTMLDivElement | undefined
    const [inView, setInView] = createSignal<boolean>(false)

    const contentParts = createMemo(() => extractContentParts(props.content))

    createEffect(() => {
        iterateUrlsInContentParts(contentParts(), (fragment) => {
            if (fragment != '' && fragment.match(/^https?:\/\//i)) {
                registerMediaFilter(fragment)
            }
        })
    })

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

    createEffect(() => {
        contentParts()

        if (containerRef && inView()) {
            const preBlocks = containerRef.querySelectorAll('pre')

            preBlocks.forEach((pre) => {
                const codeBlock = pre.querySelector('code')

                if (codeBlock && !codeBlock.classList.contains('hljs')) {
                    hljs.highlightElement(codeBlock as HTMLElement)
                }

                if (codeBlock && !pre.querySelector('.copy-btn')) {
                    codeBlock.className += ' max-h-[75vh]'
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
            class="text-element-accent-highlight flex w-full flex-col gap-0 whitespace-pre-line"
        >
            <For each={contentParts()}>
                {(text: ContentPart) => {
                    if (text.type === 'url') {
                        return <AttachmentPreview link={text.body} />
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
                        return <InlineReference contentPart={text} />
                    }

                    const rawText = text.body
                    const parsedComponent = micromark(rawText, {
                        extensions: [gfm()],
                        htmlExtensions: [gfmHtml()],
                    })

                    return (
                        <div
                            class={`prose text-sub flex max-w-none flex-col gap-0 leading-normal ${
                                props.textSizeClass || 'prose-base'
                            } ${
                                props.compact
                                    ? 'prose-sm prose-p:my-0 prose-headings:my-0'
                                    : 'prose-p:my-0 prose-headings:my-1'
                            } prose-p:text-sub prose-code:text-sub prose-li:text-sub prose-strong:text-md-strong prose-h1:text-md-heading prose-h2:text-md-heading/95 prose-h3:text-md-heading/90 prose-h4:text-md-heading/85 prose-h5:text-md-heading/80 prose-h6:text-md-heading/75 prose-ul:-my-3 prose-li:-my-3 prose-blockquote:text-sub prose-table:text-sub prose-thead:text-sub prose-tr:text-sub prose-th:text-sub prose-td:text-sub prose-a:text-element-accent-highlight prose-a:hover:text-element-accent-focus prose-a:underline prose-a:decoration-element-accent prose-a:hover:decoration-element-accent-focus prose-img:rounded-lg prose-img:border prose-img:border-element-accent prose-img:shadow-md prose-video:rounded-lg prose-video:border prose-video:border-element-accent prose-video:shadow-md prose-hr:border-element-accent prose-figure:my-0 prose-figcaption:text-sm prose-figcaption:text-sub prose-figcaption:italic prose-figcaption:text-center prose-pre:p-0 prose-pre:my-2 prose-pre:overflow-x-auto`}
                            innerHTML={parsedComponent}
                        />
                    )
                }}
            </For>
        </div>
    )
}
