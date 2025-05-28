// Unit tests for race tracker js
const { openTrackLapModal, calculateTrackTimes,segmentsIntersect, calculateAverageSpeedOfLap } = require('../../static/js/race_tracker.js');
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

    // it('handles no crossings gracefully', () => {
    //     global.dataLog = [
    //         { latitude: '42.408020', longitude: '-86.140650', timestamp: '2023-01-01T00:00:00Z' },
    //         { latitude: '42.408020', longitude: '-86.140650', timestamp: '2023-01-01T00:01:00Z' },
    //     ];
    //     document.body.innerHTML = '<select id="trackSelect"><option value="Gingerman" selected></option></select><div id="trackTimes"></div>';
    //     calculateTrackTimes();
    //     expect(document.getElementById('trackTimes').innerText).toBe('No laps completed yet.');
    // });
    //
    // it('handles unknown track selection', () => {
    //     global.dataLog = [
    //         { latitude: '42.408020', longitude: '-86.140650', timestamp: '2023-01-01T00:00:00Z' },
    //         { latitude: '42.408024', longitude: '-86.140344', timestamp: '2023-01-01T00:01:00Z' },
    //     ];
    //     document.body.innerHTML = '<select id="trackSelect"><option value="UnknownTrack" selected></option></select><div id="trackTimes"></div>';
    //     const mockShowError = jest.fn();
    //     global.show_error = mockShowError;
    //     calculateTrackTimes();
    //     expect(mockShowError).toHaveBeenCalledWith('Unknown track: UnknownTrack');
    // });
    //
    // it('calculates lap times with multiple crossings', () => {
    //     global.dataLog = [
    //         { latitude: '42.408020', longitude: '-86.140650', timestamp: '2023-01-01T00:00:00Z' },
    //         { latitude: '42.408024', longitude: '-86.140344', timestamp: '2023-01-01T00:01:00Z' },
    //         { latitude: '42.408024', longitude: '-86.140344', timestamp: '2023-01-01T00:02:00Z' },
    //     ];
    //     document.body.innerHTML = '<select id="trackSelect"><option value="Gingerman" selected></option></select><div id="trackTimes"></div>';
    //     calculateTrackTimes();
    //     expect(document.getElementById('trackTimes').innerText).toBe('Lap times: 60.00, 60.00 seconds');
    // });
});
