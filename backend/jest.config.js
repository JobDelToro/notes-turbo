/** Jest config: runs both unit specs (src) and e2e specs (test) with ts-jest. */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '\\.(spec|e2e-spec)\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coveragePathIgnorePatterns: ['main.ts', '\\.module\\.ts$', 'entities/'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  // A single app + in-memory DB per e2e file; run serially for deterministic
  // throttle/cookie behaviour across suites.
  maxWorkers: 1,
};
