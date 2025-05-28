const { showInstallButton } = require('../../static/js/app_utils');
const fs = require('fs');
const path = require('path');

describe('showInstallButton', () => {
    beforeEach(() => {
        document.body.innerHTML =  fs.readFileSync(path.resolve(__dirname, '../../race_tracker.html'), 'utf8');
        global.deferredPrompt = null; // Reset deferredPrompt before each test
    });

    it('makes the install button visible when it exists', () => {
        showInstallButton();
        expect(document.getElementById('installBtn').classList.contains('d-none')).toBe(false);
    });
});