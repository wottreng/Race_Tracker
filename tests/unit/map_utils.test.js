const {haversineDistance, processDataLogSegments} = require('../../static/js/map_utils');

describe('haversineDistance', () => {

    it('returns 0 when both coordinates are the same', () => {
        const distance = haversineDistance(36.12, -86.67, 36.12, -86.67);
        expect(distance).toBe(0);
    });

    it('handles small distances accurately', () => {
        const distance = haversineDistance(36.12, -86.67, 36.13, -86.68);
        expect(distance).toBeCloseTo(1430.97, 0); // Small distance in meters
    });
});

describe('processDataLogSegments', () => {
    it('correctly segments points and finds max G and speed', () => {
        const dataLog = [
            {latitude: 1, longitude: 1, speed_mph: 5, gForce: 0.5},
            {latitude: 2, longitude: 2, speed_mph: 15, gForce: 1.2},
            {latitude: 3, longitude: 3, speed_mph: 55, gForce: 0.9},
            {latitude: 4, longitude: 4, speed_mph: 105, gForce: 1.5}
        ];
        const result = processDataLogSegments(dataLog);

        expect(result.segments.speed_0_10.points).toContainEqual([1, 1]);
        expect(result.segments.speed_10_20.points).toContainEqual([2, 2]);
        expect(result.segments.speed_50_60.points).toContainEqual([3, 3]);
        expect(result.segments.veryFast.points).toContainEqual([4, 4]);
        expect(result.maxGValue).toBe(1.5);
        expect(result.maxGPoint).toEqual([4, 4]);
        expect(result.maxSpeedValue).toBe(105);
        expect(result.maxSpeedPoint).toEqual([4, 4]);
    });

    it('skips points with invalid coordinates', () => {
        const dataLog = [
            {latitude: null, longitude: 1, speed_mph: 5, gForce: 0.5},
            {latitude: 2, longitude: undefined, speed_mph: 15, gForce: 1.2},
            {latitude: 3, longitude: 3, speed_mph: 25, gForce: 0.9}
        ];
        const result = processDataLogSegments(dataLog);

        expect(result.segments.speed_20_30.points).toContainEqual([3, 3]);
        expect(result.segments.speed_0_10.points).toHaveLength(0);
        expect(result.segments.speed_10_20.points).toHaveLength(0);
    });

    it('returns default values when dataLog is empty', () => {
        const result = processDataLogSegments([]);
        expect(result.maxGPoint).toBeNull();
        expect(result.maxSpeedPoint).toBeNull();
        expect(result.maxGValue).toBe(0);
        expect(result.maxSpeedValue).toBe(0);
        Object.values(result.segments).forEach(segment => {
            expect(segment.points).toHaveLength(0);
        });
    });
});