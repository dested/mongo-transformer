module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverage: true,
  coveragePathIgnorePatterns: ["/node_modules/", "./utils/queryBuilder.ts"],
  globals: {
    "ts-jest": {
      compiler: "ttypescript"
    }
  }
};
