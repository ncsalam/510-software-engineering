// jest.config.mjs
export default {
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/src/database/docs/",
    "/_build/",
    "/_static/",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/src/database/docs/"],
}