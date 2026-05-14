import { ExpandableContainer } from './ExpandableContainer'
import { createSignal, type Component, type ComponentProps } from 'solid-js'

export const PrefabExpandableContainer: Component<ComponentProps<'div'>> = (
    props,
) => {
    const [expanded, setExpanded] = createSignal(false)
    return (
        <div class="w-full flex-col items-center overflow-hidden">
            <ExpandableContainer expanded={expanded()}>
                {props.children}
            </ExpandableContainer>
            <span
                onClick={() => setExpanded(!expanded())}
                class="material-symbols-outlined w-full text-center text-xl transition-transform duration-300 ease-in-out hover:cursor-pointer"
                classList={{
                    'rotate-180': expanded(),
                }}
            >
                keyboard_arrow_down
            </span>
        </div>
    )
}
