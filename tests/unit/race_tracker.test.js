// Unit tests for race tracker js
const { KalmanFilter, openTrackLapModal, calculateTrackTimes,segmentsIntersect, calculateAverageSpeedOfLap } = require('../../static/js/race_tracker.js');
const fs = require('fs');
const path = require('path');

describe('segmentsIntersect', () => {

    it('returns true when segments intersect', () => {
        const A = { latitude: 0, longitude: 0 };
        const B = { latitude: 1, longitude: 1 };
        const C = { latitude: 0, longitude: 1 };
        const D = { latitude: 1, longitude: 0 };
        expect(segmentsIntersect(A, B, C, D)).toBe(true);
    });

    it('returns false when segments do not intersect', () => {
        const A = { latitude: 0, longitude: 0 };
        const B = { latitude: 1, longitude: 1 };
        const C = { latitude: 2, longitude: 2 };
        const D = { latitude: 3, longitude: 3 };
        expect(segmentsIntersect(A, B, C, D)).toBe(false);
    });

    it('returns false when segments are collinear but do not overlap', () => {
        const A = { latitude: 0, longitude: 0 };
        const B = { latitude: 1, longitude: 1 };
        const C = { latitude: 2, longitude: 2 };
        const D = { latitude: 3, longitude: 3 };
        expect(segmentsIntersect(A, B, C, D)).toBe(false);
    });

    it('returns true when segments are collinear and overlap', () => {
        const A = { latitude: 0, longitude: 0 };
        const B = { latitude: 2, longitude: 2 };
        const C = { latitude: 1, longitude: 1 };
        const D = { latitude: 3, longitude: 3 };
        expect(segmentsIntersect(A, B, C, D)).toBe(false);
    });

    it('returns false when one segment is a point', () => {
        const A = { latitude: 0, longitude: 0 };
        const B = { latitude: 0, longitude: 0 };
        const C = { latitude: 1, longitude: 1 };
        const D = { latitude: 2, longitude: 2 };
        expect(segmentsIntersect(A, B, C, D)).toBe(false);
    });

    it('returns false when both segments are points', () => {
        const A = { latitude: 0, longitude: 0 };
        const B = { latitude: 0, longitude: 0 };
        const C = { latitude: 1, longitude: 1 };
        const D = { latitude: 1, longitude: 1 };
        expect(segmentsIntersect(A, B, C, D)).toBe(false);
    });
});

describe('calculateAverageSpeedOfLap', () => {
    it('calculates average speed for valid crossing timestamps', () => {
        crossingTimestamps = [new Date('2023-01-01T00:00:00Z'), new Date('2023-01-01T00:01:00Z')];
        global.dataLog = [
            { timestamp: '2023-01-01T00:00:30Z', speed_mph: '60' },
            { timestamp: '2023-01-01T00:00:45Z', speed_mph: '70' },
        ];
        document.body.innerHTML = '<div id="averageSpeed"></div>';
        calculateAverageSpeedOfLap(crossingTimestamps);
        expect(document.getElementById('averageSpeed').innerText).toBe('Average speed per lap: 65.00 mi/h');
    });

    it('handles no crossing timestamps gracefully', () => {
        crossingTimestamps = [];
        global.dataLog = [];
        document.body.innerHTML = '<div id="averageSpeed"></div>';
        calculateAverageSpeedOfLap();
        expect(document.getElementById('averageSpeed').innerText).toBe('No Average speed data available.');
    });

    it('handles crossing timestamps with no valid speed data', () => {
        crossingTimestamps = [new Date('2023-01-01T00:00:00Z'), new Date('2023-01-01T00:01:00Z')];
        global.dataLog = [
            { timestamp: '2023-01-01T00:00:30Z', speed_mph: 'NaN' },
            { timestamp: '2023-01-01T00:00:45Z', speed_mph: 'NaN' },
        ];
        document.body.innerHTML = '<div id="averageSpeed"></div>';
        calculateAverageSpeedOfLap();
        expect(document.getElementById('averageSpeed').innerText).toBe('No Average speed data available.');
    });
});

