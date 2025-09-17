import tseslint from 'typescript-eslint'

export default [
  ...tseslint.configs.recommended,
  {
    ignores: [
      '/dist/',
      '/coverage/',
      '/.yalc/',
      '/node_modules/',
      '**/*.d.ts'
    ]
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      'no-console': 'off',
      'no-debugger': 'warn',
      'eqeqeq': ['error', 'smart'],
      'curly': ['error', 'all']
    }
  }
]
