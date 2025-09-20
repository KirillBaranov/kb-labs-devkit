import { describe, it, expect } from 'vitest'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

describe('CLI fixture', () => {
  it('should greet without excitement', async () => {
    const { stdout } = await execAsync('node dist/cli.js greet World')
    expect(stdout.trim()).toBe('Hello, World.')
  })

  it('should greet with excitement', async () => {
    const { stdout } = await execAsync('node dist/cli.js greet World --excited')
    expect(stdout.trim()).toBe('Hello, World!')
  })

  it('should perform addition', async () => {
    const { stdout } = await execAsync('node dist/cli.js calculate add 5 3')
    expect(stdout.trim()).toBe('Result: 8')
  })

  it('should handle division by zero', async () => {
    try {
      await execAsync('node dist/cli.js calculate divide 5 0')
    } catch (error: any) {
      expect(error.stderr).toContain('Division by zero')
    }
  })
})
