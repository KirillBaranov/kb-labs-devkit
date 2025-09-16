import { mergeConfig } from 'vitest/config'
import base from './base'

export default mergeConfig(base, {
  test: {
    environment: 'node'
  }
})
