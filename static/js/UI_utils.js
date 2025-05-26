
function emphasizeTextUI(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.color = '#ff0000';
        element.style.fontSize = '1.5em';
        element.style.fontWeight = 'bold';
        element.style.textShadow = '0 0 5px #0af';
        element.style.transition = 'all 0.2s ease-in-out';
        element.style.transform = 'scale(1.2)';
    }
}

function deEmphasizeTextUI(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.color = '#0af';
        element.style.fontSize = '1em';
        element.style.fontWeight = 'normal';
        element.style.textShadow = 'none';
        element.style.transition = 'all 0.2s ease-in-out';
        element.style.transform = 'scale(1)';
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        emphasizeTextUI,
        deEmphasizeTextUI
    };
}