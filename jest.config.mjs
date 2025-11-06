// jest.config.mjs
export default {
  collectCoverage: true,
  // Only measure your app code, not generated docs
  collectCoverageFrom: ["src/**/*.{js,jsx,ts,tsx,mjs}"],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/src/database/docs/",
    "/docs/",
    "/_build/",
    "/_static/",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/src/database/docs/"],
};