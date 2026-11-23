/** Shared test fixtures for integration tests. */

import { fileURLToPath } from "node:url";
import { test } from "../src/vitest.js";

const FIXTURES_DIR = fileURLToPath(
  new URL("../../../tests/fixtures/", import.meta.url),
);

export const it = test.extend<{ fixtureCmd: (name: string) => string }>({
  // biome-ignore lint/correctness/noEmptyPattern: vitest requires destructuring
  fixtureCmd: async ({}, use) => {
    await use((name) => `python3 ${FIXTURES_DIR}${name}`);
  },
});
