/// <reference types="vite/client" />

import type { UberSplitDebugObject } from '@/types/ride'

declare global {
  interface Window {
    __UBER_SPLIT_DEBUG__?: UberSplitDebugObject
  }
}
