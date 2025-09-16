/** Library package config (stricter). */
module.exports = {
  extends: [require.resolve("./base.cjs")],
  rules: {
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "off" // включишь когда будешь готов
  }
};
