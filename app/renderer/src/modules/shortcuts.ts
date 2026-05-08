import { onCleanup } from 'solid-js'
import { setIsSearching } from '../components/Feed'
import { setDisplayedModal } from './globals'

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

    if (!isTyping && !isModifier && event.key.toLowerCase() === 'escape') {
        setDisplayedModal('NONE')
    }
}

export const initShortcuts = () => {
    window.addEventListener('keydown', handleKeyPress)
    onCleanup(() => {
        window.removeEventListener('keydown', handleKeyPress)
    })
}
