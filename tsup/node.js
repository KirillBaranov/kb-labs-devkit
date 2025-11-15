import { defineConfig } from 'tsup'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function resolveExternalDependencies() {
  try {
    const pkgPath = join(process.cwd(), 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    const deps = Object.keys(pkg.dependencies ?? {})
    const peerDeps = Object.keys(pkg.peerDependencies ?? {})
    return Array.from(new Set([...deps, ...peerDeps]))
  } catch {
    return []
  }
}

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'es2022',
  sourcemap: true,
  clean: true,
  dts: true,
  treeshake: true,
  minify: false,
  outDir: 'dist',
  splitting: false,
  skipNodeModulesBundle: true,
  shims: false,
  external: resolveExternalDependencies(),
})
