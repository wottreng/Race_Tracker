// Unit tests for race tracker js
const { segmentsIntersect } = require('../../static/js/race_tracker.js');


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