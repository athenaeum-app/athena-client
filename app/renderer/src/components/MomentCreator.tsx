import {
    createEffect,
    createMemo,
    createSignal,
    For,
    onMount,
    Show,
    type Component,
    type ComponentProps,
} from 'solid-js'
import { Line } from './Line'
import {
    activeUploadCount,
    allMoments,
    allTags,
    archives,
    content,
    createMoment,
    defaultArchiveId,
    defaultArchiveName,
    editingMomentId,
    registerTags,
    saveFileReference,
    selectedArchiveId,
    setContent,
    setEditingMomentId,
    setTagsString,
    setTitle,
    swapMomentArchive,
    tagsString,
    title,
    updateMoment,
    type ArchiveId,
    type Tag,
} from '../modules/data'
import {
    displayedModal,
    displayedMomentModalId,
    animatedIconClasses,
    setDisplayedModal,
    sortTags,
} from '../modules/globals'
import { ExpandableContainer } from './ExpandableContainer'
import { TagButton } from './TagBar'

const textDisplayClasses =
    'caret-plain selection:bg-highlight-strong selection:text-sub placeholder:text-sub field-sizing-content resize-none bg-transparent  transition-colors outline-none placeholder:italic col-start-1 row-start-1 h-auto max-h-96 min-h-12 w-full overflow-x-hidden overflow-y-auto border border-transparent px-2 py-1 font-sans text-sm leading-normal break-all whitespace-pre-wrap'

export const MomentCreator: Component<
    ComponentProps<'div'> & {
        hide?: boolean
    }
