// jest.config.ts
import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  preset: "ts-jest",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "CommonJS",
          moduleResolution: "node",
        },
      },
    ],
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  collectCoverageFrom: [
    "lib/services/**/*.ts",
    "lib/jobs/**/*.ts",
    "!lib/**/*.d.ts",
  ],
  // Ignore node_modules and Next.js build output
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  // Setup for DB tests
  globalSetup: undefined,
  globalTeardown: undefined,
};

export default config;
