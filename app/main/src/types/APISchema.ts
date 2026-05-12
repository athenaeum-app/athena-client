import { DataSnapshot } from '@app/renderer/src/modules/store'

export interface ScrapeData {
    title: string
    description: string
    siteLink: string
    image: string
    video: string
}

export const IpcApi = {
    status: async () => '',
    openExternalBrowser: async (_: string) => undefined,
    // Add read/write methods
    readData: () => new Promise<DataSnapshot | undefined>(() => ({})),
    writeMainData: (_: any) => {},
    scrapeWebsiteData: async (_: string, __?: boolean) => ({}) as ScrapeData,
    openFileFromURI: (_: string) => {},
    getFileNameFromURI: (_: string) => '',
    saveFileRef: async (
        _: ArrayBuffer,
        __: string,
    ): Promise<string | undefined> => '',
    readSettings: () => ({}) as any,
    writeSettings: (_: any) => {},
    requestUpdateCheck: () =>
        new Promise<'AVAILABLE' | 'UP_TO_DATE' | 'ERROR'>(() => {}),
}

export type IPC_API = typeof IpcApi
