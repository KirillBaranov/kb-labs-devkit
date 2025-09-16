/** CLI package config (allows console and process). */
module.exports = {
  extends: [require.resolve("./base.cjs")],
  env: { node: true },
  rules: {
    "no-console": "off",
    "no-process-exit": "off"
  }
};
