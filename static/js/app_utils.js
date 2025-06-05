let deferredPrompt;

// Check if the device is running iOS (iPhone/iPad)
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Check if the browser is Safari
function isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

// Show install button based on device/browser
function showInstallButton() {
    console.info('Showing install button');
    const installButton = document.getElementById('installBtn');

    if (installButton) {
        // Remove d-none class if it exists
        installButton.classList.remove('d-none');

        // Show iOS-specific instructions for Safari on iPhone
        if (isIOS() && isSafari()) {
            installButton.textContent = 'Add to Home Screen';
            installButton.setAttribute('data-ios', 'true');
        }
    }
}

// Handle install button click
function promptInstall() {
    console.info('Prompting install');

    // For Safari on iOS, show instructions
    if (isIOS() && isSafari()) {
        alert('To install this app on your iPhone: tap the Share button, then "Add to Home Screen"');
        return;
    }

    // For browsers supporting beforeinstallprompt
    if (deferredPrompt) {
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.info('User accepted the install prompt');
            } else {
                console.info('User dismissed the install prompt');
            }
            // Clear the deferredPrompt variable, since it can only be used once.
            deferredPrompt = null;
        });
    } else {
        console.warn('No deferred prompt available');
    }
}

// For browsers that support beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
    console.info('Install prompt');
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Show your custom install button
    showInstallButton();
});

// For Safari on iOS, show install button on page load
document.addEventListener('DOMContentLoaded', () => {
    if (isIOS() && isSafari()) {
        showInstallButton();
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showInstallButton,
    };
}