#!/usr/bin/env node
import { run } from "../sync/index.mjs";

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  check: args.includes("--check"),
  force: args.includes("--force"),
  verbose: args.includes("--verbose"),
  only: args.filter(arg => !arg.startsWith("--"))
};

// Run the sync operation and exit with the returned code
const exitCode = await run(options);
process.exit(exitCode);
