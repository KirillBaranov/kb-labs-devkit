import { describe, it, expect } from 'vitest'
import { sum, VERSION } from '../src/index.js'
describe('fixture smoke', () => {
  it('sums', () => { expect(sum(2, 3)).toBe(5) })
  it('version exposed', () => { expect(VERSION).toBe('fixture') })
})
