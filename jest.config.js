module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverage: false,
  coveragePathIgnorePatterns: ["/node_modules/", "./utils/queryBuilder.ts"],
  globals: {
    "ts-jest": {
      compiler: "ttypescript"
    }
  }
};
