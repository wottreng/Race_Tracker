// jest-setup.js
const fs = require('fs');
const path = require('path');

// Mock browser globals
global.showToast = jest.fn();
global.show_error = jest.fn();
global.document = {
    getElementById: jest.fn().mockReturnValue({
        addEventListener: jest.fn(),
        style: {}
    })
};
global.window = {
    addEventListener: jest.fn()
};