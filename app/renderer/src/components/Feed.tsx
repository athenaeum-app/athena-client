import { For, Show, type Component } from 'solid-js'
import { Moment } from './Moment'
import { MomentCreator } from './MomentCreator'
import {
    displayedModal,
    displayType,
    getFilteredMoments,
    setDisplayType,
} from '../modules/globals'
import {
    activeLibraryId,
    serverRole,
    shouldBlurLibraryView,
    switchingLibrary,
} from '../modules/store'
import { getCurrentLibrary } from '../modules/libraries'
import { LoadingSpinner } from './LoadingSpinner'

const fullDisplayClasses =
    'flex h-full w-full flex-col items-center gap-4 rounded-xl'

const gridDisplayClasses = 'grid grid-cols-4 gap-2'

export const Feed: Component = () => {
    console.log(activeLibraryId())
    return (
        <div class="bg-element pt flex w-full items-center justify-center gap-2 overflow-x-hidden rounded-xl p-2 lg:p-4">
            <div class={'flex h-full w-[90%] flex-col items-center gap-4'}>
                <div
                    class="flex w-full"
                    onClick={() => {
                        if (displayType() == 'Full') {
                            setDisplayType('Grid')
                        } else {
                            setDisplayType('Full')
                        }
                    }}
                >
                    <div class="ml-auto">
                        <Show
                            when={displayType() == 'Full'}
                            fallback={
                                <span class="material-symbols-outlined hover:cursor-pointer">
                                    grid_view
                                </span>
                            }
                        >
                            <i class="fa-solid fa-bars text-icon hover:cursor-pointer"></i>
                        </Show>
                    </div>
                </div>
                <Show
                    when={!switchingLibrary()}
                    fallback={
                        <div class="w-full">
                            <LoadingSpinner text="Loading library..." />
                        </div>
                    }
                >
                    <div
                        class={`${shouldBlurLibraryView() ? 'blur-sm' : ''} w-full`}
                    >
                        <MomentCreator
                            hide={
                                displayedModal() == 'EDIT_MODAL' ||
                                (getCurrentLibrary()?.type === 'server'
                                    ? serverRole() != 'admin'
                                    : false) ||
                                shouldBlurLibraryView()
                            }
                        />
                    </div>
                    <div
                        class={`${displayType() == 'Full' ? fullDisplayClasses : gridDisplayClasses}`}
                    >
                        <For each={getFilteredMoments()}>
                            {(momentData) => {
                                return (
                                    <div
                                        class={`${shouldBlurLibraryView() ? 'blur-sm' : ''} w-full`}
                                    >
                                        <Moment data={momentData} />
                                    </div>
                                )
                            }}
                        </For>
                    </div>
                </Show>
            </div>
        </div>
    )
}
