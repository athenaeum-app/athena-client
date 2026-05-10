import { onCleanup } from 'solid-js'
import { setIsSearching } from '../components/Feed'
import {
    displayedModal,
    displayType,
    setDisplayedModal,
    setDisplayType,
} from './globals'
import {
    isLibraryBarExpanded,
    setIsLibraryBarExpanded,
} from '../components/LibraryBar'

const handleKeyPress = (event: KeyboardEvent) => {
    const activeElement = window.document.activeElement
    const isTyping =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA'

    const isModifier = event.ctrlKey || event.metaKey

    if (isModifier && event.key.toLowerCase() === 'f' && !event.shiftKey) {
        console.log('Searching')
        event.preventDefault()
        setIsSearching(true)
    }

    if (isModifier && event.key.toLowerCase() === 'q' && !event.shiftKey) {
        setIsLibraryBarExpanded(!isLibraryBarExpanded())
    }

    if (isModifier && event.key.toLowerCase() === 'g' && !event.shiftKey) {
        if (displayType() === 'Full') {
            setDisplayType('Grid')
        } else {
            setDisplayType('Full')
        }
    }

    if (!isTyping && !isModifier && event.key.toLowerCase() === 'escape') {
        setDisplayedModal('NONE')
    }

    if (isModifier && event.key.toLowerCase() === 'm' && !event.shiftKey) {
        if (displayedModal() === 'APP_MENU_MODAL') {
            setDisplayedModal('NONE')
        } else {
            setDisplayedModal('APP_MENU_MODAL')
        }
    }
}

export const initShortcuts = () => {
    window.addEventListener('keydown', handleKeyPress)
    onCleanup(() => {
        window.removeEventListener('keydown', handleKeyPress)
    })
}
