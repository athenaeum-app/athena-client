import {
    createSignal,
    onMount,
    onCleanup,
    For,
    Show,
    type Component,
    createEffect,
} from 'solid-js'
import {
    activeLibraryId,
    getActiveLibrary,
    getCurrentLibrary,
} from '../modules/data'
import { displayedModal } from '../modules/globals'
import { allMessages, setAllMessages } from '../modules/store'
import { unwrap } from 'solid-js/store'

interface BufferMessage {
    id: string
    author_name: string
    content: string
    timestamp: string
}

export const BufferChatModal: Component = () => {
    const [name, setName] = createSignal(
        localStorage.getItem(activeLibraryId() + '_chatname') || 'Anonymous',
    )
    const [content, setContent] = createSignal('')
    let chatTextAreaRef: HTMLTextAreaElement | undefined
    let chatContainerRef: HTMLDivElement | undefined

    const fetchMessages = async () => {
        const lib = getCurrentLibrary()

        if (!lib || lib.type !== 'server') return

        try {
            const res = await fetch(`${lib.url}/api/buffer`, {
                headers: { Authorization: `Bearer ${lib.token}` },
            })
            if (res.ok) {
                const data = await res.json()
                if (data.length !== allMessages.length) {
                    setAllMessages(data)
                    scrollToBottom()
                }
            }
        } catch (err) {
            console.error('Failed to fetch buffer chat', err)
        }
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

        setAllMessages([...unwrap(allMessages), newMsg].slice(-500))
        setContent('')
        scrollToBottom()

        if (lib.type === 'server') {
            try {
                const res = await fetch(`${lib.url}/api/buffer`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${lib.token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                })
                if (res.ok) {
                    fetchMessages()
                }
            } catch (err) {
                console.error('Failed to send message', err)
            }
        }
    }

    createEffect(() => {
        const libId = activeLibraryId()
        const lib = getCurrentLibrary()

        const savedName = localStorage.getItem(libId + '_chatname')
        setName(savedName || 'Anonymous')

        if (lib && lib.type === 'server') {
            fetchMessages()
        }
    })

    createEffect(() => {
        allMessages.length
        scrollToBottom()
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
        if (chatContainerRef) {
            chatContainerRef.scrollTop = chatContainerRef.scrollHeight
        }
    }

    onMount(() => {
        fetchMessages()
        const interval = setInterval(fetchMessages, 5000)
        onCleanup(() => clearInterval(interval))
    })

    createEffect(() => {
        if (displayedModal() === 'CHAT_MODAL' && chatTextAreaRef) {
            scrollToBottom()
            chatTextAreaRef.focus()
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
            <div class="border-element-accent border-b p-3">
                <h2 class="text-sub text-sm font-bold tracking-widest">
                    <i class="fa-solid fa-bolt text-highlight mr-2"></i>
                    BUFFER CHAT
                </h2>
            </div>

            <div
                ref={chatContainerRef}
                class={`${displayedModal() === 'CHAT_MODAL' ? 'max-h-[70vh]' : 'h-auto'} flex flex-1 flex-col overflow-y-auto scroll-smooth p-4`}
            >
                <For each={allMessages}>
                    {(msg, index) => {
                        const showHeader = () => shouldShowHeader(msg, index())

                        return (
                            <div
                                class={`flex flex-col ${showHeader() ? 'mt-4 gap-1' : 'mt-1'}`}
                            >
                                <Show when={showHeader()}>
                                    <div class="flex items-baseline gap-2">
                                        <span class="text-highlight-strong text-sm font-black">
                                            {msg.author_name}
                                        </span>
                                        <span class="text-sub/50 font-mono text-xs">
                                            {new Date(
                                                msg.timestamp,
                                            ).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                </Show>
                                <span class="text-sub text-sm wrap-break-word whitespace-pre-wrap">
                                    {msg.content}
                                </span>
                            </div>
                        )
                    }}
                </For>
            </div>

            <div class="border-element-accent bg-element flex flex-col gap-2 rounded-b-xl border-t p-3">
                <input
                    type="text"
                    placeholder="Name"
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
