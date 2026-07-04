declare module 'flv.js' {
  export interface MediaDataSource {
    type: string
    url: string
    isLive?: boolean
    hasAudio?: boolean
    hasVideo?: boolean
    enableWorker?: boolean
    cors?: boolean
    withCredentials?: boolean
    headers?: Record<string, string>
    [key: string]: any
  }

  export interface Player {
    attachMediaElement(mediaElement: HTMLVideoElement): void
    detachMediaElement(): void
    load(): void
    unload(): void
    play(): Promise<void>
    pause(): void
    destroy(): void
    on(event: string, handler: (...args: any[]) => void): void
    off(event: string, handler?: (...args: any[]) => void): void
  }

  export const Events: {
    ERROR: string
    LOADING_COMPLETE: string
    RECOVERED_EARLY_EOF: string
    MEDIA_INFO: string
    METADATA_ARRIVED: string
    SCRIPTDATA_ARRIVED: string
    STATISTICS_INFO: string
  }

  export function isSupported(): boolean
  export function createPlayer(mediaDataSource: MediaDataSource, config?: any): Player
}
