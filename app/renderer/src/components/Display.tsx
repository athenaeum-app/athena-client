// src/components/display.tsx
import { Match, Switch, type Component } from 'solid-js'
import { ArchivesBar } from './ArchivesBar'
import { Feed } from './Feed'
import { FilterBar } from './FilterBar'
import { LibraryBar } from './LibraryBar'
import { libraries } from '../modules/store'
import { setDisplayedModal } from '../modules/globals'

const Display: Component = () => (
    <div class="relative flex h-[95%] w-full flex-col items-center justify-between gap-2 overflow-y-auto transition-all duration-100 lg:flex-row lg:overflow-hidden">
        <Switch>
            <Match when={libraries().length > 0}>
                <div class="z-10 order-1 w-full gap-2 md:flex md:flex-col lg:h-full lg:max-w-xs">
                    <LibraryBar />
                    <div class="overflow-y-auto">
                        <ArchivesBar />
                    </div>
                </div>
                <div
                    class={`order-3 max-h-screen w-full max-w-full lg:order-2 lg:h-full lg:max-w-4xl lg:overflow-y-auto`}
                >
                    <Feed />
                </div>
                <div class="z-10 order-2 w-full text-center md:block lg:order-3 lg:h-full lg:max-w-xs lg:text-left">
                    <div class="z-10 order-1 w-full justify-between gap-2 md:flex md:flex-col lg:h-full lg:max-w-xs">
                        <div class="overflow-y-auto">
                            <FilterBar />
                        </div>
                        <button
                            onClick={() => setDisplayedModal('APP_MENU_MODAL')}
                            class="bg-element hover:text-plain flex items-center justify-center gap-2 rounded-xl p-4 text-center font-bold transition-all duration-100 hover:scale-105 hover:cursor-pointer"
                        >
                            <span class="material-symbols-outlined text-xl">
                                settings
                            </span>
                            <span class="text-sub">Settings</span>
                        </button>
                    </div>
                </div>
            </Match>
            <Match when={libraries().length === 0}>
                <div class="flex h-full w-full items-center justify-center">
                    <div class="flex h-full w-full items-center justify-center p-4">
                        <div class="bg-element-matte border-sub flex max-w-xl flex-col items-center gap-8 rounded-4xl border-4 p-12 shadow-2xl">
                            <div class="flex flex-col items-center gap-4 text-center">
                                <span class="material-symbols-outlined text-sub text-4xl">
                                    auto_stories
                                </span>
                                <h1 class="text-sub text-3xl font-bold tracking-tighter">
                                    Welcome to Athena
                                </h1>
                                <p class="text-sub text-md max-w-md leading-relaxed font-semibold">
                                    Your personal knowledge library is empty.
                                    Create a local library to store your
                                    thoughts or connect to a self-hosted server
                                    to sync across devices.
                                </p>
                            </div>

                            <button
                                onClick={() =>
                                    setDisplayedModal('ADD_LIBRARY_MODAL')
                                }
                                class="bg-element-accent text-sub hover:bg-element-accent-highlight rounded-xl px-8 py-4 text-lg font-bold shadow-lg transition-all hover:scale-105 hover:cursor-pointer active:scale-95"
                            >
                                Create Your First Library
                            </button>
                        </div>
                    </div>
                </div>
            </Match>
        </Switch>
    </div>
)

export default Display
