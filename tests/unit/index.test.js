const { toggleAutoLogging } = require('../../static/js/index');
const fs = require('fs');
const path = require('path');


describe("toggleAutoLogging", () => {
    let autoLogToggle, logStatus, speedCheckInterval;

    beforeEach(() => {
        global.bootstrap = {
            Toast: jest.fn().mockImplementation(() => ({
                show: jest.fn()
            }))
        };
        document.body.innerHTML =  fs.readFileSync(path.resolve(__dirname, '../../race_tracker.html'), 'utf8');
        autoLogToggle = document.getElementById("autoLogToggle");
        logStatus = document.getElementById("logStatus");
        window.data_point = { speed_mph: 0 };
        window.speedCheckInterval = null;
        window.loggingActive = false;
    });

    afterEach(() => {
        clearInterval(window.speedCheckInterval);
        window.speedCheckInterval = null;
    });

    it("enables auto-logging when toggle is checked and speed exceeds threshold", () => {
        autoLogToggle.checked = true;
        window.data_point.speed_mph = 25;
        toggleAutoLogging();
        expect(logStatus.style.background).toBe("orange");
        expect(window.speedCheckInterval).not.toBeNull();
    });

    it("disables auto-logging when toggle is unchecked", () => {
        autoLogToggle.checked = false;
        window.speedCheckInterval = setInterval(() => {}, 1000);
        toggleAutoLogging();
        expect(logStatus.style.background).toBe("red");
        expect(window.speedCheckInterval).toBeNull();
    });

    it("does not start a new interval if one already exists", () => {
        autoLogToggle.checked = true;
        window.speedCheckInterval = setInterval(() => {}, 1000);
        const existingInterval = window.speedCheckInterval;
        toggleAutoLogging();
        expect(window.speedCheckInterval).toBe(existingInterval);
    });

    it("does not stop logging if auto-logging is disabled while logging is active", () => {
        autoLogToggle.checked = false;
        window.loggingActive = true;
        window.data_point.speed_mph = 0;
        toggleAutoLogging();
        expect(window.loggingActive).toBe(true);
    });

    it("does nothing if speed is below the threshold", () => {
        autoLogToggle.checked = true;
        window.data_point.speed_mph = 5;
        toggleAutoLogging();
        expect(loggingActive).toBe(false);
    });
});