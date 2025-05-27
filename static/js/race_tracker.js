const RACE_TRACK_finish_line_points = {
    Gingerman: {
        left: {latitude: 42.408023, longitude: -86.140656},
        right: {latitude: 42.408025, longitude: -86.140342}
    },
    dev: {left: {latitude: 42.363145, longitude: -83.409558}, right: {latitude: 42.363070, longitude: -83.409418}},
}
let crossingTimestamps = [];

function openTrackLapModal() {
    // add track options to trackSelect select element
    const trackSelect = document.getElementById('trackSelect');
    const tracks = [];
    for (const track in RACE_TRACK_finish_line_points) {
        tracks.push(track);
    }
    trackSelect.innerHTML = ''; // Clear existing options
    tracks.forEach(track => {
        const option = document.createElement('option');
        option.value = track;
        option.textContent = track;
        trackSelect.appendChild(option);
    });

    const trackLapModal = new bootstrap.Modal(document.getElementById('trackLapModal'));
    trackLapModal.show();
}

// Helper: Check if two line segments (A-B and C-D) intersect
function segmentsIntersect(A, B, C, D) {
    function ccw(P, Q, R) {
        return (R.latitude - P.latitude) * (Q.longitude - P.longitude) > (Q.latitude - P.latitude) * (R.longitude - P.longitude);
    }

    return (ccw(A, C, D) !== ccw(B, C, D)) && (ccw(A, B, C) !== ccw(A, B, D));
}

// Main function: Calculate time differences between finish line crossings
function calculateTrackTimes() {
    const track = document.getElementById('trackSelect').value;
    const finish = RACE_TRACK_finish_line_points[track];
    if (!finish) {
        console.error('Unknown track:', track);
        show_error(`Unknown track: ${track}`);
        return;
    }
    const finishLeft = finish.left;
    const finishRight = finish.right;

    crossingTimestamps = [];
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
    const lap_time_output = document.getElementById('trackTimes');
    if (lapTimes.length === 0) {
        lap_time_output.innerText = 'No laps completed yet.';
    } else {
        lap_time_output.innerText = `Lap times: ${lapTimes.map(t => t.toFixed(2)).join(', ')} seconds`;
    }
    calculateAverageSpeedOfLap();
}

function calculateAverageSpeedOfLap() {
    const average_speed_lap = crossingTimestamps.slice(1).map((end, i) => {
        const start = crossingTimestamps[i];
        const speed_list = dataLog
            .filter(entry => {
                const timestamp = new Date(entry.timestamp);
                return timestamp >= start && timestamp <= end;
            })
            .map(entry => parseFloat(entry.speed_mph))
            .filter(speed => !isNaN(speed));

        return speed_list.length > 0
            ? speed_list.reduce((a, b) => a + b, 0) / speed_list.length
            : 0;
    });

    const average_speed_output = document.getElementById('averageSpeed');
    average_speed_output.innerText = average_speed_lap.length > 0
        ? `Average speed per lap: ${average_speed_lap.map(s => s.toFixed(2)).join(', ')} mi/h`
        : 'No Average speed data available.';
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        segmentsIntersect,
        calculateTrackTimes,
        RACE_TRACK_finish_line_points
    };
}
