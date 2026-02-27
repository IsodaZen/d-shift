import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// 各テスト後にDOMをクリーンアップし、localStorageをリセット
afterEach(() => {
  cleanup()
  localStorage.clear()
})

/**
 * デフォルトの Web Worker モック。
 * JSDOM 環境では Worker が未定義のため、
 * postMessage 呼び出し時に即座に空の result を返す自動完了モックを提供する。
 * 最適化フローのテストは各テストファイルで vi.stubGlobal により独自のモックに上書きする。
 */
vi.stubGlobal(
  'Worker',
  class {
    onmessage: ((event: MessageEvent) => void) | null = null
    onerror: ((event: ErrorEvent) => void) | null = null

    postMessage() {
      // テスト環境では即座に空の result を返して最適化完了をシミュレートする
      this.onmessage?.({ data: { type: 'result', assignments: [] } } as MessageEvent)
    }

    terminate() {}
  },
)
