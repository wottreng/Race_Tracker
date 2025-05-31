let { calculateGForce, updateMaxG, toggleAutoLogging, updatePosition, resetMaxG } = require('../../static/js/index');
const { haversineDistance } = require('../../static/js/map_utils');
const fs = require('fs');
const path = require('path');

beforeAll(() => {
    // This runs once before all tests in the file
    window.bootstrap = {
        Toast: jest.fn().mockImplementation(() => ({
            show: jest.fn()
        }))
    };
    // Load HTML once for all tests
    document.body.innerHTML = fs.readFileSync(path.resolve(__dirname, '../../race_tracker.html'), 'utf8');

    // Set up any other global mocks or configuration needed for all tests
    window.showToast = jest.fn();
    window.emphasizeTextUI = jest.fn();
    window.deEmphasizeTextUI = jest.fn();
});

// You can also add an afterAll if needed
afterAll(() => {
    // Clean up any global resources
    document.body.innerHTML = '';
    jest.clearAllMocks();
});

describe("toggleAutoLogging", () => {
    let autoLogToggle, logStatus, speedCheckInterval;

    beforeEach(() => {
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
        expect(window.loggingActive).toBe(false);
    });
});

describe("updatePosition", () => {
    let position;

    beforeEach(() => {
        position = {
            coords: {
                latitude: 40.7128,
                longitude: -74.0060,
                accuracy: 5,
                altitude: 10
            },
            timestamp: Date.now()
        };
        window.speedKalmanFilter = {
            update: jest.fn().mockReturnValue(30.1236546545)
        };
        window.haversineDistance = haversineDistance;
        currentGForce = { x: 0, y: 0, z: 0 };
        window.map_struct = {
            MARKER : {
                setPosition: jest.fn(),
                setMap: jest.fn(),
                setLatLng: jest.fn()
            }
        }

    });

    afterEach(() => {
        window.speedKalmanFilter.update.mockClear();
    });

    it("updates position and calculates speed correctly", () => {
        updatePosition(position);
        expect(document.getElementById("Latitude").innerText).toBe("40.7128");
        expect(document.getElementById("Longitude").innerText).toBe("-74.006");
        expect(document.getElementById("Accuracy").innerText).toBe("16.4");
        expect(document.getElementById("Altitude").innerText).toBe("32.8");
        expect(document.getElementById("speed").innerText).toBe("30.1");
        expect(document.getElementById("max_speed").innerHTML).toBe("30.1");
    });

    it("handles missing altitude gracefully", () => {
        position.coords.altitude = null;
        updatePosition(position);
        expect(document.getElementById("Altitude").innerText).toBe("0.0");
    });

    it("handles invalid position data without throwing errors", () => {
        position.coords.latitude = null;
        position.coords.longitude = null;
        updatePosition(position);
        expect(document.getElementById("Latitude").innerText).toBe("");
        expect(document.getElementById("Longitude").innerText).toBe("");
    });

    it("calculates speed using haversine distance when last position exists", () => {
        lastPosition = {
            coords: { latitude: 40.7127, longitude: -74.0059 },
            timestamp: position.timestamp - 1000
        };
        updatePosition(position);
        expect(window.speedKalmanFilter.update).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 0);
    });

    it("does not calculate speed when time delta is zero", () => {
        lastPosition = {
            coords: { latitude: 40.7127, longitude: -74.0059 },
            timestamp: position.timestamp
        };
        updatePosition(position);
        expect(window.speedKalmanFilter.update).toHaveBeenCalledWith(0, expect.any(Number), 0);
    });
});

describe("resetMaxG", () => {
    let maxGDisplay;

    beforeEach(() => {
        maxGDisplay = document.getElementById('maxG');
    });

    it("resets max G-force to 0.0", () => {
        resetMaxG();
        expect(maxGDisplay.innerText).toBe("0.0");
    });
});

describe("updateMaxG", () => {
    let maxGDisplay;

    beforeEach(() => {
        maxGDisplay = document.getElementById('maxG');
        window.metrics = {
            maxG: 0.0
        }
    });

    it("updates max G-force when new value is greater", () => {
        updateMaxG(1.23);
        expect(maxGDisplay.innerText).toBe("1.23");
    });
});

describe("calculateGForce", () => {
    let gX, gY, gZ, gTotal;

    beforeEach(() => {
        gX = document.getElementById("gX");
        gY = document.getElementById("gY");
        gZ = document.getElementById("gZ");
        gTotal = document.getElementById("gTotal");
        window.currentGForce = {
            x: 0.2,
            y: 0,
            z: 0
        }

    });

    it("calculates total G-force correctly for zero acceleration values", () => {
        let acceleration = {
            x: 0.0,
            y: 0.0,
            z: 0.0
        }
        const result = calculateGForce(acceleration,0, 0, 0);
        expect(gX.innerText).toBe("X: 0.00 G");
        expect(gY.innerText).toBe("Y: 0.00 G");
        expect(gZ.innerText).toBe("Z: 0.00 G");
        expect(gTotal.innerText).toBe("0.00");
        expect(result).toBe(0);
        expect(window.currentGForce.x).toBeCloseTo(0.00, 2);
        expect(window.currentGForce.y).toBeCloseTo(0.00, 2);
        expect(window.currentGForce.z).toBeCloseTo(0.00, 2);
    });

    it("calculates total G-force correctly for zero non-acceleration values", () => {
        let acceleration = {
            x: 1.0,
            y: 1.0,
            z: 1.0
        }
        const result = calculateGForce(acceleration,4, 2, 3);
        expect(gX.innerText).toBe("X: 3.96 G");
        expect(gY.innerText).toBe("Y: 1.98 G");
        expect(gZ.innerText).toBe("Z: 2.97 G");
        expect(gTotal.innerText).toBe("5.33");
        expect(result).toBeCloseTo(5.33, 2)
        expect(window.currentGForce.x).toBeCloseTo(3.96, 2);
        expect(window.currentGForce.y).toBeCloseTo(1.98, 2);
        expect(window.currentGForce.z).toBeCloseTo(2.97, 2);
    });

});
