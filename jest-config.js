// jest.config.js
module.exports = {
  testTimeout: 10000, // Increase timeout for API calls
  testEnvironment: 'node',
  verbose: true,
  setupFilesAfterEnv: ['./jest.setup.js']
};
