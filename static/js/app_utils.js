let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    console.info('Install prompt');
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Show your custom install button here
    showInstallButton();
});

function showInstallButton() {
    console.info('Showing install button');
    const installButton = document.getElementById('installBtn');
    if (installButton) {
        // remove d-none class if it exists
        installButton.classList.remove('d-none');
    }
}

function promptInstall() {
    console.info('Prompting install');
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