> = (props) => {
    let archiveInputRef: HTMLInputElement | undefined
    let textInputAreaRef: HTMLTextAreaElement | undefined // not visible
    let textDisplayRef: HTMLDivElement | undefined

    const [isDragging, setIsDragging] = createSignal<boolean>(false)

    const getSuggestableTags = createMemo(() => {
        const allTagDatas = Object.values(allTags)
        const currentTypedTags = tagsString()
            .split(',')
            .map((tag) => tag.toUpperCase().trim())

        const currentTypedTag = currentTypedTags[currentTypedTags.length - 1]
        const alreadyTypedTags = currentTypedTags.slice(0, -1)

        const suggestedTags: Array<Tag> = []
        for (const tagData of allTagDatas) {
            if (
                tagData.name.includes(currentTypedTag) &&
                !currentTypedTags.includes(tagData.name)
            ) {
                suggestedTags.push(tagData)
            }
        }

        return sortTags(suggestedTags, alreadyTypedTags)
    })

    const cleanupCreator = () => {
        setTitle('')
        setContent('')
        setTagsString('')
    }

    const saveTags = () => {
        const tagNameArray: Array<string> = [
            ...new Set(
                tagsString()
                    .toUpperCase()
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter((tag) => tag.length > 0),
            ),
        ]
        return registerTags(tagNameArray)
    }

    const submitNewMoment = () => {
        const date = new Date()

        createMoment({
            title: title(),
            content: content(),
            archiveId: selectedArchiveId(),
            timestamp: date,
            tagIds: saveTags(),
        })
    }

    const saveEdit = () => {
        const targetMomentId = editingMomentId()
        const targetMomentData = targetMomentId && allMoments[targetMomentId]
        if (!targetMomentData) return

        updateMoment(targetMomentId, {
            title: title(),
            content: content(),
            tagIds: saveTags(),
        })

        saveArchiveChanges()
        setBufferArchive(archiveName() || '')
    }

    const isUploading = () => activeUploadCount() > 0

    const attemptSubmit = () => {
        if (title().trim() == '' || content().trim() == '' || isUploading())
            return

        if (displayedModal() == 'EDIT_MODAL' && editingMomentId()) {
            console.log('Attempting to modify moment!')
            saveEdit()
            setEditingMomentId()
            if (displayedMomentModalId()) {
                setDisplayedModal('DISPLAY_MOMENT_MODAL')
            } else {
                setDisplayedModal('NONE')
            }
        } else {
            submitNewMoment()
        }
        cleanupCreator()
    }

    onMount(() => {
        createEffect(() => {
            if (displayedModal() != 'NONE') return
            setEditingMomentId()
            setContent('')
            setTitle('')
            setTagsString('')
        })
    })

    const archiveName = createMemo(() => {
        let candidateArchiveName =
            archives()[selectedArchiveId() || ('' as ArchiveId)]?.name
        const editMomentId = editingMomentId()
        if (editMomentId) {
            candidateArchiveName =
                archives()[
                    allMoments[editMomentId].archiveId || defaultArchiveId
                ].name
        }
        if (candidateArchiveName == defaultArchiveName) return
        return candidateArchiveName
    })

    const [switchingArchive, setSwitchingArchive] = createSignal<boolean>(false)
    const [bufferArchive, setBufferArchive] = createSignal<string>(
        archiveName() || '',
    )

    createEffect(() => {
        const editingMomentData = allMoments[editingMomentId()!]

        const archiveData =
            archives()[editingMomentData?.archiveId! || selectedArchiveId()!]
        if (archiveData) {
            const name =
                archiveData.name == defaultArchiveName ? '' : archiveData.name
            setBufferArchive(name)
        }
    })

    const saveArchiveChanges = () => {
        const currentBufferArchiveName = bufferArchive()
        const editMomentId = editingMomentId()
        if (editMomentId) {
            swapMomentArchive(editMomentId, currentBufferArchiveName)
        }
    }

    const processFiles = (files: FileList | File[]) => {
        let hasFiles = false
        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            if (file) {
                hasFiles = true
                saveFileReference(file, {
                    Start: textInputAreaRef?.selectionStart,
                    End: textInputAreaRef?.selectionEnd,
                })
            }
        }
        return hasFiles
    }

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault()
        if (!props.hide) setIsDragging(true)
    }

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault()
        if (
            e.currentTarget &&
            !(e.currentTarget as Node).contains(e.relatedTarget as Node)
        ) {
            setIsDragging(false)
        }
    }

    const handleDrop = (e: DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (props.hide) return

        const files = e.dataTransfer?.files
        if (files && files.length > 0) {
            processFiles(files)
        }
    }

    const insertMarkdown = (prefix: string, suffix: string = '') => {
        if (!textInputAreaRef) return

        const start = textInputAreaRef.selectionStart
        const end = textInputAreaRef.selectionEnd
        const currentText = content()

        const before = currentText.substring(0, start)
        const selected = currentText.substring(start, end)
        const after = currentText.substring(end)

        const newSelectedText = selected
            ? `${prefix}${selected}${suffix}`
            : `${prefix}${suffix}`
        setContent(before + newSelectedText + after)

        setTimeout(() => {
            textInputAreaRef!.focus()
            const newCursorPos =
                start + prefix.length + (selected ? selected.length : 0)
            textInputAreaRef!.setSelectionRange(newCursorPos, newCursorPos)
        }, 0)
    }

    const ToolbarButton: Component<{
        icon: string
        title: string
        onClick: () => void
    }> = (btnProps) => (
        <button
            title={btnProps.title}
            onClick={btnProps.onClick}
            onMouseDown={(e) => e.preventDefault()}
            class="text-sub hover:text-highlight-strong hover:bg-element-accent flex items-center justify-center rounded p-1 transition-colors"
        >
            <span class="material-symbols-outlined" style="font-size: 18px;">
                {btnProps.icon}
            </span>
        </button>
    )

    return (
        <ExpandableContainer expanded={!props.hide}>
            <div class="relative max-w-4xl overflow-hidden">
                <Show when={isDragging() && !props.hide}>
                    <div class="bg-element/80 pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-xl backdrop-blur-sm">
                        <span class="text-highlight text-lg font-bold drop-shadow-md">
                            Drop files to attach
                        </span>
                    </div>
                </Show>

                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    class={`bg-element-matte flex flex-col gap-3 overflow-hidden rounded-xl transition-all duration-500 ${
                        props.hide
                            ? 'border-element-matte grid-rows-[0fr] border-0'
                            : isDragging()
                              ? 'border-highlight bg-element-accent/50 grid-rows-[1fr] border-2 border-dashed p-4'
                              : 'border-highlight-alt grid-rows-[1fr] border p-4'
                    }`}
                >
                    <input
                        class="text-sub placeholder-sub bg-transparent px-2 py-1 text-lg font-bold outline-none"
                        placeholder="Moment Title..."
                        value={props.hide ? '' : title()}
                        onInput={(e) => setTitle(e.currentTarget.value)}
                    />

                    <div class="border-element-accent flex items-center gap-1 border-b px-2 pb-2">
                        <ToolbarButton
                            icon="format_bold"
                            title="Bold"
                            onClick={() => insertMarkdown('**', '**')}
                        />
                        <ToolbarButton
                            icon="format_italic"
                            title="Italic"
                            onClick={() => insertMarkdown('*', '*')}
                        />
                        <ToolbarButton
                            icon="format_strikethrough"
                            title="Strikethrough"
                            onClick={() => insertMarkdown('~~', '~~')}
                        />
                        <div class="bg-element-accent mx-1 h-4 w-px"></div>
                        <ToolbarButton
                            icon="title"
                            title="Heading"
                            onClick={() => insertMarkdown('# ')}
                        />
                        <ToolbarButton
                            icon="format_list_bulleted"
                            title="Bullet List"
                            onClick={() => insertMarkdown('- ')}
                        />
                        <ToolbarButton
                            icon="format_quote"
                            title="Quote"
                            onClick={() => insertMarkdown('> ')}
                        />
                        <div class="bg-element-accent mx-1 h-4 w-px"></div>
                        <ToolbarButton
                            icon="code"
                            title="Code"
                            onClick={() => insertMarkdown('`', '`')}
                        />
                        <div class="bg-element-accent mx-1 h-4 w-px"></div>
                        <ToolbarButton
                            icon="table_chart"
                            title="Table"
                            onClick={() =>
                                insertMarkdown(
                                    '\n| Header 1 | Header 2 |\n| :--- | :--- |\n| Cell 1 | Cell 2 |\n',
                                )
                            }
                        />
                    </div>

                    <div class="relative grid w-full">
                        <textarea
                            ref={textInputAreaRef}
                            onScroll={(e) => {
                                if (textDisplayRef) {
                                    textDisplayRef.scrollTop =
                                        e.currentTarget.scrollTop
                                }
                            }}
                            class={`${textDisplayClasses} text-sub`}
                            placeholder="Moment description..."
                            onKeyDown={(e) => {
                                if (e.key.toLowerCase() === 'tab') {
                                    insertMarkdown('    ')
                                    e.preventDefault()
                                    e.stopPropagation()
                                }

                                if (e.ctrlKey || e.metaKey) {
                                    let handled = true
                                    const key = e.key.toLowerCase()

                                    if (key === 'b') {
                                        insertMarkdown('**', '**')
                                    } else if (key === 'i') {
                                        insertMarkdown('*', '*')
                                    } else if (key === 'k') {
                                        insertMarkdown('[', '](url)')
                                    } else if (key === 'd') {
                                        insertMarkdown('~~', '~~')
                                    } else if (key === 's' || key === 'enter') {
                                        attemptSubmit()
                                    } else {
                                        handled = false
                                    }

                                    if (handled) {
                                        e.preventDefault()
                                        e.stopPropagation()
                                    }
                                }
                            }}
                            onPaste={(e) => {
                                const clipboardData = e.clipboardData
                                if (!clipboardData) return

                                const items = clipboardData.items
                                const filesToProcess: File[] = []

                                for (let i = 0; i < items.length; i++) {
                                    const item = items[i]
                                    if (item.kind == 'file') {
                                        const file = item.getAsFile()
                                        if (file) {
                                            filesToProcess.push(file)
                                        }
                                    }
                                }

                                if (filesToProcess.length > 0) {
                                    processFiles(filesToProcess)
                                    e.preventDefault()
                                }
                            }}
                            value={props.hide ? '' : content()}
                            onInput={(e) => setContent(e.currentTarget.value)}
                        />
                    </div>
                    <div class="mx-2 flex w-full flex-col items-center gap-6">
                        <input
                            class="bg-element text-sub placeholder-sub focus:border-highlight-strong w-full rounded border border-transparent px-2 py-1.5 font-mono text-xs font-bold outline-none"
                            placeholder="Tags (comma separated)... e.g. GAMES, ENTERTAINMENT, ROMANCE"
                            value={props.hide ? '' : tagsString()}
                            onInput={(e) =>
                                setTagsString(e.currentTarget.value)
                            }
                            onKeyDown={(e) => {
                                if (e.key == 'Enter') {
                                    attemptSubmit()
                                }
                            }}
                        />

                        <Show
                            when={
                                (title() != '' ||
                                    content() != '' ||
                                    tagsString().length > 0) &&
                                getSuggestableTags().length > 0 &&
                                !props.hide
                            }
                        >
                            <div class="flex w-full flex-wrap items-center gap-2 rounded-lg text-sm font-bold tracking-widest">
                                <span class="text-sub font-black">
                                    Suggested:
                                </span>
                                <For each={getSuggestableTags()}>
                                    {(tagData) => (
                                        <label
                                            onClick={() => {
                                                setTagsString((prev) => {
                                                    const tagArray =
                                                        prev.split(',')
                                                    const length =
                                                        tagArray.length
                                                    tagArray[length - 1] =
                                                        tagData.name
                                                    return (
                                                        tagArray.join(',') + ','
                                                    )
                                                })
                                            }}
                                        >
                                            <TagButton
                                                disabled={true}
                                                tagId={tagData.id}
                                            />
                                        </label>
                                    )}
                                </For>
                            </div>
                        </Show>

                        <Line class="bg-element-accent h-0.5 w-full" />
                        <div class="flex w-full flex-wrap items-center justify-between text-sm">
                            <div class="group bg-element-accent bg flex items-center gap-1 rounded p-2">
                                <div class="text-element-accent-highlight flex items-center gap-2 px-2 font-mono tracking-widest">
                                    <span>DESTINATION:</span>
                                    <input
                                        ref={archiveInputRef}
                                        disabled={
                                            switchingArchive() ? false : true
                                        }
                                        onFocusOut={() => {
                                            setSwitchingArchive(false)
                                        }}
                                        placeholder="No Archive"
                                        value={`${archiveName() || bufferArchive() ? bufferArchive() : ''}`}
                                        class="bg-element-accent text-highlight-matte field-sizing-content p-1"
                                        onInput={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            setBufferArchive(
                                                e.currentTarget.value
                                                    .trim()
                                                    .toUpperCase(),
                                            )
                                        }}
                                        onKeyDown={(e) => {
                                            e.stopPropagation()
                                            if (e.key == 'Enter') {
                                                setSwitchingArchive(false)
                                            }
                                            if (e.key == 'Escape') {
                                                setSwitchingArchive(false)
                                            }
                                        }}
                                    ></input>
                                    <i
                                        class={
                                            animatedIconClasses + 'fa-pencil'
                                        }
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            setSwitchingArchive(true)
                                            if (archiveInputRef) {
                                                archiveInputRef.focus()
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <button
                                disabled={isUploading()}
                                onClick={attemptSubmit}
                                class="hover:bg-highlight-strong hg hover:shadow-highlight-strong bg-highlight hover:border-highlight-strong rounded px-4 py-2 text-xs font-bold tracking-widest transition-all duration-200 hover:scale-105 hover:cursor-pointer hover:shadow-md hover:duration-50 active:scale-95"
                            >
                                {editingMomentId() ? 'EDIT' : 'STORE'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ExpandableContainer>
    )
}
