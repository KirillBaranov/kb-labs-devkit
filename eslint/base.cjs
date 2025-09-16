/** Base ESLint config for TypeScript (Node/Lib). */
module.exports = {
  root: false,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: false
  },
  env: { node: true, es2022: true },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  rules: {
    "no-console": "off",
    "no-debugger": "warn",
    "eqeqeq": ["error", "smart"],
    "curly": ["error", "all"],
    "@typescript-eslint/consistent-type-imports": ["warn", { "prefer": "type-imports" }],
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }]
  },
  ignorePatterns: [
    "dist/**",
    "coverage/**",
    "node_modules/**",
    "**/__tests__/**"
  ]
};
