import { createEffect } from 'solid-js'
import {
    deleteMoment,
    momentToDelete,
    setMomentToDelete,
    libraryToDelete,
    setLibraryToDelete,
    deleteLibraryData,
    activeLibraryId,
    libraries,
    setActiveLibraryId,
} from '../modules/data'
import {
    closeMomentModal,
    displayedModal,
    displayedMomentModalId,
    setDisplayedModal,
    type MODAL_NAMES,
} from '../modules/globals'
import ConfirmModal from './ConfirmModal'
import ModalContainer from './ModalContainer'
import { MomentCreator } from './MomentCreator'
import { MomentModal } from './MomentModal'
import AddLibraryModal from './AddLibraryModal'

export const Modals = () => {
    createEffect(() => {
        if (displayedModal() == 'NONE' && displayedMomentModalId())
            setDisplayedModal('DISPLAY_MOMENT_MODAL')
    })

    return (
        <ModalContainer<MODAL_NAMES>
            state={displayedModal}
            stateSetter={setDisplayedModal}
            onClose={() => {
                closeMomentModal()
                setLibraryToDelete(null) // Reset on close
            }}
            modals={[
                {
                    state_name: 'EDIT_MODAL',
                    content: <MomentCreator />,
                },
                {
                    state_name: 'CONFIRM_MOMENT_DELETE',
                    content: (
                        <ConfirmModal
                            title="Delete Moment?"
                            rejectCallback={() => {
                                setMomentToDelete()
                                if (displayedMomentModalId()) {
                                    setDisplayedModal('DISPLAY_MOMENT_MODAL')
                                }
                            }}
                            acceptCallback={() => {
                                closeMomentModal()
                                const targetMomentId = momentToDelete()
                                if (targetMomentId) {
                                    console.log(
                                        `Attempting to delete ${targetMomentId}`,
                                    )
                                    deleteMoment(targetMomentId)
                                }
                            }}
                        />
                    ),
                },
                {
                    state_name: 'CONFIRM_LIBRARY_DELETE',
                    content: (
                        <ConfirmModal
                            title="Remove Library?"
                            rejectCallback={() => {
                                setLibraryToDelete(null)
                                setDisplayedModal('NONE')
                            }}
                            acceptCallback={() => {
                                const targetId = libraryToDelete()
                                if (targetId) {
                                    console.log(`Removing library ${targetId}`)
                                    deleteLibraryData(targetId)

                                    if (activeLibraryId() === targetId) {
                                        const remaining = libraries().filter(
                                            (l) => l.id !== targetId,
                                        )
                                        if (remaining.length > 0) {
                                            setActiveLibraryId(remaining[0].id)
                                        }
                                    }
                                }
                                setLibraryToDelete(null)
                                setDisplayedModal('NONE')
                            }}
                        />
                    ),
                },
                {
                    state_name: 'DISPLAY_MOMENT_MODAL',
                    content: <MomentModal />,
                },
                {
                    state_name: 'ADD_LIBRARY_MODAL',
                    content: <AddLibraryModal />,
                },
            ]}
        />
    )
}
