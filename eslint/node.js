
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'

export default [
  // ---- ignore common build artifacts and generated files
  {
    ignores: [
      '/dist/',
      '/coverage/',
      '/.yalc/',
      '/node_modules/',
      '**/*.d.ts'
    ]
  },

  // ---- base TypeScript recommendations
  ...tseslint.configs.recommended,

  // ---- project-wide rules and import resolver
  {
    plugins: {
      import: importPlugin,
    },
    settings: {
      // Let eslint-plugin-import resolve TS paths and packages without extensions
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['./tsconfig.json'],
        },
      },
    },
    languageOptions: {
      // Enable type-aware capabilities when available without forcing per-repo setup
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      // Allow bare imports without file extensions for TS/JS in ESM projects
      'import/extensions': ['error', 'ignorePackages', {
        ts: 'never', tsx: 'never', mts: 'never', cts: 'never',
        js: 'never', mjs: 'never', cjs: 'never',
      }],

      // Allow dev dependencies in tests, configs and scripts
      'import/no-extraneous-dependencies': ['error', {
        devDependencies: [
          '**/*.{test,spec}.{ts,tsx,js,jsx,mts,cts}',
          '**/__tests__/**',
          '**/vite.config.*',
          '**/vitest.config.*',
          '**/tsup.config.*',
          '**/eslint.config.*',
          '**/scripts/**',
        ],
      }],

      // TS ergonomics
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],

      // General safety / clarity
      'no-console': 'off',
      'no-debugger': 'warn',
      'eqeqeq': ['error', 'smart'],
      'curly': ['error', 'all'],
    },
  },

  // ---- minimal .vue support (without forcing Vue plugin)
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { extraFileExtensions: ['.vue'] },
    },
  },
]
