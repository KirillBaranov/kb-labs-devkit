/** Node service/binary style config. */
module.exports = {
  extends: [require.resolve("./base.cjs")],
  env: { node: true },
  rules: {
    "no-process-exit": "off"
  }
};
