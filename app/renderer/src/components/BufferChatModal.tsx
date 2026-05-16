import {
    createSignal,
    onMount,
    onCleanup,
    For,
    Show,
    type Component,
    createEffect,
    createMemo,
} from 'solid-js'
import {
    activeLibraryId,
    getActiveLibrary,
    getCurrentLibrary,
} from '../modules/data'
import { displayedModal, FormatChatDate } from '../modules/globals'
import { allMessages, setAllMessages } from '../modules/store'
import { unwrap } from 'solid-js/store'
import { FancyTextRenderer } from './FancyTextRenderer'

interface BufferMessage {
    id: string
    author_name: string
    content: string
    timestamp: string
}

export const GetLastBufferMessage = () => allMessages[allMessages.length - 1]

export const BufferChatModal: Component = () => {
    const [name, setName] = createSignal(
        localStorage.getItem(activeLibraryId() + '_chatname') || '',
    )
    const [content, setContent] = createSignal('')

    const [isLoadingOlder, setIsLoadingOlder] = createSignal(false)
    const [isLoadingNewer, setIsLoadingNewer] = createSignal(false)
    const [hasMoreOlder, setHasMoreOlder] = createSignal(true)
    const [isAtPresent, setIsAtPresent] = createSignal(true)
    const [showScrollBottom, setShowScrollBottom] = createSignal(false)

    const [windowSize, setWindowSize] = createSignal(50)
    const [windowStart, setWindowStart] = createSignal(0)

    const windowEnd = createMemo(() =>
        Math.min(allMessages.length, windowStart() + windowSize()),
    )
    const visibleItems = createMemo(() =>
        allMessages.slice(windowStart(), windowEnd()),
    )
    const shiftDelta = createMemo(() => Math.floor(windowSize() / 2))

    let chatTextAreaRef: HTMLTextAreaElement | undefined
    let chatContainerRef: HTMLDivElement | undefined
    let topSentinelRef: HTMLDivElement | undefined
    let bottomSentinelRef: HTMLDivElement | undefined

    const shiftWindow = (delta: number) => {
        if (!chatContainerRef) return

        const anchorMsg =
            visibleItems().find((m) => {
                const el = document.getElementById(`msg-${m.id}`)
                return el && el.offsetTop >= chatContainerRef!.scrollTop
            }) || visibleItems()[0]

        let anchorOffset = 0
        if (anchorMsg) {
            const el = document.getElementById(`msg-${anchorMsg.id}`)
            if (el) anchorOffset = el.offsetTop - chatContainerRef.scrollTop
        }

        setWindowStart((prev) => {
            let next = prev + delta
            return Math.max(
                0,
                Math.min(allMessages.length - windowSize(), next),
            )
        })

        setTimeout(() => {
            if (anchorMsg && chatContainerRef) {
                const el = document.getElementById(`msg-${anchorMsg.id}`)
                if (el) chatContainerRef.scrollTop = el.offsetTop - anchorOffset
            }
        }, 0)
    }

    createEffect(() => {
        if (!chatContainerRef || !topSentinelRef || !bottomSentinelRef) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (
                        entry.target === topSentinelRef &&
                        entry.isIntersecting
                    ) {
                        if (windowStart() > 0) shiftWindow(-shiftDelta())
                        else fetchOlderMessages()
                    }
                    if (
                        entry.target === bottomSentinelRef &&
                        entry.isIntersecting
                    ) {
                        if (windowEnd() < allMessages.length)
                            shiftWindow(shiftDelta())
                        else fetchNewerMessages()
                    }
                })
            },
            { root: chatContainerRef, rootMargin: '400px' },
        )

        observer.observe(topSentinelRef)
        observer.observe(bottomSentinelRef)
        onCleanup(() => observer.disconnect())
    })

    const fetchLiveMessages = async () => {
        if (!isAtPresent()) return
        const lib = getCurrentLibrary()
        if (!lib || lib.type !== 'server') return

        const latestMsg = allMessages[allMessages.length - 1]
        const url = latestMsg
            ? `${lib.url}/api/buffer?after=${encodeURIComponent(latestMsg.timestamp)}?`
            : `${lib.url}/api/buffer?`

        try {
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${lib.token}` },
            })
            if (res.ok) {
                const data = await res.json()
                if (data && data.length > 0) {
                    const el = chatContainerRef
                    const isAtBottom =
                        el &&
                        el.scrollHeight - el.scrollTop <= el.clientHeight + 100

                    setAllMessages([...unwrap(allMessages), ...data])
                    if (isAtBottom) scrollToBottom()
                }
            }
        } catch (err) {}
    }

    const fetchOlderMessages = async () => {
        if (isLoadingOlder() || !hasMoreOlder() || allMessages.length === 0)
            return
        const lib = getCurrentLibrary()
        if (!lib || lib.type !== 'server') return

        setIsLoadingOlder(true)
        const oldestMsg = allMessages[0]

        try {
            const res = await fetch(
                `${lib.url}/api/buffer?before=${encodeURIComponent(oldestMsg.timestamp)}`,
                { headers: { Authorization: `Bearer ${lib.token}` } },
            )
            if (res.ok) {
                const data = await res.json()
                if (!data || data.length === 0) {
                    setHasMoreOlder(false)
                } else {
                    setAllMessages([...data, ...unwrap(allMessages)])
                    setWindowStart((prev) => prev + data.length)
                }
            }
        } catch (err) {
        } finally {
            setIsLoadingOlder(false)
        }
    }

    const fetchNewerMessages = async () => {
        if (isLoadingNewer() || isAtPresent() || allMessages.length === 0)
            return
        const lib = getCurrentLibrary()
        if (!lib || lib.type !== 'server') return

        setIsLoadingNewer(true)
        const newestMsg = allMessages[allMessages.length - 1]

        try {
            const res = await fetch(
                `${lib.url}/api/buffer?after=${encodeURIComponent(newestMsg.timestamp)}`,
                { headers: { Authorization: `Bearer ${lib.token}` } },
            )
            if (res.ok) {
                const data = await res.json()
                if (data && data.length > 0) {
                    setAllMessages([...unwrap(allMessages), ...data])
                    if (data.length < 50) setIsAtPresent(true)
                } else {
                    setIsAtPresent(true)
                }
            }
        } catch (err) {
        } finally {
            setIsLoadingNewer(false)
        }
    }

    const jumpToPresent = async () => {
        const lib = getCurrentLibrary()
        if (!lib || lib.type !== 'server') return

        setIsAtPresent(true)
        try {
            const res = await fetch(`${lib.url}/api/buffer`, {
                headers: { Authorization: `Bearer ${lib.token}` },
            })
            if (res.ok) {
                const data = await res.json()
                setAllMessages(data)
                scrollToBottom()
            }
        } catch (err) {}
    }

    const sendMessage = async () => {
        if (!content().trim()) return
        const lib = getCurrentLibrary()
        if (!lib) return

        const payload = {
            author_name: name()?.trim() || 'Anonymous',
            content: content().trim(),
        }
        const newMsg: BufferMessage = {
            id: (lib.type === 'server' ? 'temp-' : 'local-') + Date.now(),
            author_name: payload.author_name,
            content: payload.content,
            timestamp: new Date().toISOString(),
        }

        if (!isAtPresent()) {
            await jumpToPresent()
            return
        }

        setAllMessages([...unwrap(allMessages), newMsg])
        setContent('')
        scrollToBottom()

        if (lib.type === 'server') {
            try {
                fetch(`${lib.url}/api/buffer`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${lib.token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                })
            } catch (err) {}
        }
    }

    createEffect(() => {
        const libId = activeLibraryId()
        const lib = getCurrentLibrary()
        setName(localStorage.getItem(libId + '_chatname') || '')
        setHasMoreOlder(true)
        setIsAtPresent(true)
        if (lib && lib.type === 'server') jumpToPresent()
    })

    const handleNameChange = (
        e: Event & { currentTarget: HTMLInputElement },
    ) => {
        const newName = e.currentTarget.value
        setName(newName)
        localStorage.setItem(activeLibraryId() + '_chatname', newName)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const scrollToBottom = () => {
        if (allMessages.length === 0) return
        setWindowStart(Math.max(0, allMessages.length - windowSize()))
        setTimeout(() => {
            if (chatContainerRef)
                chatContainerRef.scrollTop = chatContainerRef.scrollHeight
        }, 50)
    }

    onMount(() => {
        const interval = setInterval(fetchLiveMessages, 5000)
        onCleanup(() => clearInterval(interval))
    })

    createEffect(() => {
        if (displayedModal() === 'CHAT_MODAL') {
            if (chatTextAreaRef) chatTextAreaRef.focus()
            if (
                chatContainerRef &&
                chatContainerRef.scrollHeight - chatContainerRef.scrollTop <=
                    chatContainerRef.clientHeight + 100
            ) {
                scrollToBottom()
            }
        }
    })

    const shouldShowHeader = (msg: BufferMessage, index: number) => {
        if (index === 0) return true
        const prevMsg = allMessages[index - 1]
        if (!prevMsg) return true
        if (msg.author_name !== prevMsg.author_name) return true

        const currTime = new Date(msg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        })
        const prevTime = new Date(prevMsg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        })
        return currTime !== prevTime
    }

    return (
        <div class="border-element-accent bg-element-matte flex w-full flex-col rounded-xl border">
            <div class="border-element-accent flex items-center justify-between border-b p-3">
                <h2 class="text-sub text-sm font-bold tracking-widest">
                    <i class="fa-solid fa-message text-highlight mr-2"></i>
                    Chat
                </h2>
                <Show when={!isAtPresent()}>
                    <span class="text-highlight-strong bg-highlight-strong/10 animate-pulse rounded px-2 py-1 text-xs font-bold">
                        Viewing History
                    </span>
                </Show>
            </div>

            <div
                style={{
                    display:
                        displayedModal() === 'CHAT_MODAL' ? 'flex' : 'none',
                    height: '70vh',
                }}
                class="relative w-full flex-col overflow-hidden"
            >
                <Show when={allMessages.length === 0}>
                    <div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                        <span class="text-sub/50 text-sm font-bold italic">
                            No messages yet.
                        </span>
                    </div>
                </Show>

                <div
                    ref={(el) => {
                        chatContainerRef = el

                        const ro = new ResizeObserver((entries) => {
                            const target = entries[0].target as HTMLDivElement
                            const visibleCount = visibleItems().length
                            if (visibleCount > 0) {
                                const avgHeight =
                                    target.scrollHeight / visibleCount

                                let idealSize = Math.ceil(
                                    (target.clientHeight * 3) / avgHeight,
                                )

                                idealSize = Math.max(
                                    15,
                                    Math.min(idealSize, 100),
                                )

                                if (Math.abs(idealSize - windowSize()) > 5) {
                                    setWindowSize(idealSize)
                                }
                            }
                        })
                        ro.observe(el)
                        onCleanup(() => ro.disconnect())
                    }}
                    onScroll={(e) => {
                        const target = e.currentTarget
                        const dist =
                            target.scrollHeight -
                            target.scrollTop -
                            target.clientHeight
                        setShowScrollBottom(dist > 200)

                        if (dist < 100 && !isAtPresent()) fetchNewerMessages()
                    }}
                    class="h-full w-full flex-1 overflow-y-auto pt-4 pb-4"
                >
                    <div ref={topSentinelRef} class="h-2 w-full shrink-0" />

                    <For each={visibleItems()}>
                        {(msg, localIndex) => {
                            const globalIndex = () =>
                                windowStart() + localIndex()
                            const showHeader = () =>
                                shouldShowHeader(msg, globalIndex())

                            return (
                                <div
                                    id={`msg-${msg.id}`}
                                    class={`flex flex-col px-4 ${showHeader() ? 'gap-1 pt-4' : 'pt-1'}`}
                                >
                                    <Show when={showHeader()}>
                                        <div class="flex items-baseline gap-2">
                                            <span class="text-highlight-strong text-sm font-black">
                                                {msg.author_name}
                                            </span>
                                            <span class="text-sub/50 font-mono text-xs">
                                                {FormatChatDate(msg.timestamp)}
                                            </span>
                                        </div>
                                    </Show>
                                    <FancyTextRenderer
                                        content={msg.content}
                                        compact={true}
                                    />
                                </div>
                            )
                        }}
                    </For>

                    <div ref={bottomSentinelRef} class="h-2 w-full shrink-0" />
                </div>

                <Show when={showScrollBottom() || !isAtPresent()}>
                    <button
                        onClick={isAtPresent() ? scrollToBottom : jumpToPresent}
                        class="bg-highlight-strong text-dark hover:bg-highlight-strongest absolute right-6 bottom-4 z-50 flex items-center justify-center gap-2 rounded-full px-4 py-2 shadow-lg transition-all hover:scale-105 active:scale-95"
                    >
                        <Show
                            when={!isAtPresent()}
                            fallback={
                                <i class="fa-solid fa-arrow-down text-lg"></i>
                            }
                        >
                            <span class="text-sm font-bold">
                                Jump to Present
                            </span>
                        </Show>
                    </button>
                </Show>
            </div>

            <div class="border-element-accent bg-element flex flex-col gap-2 rounded-b-xl border-t p-3">
                <input
                    type="text"
                    placeholder="Your Name"
                    value={name() ?? ''}
                    onInput={handleNameChange}
                    class="bg-element-matte border-element-accent focus:border-sub/50 text-sub w-full rounded p-2 font-bold transition-all outline-none"
                />
                <div class="flex gap-2">
                    <textarea
                        ref={(el) => (chatTextAreaRef = el)}
                        rows="1"
                        placeholder={`Message ${getActiveLibrary()?.name}`}
                        value={content()}
                        onInput={(e) => setContent(e.currentTarget.value)}
                        onKeyDown={handleKeyDown}
                        class="bg-element-matte border-element-accent focus:border-sub/50 text-sub w-full resize-none rounded p-3 transition-all outline-none"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!content().trim()}
                        class="bg-highlight-strong text-dark hover:bg-highlight-strongest rounded px-4 font-bold transition-all disabled:pointer-events-none disabled:opacity-50"
                    >
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>
    )
}
