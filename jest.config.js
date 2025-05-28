module.exports = {
    collectCoverage: true,
    collectCoverageFrom: ['static/js/*.js'],
    coverageDirectory: 'coverage',
    coverageReporters: ['lcov', 'text-summary'],
    testEnvironment: 'jsdom',
    setupFiles: []
};