describe('calculateTrackTimes', () => {

    beforeEach(() => {
        global.bootstrap = {
            Toast: jest.fn().mockImplementation(() => ({
                show: jest.fn()
            })),
            Modal: jest.fn().mockImplementation(() => ({
                show: jest.fn(),
                hide: jest.fn(),
            }))
        };
        document.body.innerHTML =  fs.readFileSync(path.resolve(__dirname, '../../race_tracker.html'), 'utf8');
        openTrackLapModal();
    });

    afterEach(() => {
    });

    it('calculates lap times for valid crossing timestamps', () => {
        global.dataLog = [
            { latitude: '42.407832', longitude: '-86.140499', timestamp: '2023-01-01T00:00:00Z' },
            { latitude: '42.408362', longitude: '-86.140500', timestamp: '2023-01-01T00:01:00Z' },
            { latitude: '42.407832', longitude: '-86.140499', timestamp: '2023-01-01T00:02:00Z' },
        ];
        calculateTrackTimes();
        expect(document.getElementById('trackTimes').innerText).toBe('Lap times: 60.00 seconds');
    });

    it('handles no crossings gracefully', () => {
        global.dataLog = [
            { latitude: '42.408020', longitude: '-86.140650', timestamp: '2023-01-01T00:00:00Z' },
            { latitude: '42.408020', longitude: '-86.140650', timestamp: '2023-01-01T00:01:00Z' },
        ];
        calculateTrackTimes();
        expect(document.getElementById('trackTimes').innerText).toBe('No laps completed yet.');
    });

    it('calculates lap times with multiple crossings', () => {
        global.dataLog = [
            { latitude: '42.407832', longitude: '-86.140499', timestamp: '2023-01-01T00:00:00Z' },
            { latitude: '42.408362', longitude: '-86.140500', timestamp: '2023-01-01T00:01:00Z' },
            { latitude: '42.407832', longitude: '-86.140499', timestamp: '2023-01-01T00:02:00Z' },
            { latitude: '42.408362', longitude: '-86.140500', timestamp: '2023-01-01T00:03:00Z' },
        ];
        calculateTrackTimes();
        expect(document.getElementById('trackTimes').innerText).toBe('Lap times: 60.00, 60.00 seconds');
    });
});

describe('KalmanFilter', () => {
    it('returns initial value when no updates are made', () => {
        const filter = new KalmanFilter({ initialValue: 10 });
        expect(filter.getCurrentEstimate()).toBe(10);
    });

    it('updates state estimate with a single measurement', () => {
        const filter = new KalmanFilter({ initialValue: 0, measurementNoise: 0.5 });
        const updatedValue = filter.update(20);
        expect(updatedValue).toBeGreaterThan(0);
        expect(updatedValue).toBeLessThan(20);
    });

    it('smooths noisy measurements over multiple updates', () => {
        const filter = new KalmanFilter({ initialValue: 0, measurementNoise: 0.5 });
        filter.update(20);
        const updatedValue = filter.update(25);
        expect(updatedValue).toBeGreaterThan(18);
        expect(updatedValue).toBeLessThan(25);
    });

    it('handles acceleration input correctly', () => {
        const filter = new KalmanFilter({ initialValue: 0, controlGain: 0.1 });
        const updatedValue = filter.update(10, Date.now(), 5);
        expect(updatedValue).toBeGreaterThan(0);
    });

    it('resets state estimate and covariance', () => {
        const filter = new KalmanFilter({ initialValue: 10 });
        filter.update(20);
        filter.reset(5);
        expect(filter.getCurrentEstimate()).toBe(5);
    });

    it('handles edge case of zero measurement noise', () => {
        const filter = new KalmanFilter({ initialValue: 0, measurementNoise: 0 });
        const updatedValue = filter.update(20);
        expect(updatedValue).toBeCloseTo(13.37, 1)
    });

    it('handles edge case of zero process noise', () => {
        const filter = new KalmanFilter({ initialValue: 0, processNoise: 0 });
        const updatedValue = filter.update(20);
        expect(updatedValue).toBeGreaterThan(0);
        expect(updatedValue).toBeLessThan(20);
    });

    it('handles edge case of no measurements', () => {
        const filter = new KalmanFilter({ initialValue: 0 });
        expect(filter.getCurrentEstimate()).toBe(0);
    });
});
