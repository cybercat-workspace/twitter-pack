module.exports = {
  transform: {
    '\\.ts$': 'ts-jest'
  },
  testMatch: ['**/+(*.)+(spec|test).+(ts|js)?(x)'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json'
    }
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/'],
  collectCoverageFrom: ['!**/*fixtures*/**', '!**/*mocks*/**'],
  coveragePathIgnorePatterns: ['/node_modules/']
};
