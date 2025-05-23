const RACE_TRACK_finish_line_points = {
    dev: {left:{latitude: 42.363145, longitude: -83.409558}, right:{latitude: 42.363070, longitude: -83.409418}},
    gingerman: {left:{latitude: 42.408023, longitude: -86.140656}, right:{latitude: 42.408025, longitude: -86.140342}},
}

// Helper: Check if two line segments (A-B and C-D) intersect
function segmentsIntersect(A, B, C, D) {
    function ccw(P, Q, R) {
        return (R.latitude - P.latitude) * (Q.longitude - P.longitude) > (Q.latitude - P.latitude) * (R.longitude - P.longitude);
    }
    return (ccw(A, C, D) !== ccw(B, C, D)) && (ccw(A, B, C) !== ccw(A, B, D));
}

// Main function: Calculate time differences between finish line crossings
function calculateTrackTimes(dataLog, track) {
    const finish = RACE_TRACK_finish_line_points[track];
    if (!finish) {
        console.error('Unknown track:', track);
        show_error(`Unknown track: ${track}`);
        return;
    }
    const finishLeft = finish.left;
    const finishRight = finish.right;

    const crossingTimestamps = [];
    for (let i = 1; i < dataLog.length; i++) {
        const prev = {
            latitude: parseFloat(dataLog[i - 1].latitude),
            longitude: parseFloat(dataLog[i - 1].longitude)
        };
        const curr = {
            latitude: parseFloat(dataLog[i].latitude),
            longitude: parseFloat(dataLog[i].longitude)
        };
        if (segmentsIntersect(prev, curr, finishLeft, finishRight)) {
            // Use the later timestamp for the crossing
            crossingTimestamps.push(new Date(dataLog[i].timestamp));
        }
    }

    // Calculate time differences in seconds
    const lapTimes = [];
    for (let i = 1; i < crossingTimestamps.length; i++) {
        const diff = (crossingTimestamps[i] - crossingTimestamps[i - 1]) / 1000;
        lapTimes.push(diff);
    }
    showToast(`Lap times: ${lapTimes.map(t => t.toFixed(2)).join(', ')} seconds`);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        segmentsIntersect,
        calculateTrackTimes,
        RACE_TRACK_finish_line_points
    };
}
