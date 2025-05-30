const RACE_TRACK_finish_line_points = {
    Gingerman: {
        left: {latitude: 42.408023, longitude: -86.140656},
        right: {latitude: 42.408025, longitude: -86.140342}
    },
    dev: {left: {latitude: 42.363145, longitude: -83.409558}, right: {latitude: 42.363070, longitude: -83.409418}},
}

function openTrackLapModal() {
    // add track options to trackSelect select element
    const trackSelect = document.getElementById('trackSelect');
    const tracks = Object.keys(RACE_TRACK_finish_line_points);
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
    const lap_time_output = document.getElementById('trackTimes');
    if (lapTimes.length === 0) {
        lap_time_output.innerText = 'No laps completed yet.';
    } else {
        lap_time_output.innerText = `Lap times: ${lapTimes.map(t => t.toFixed(2)).join(', ')} seconds`;
    }
    calculateAverageSpeedOfLap(crossingTimestamps);
}

function calculateAverageSpeedOfLap(crossingTimestamps) {
    const average_speed_output = document.getElementById('averageSpeed');
    if (!Array.isArray(crossingTimestamps) || crossingTimestamps.length < 2) {
        average_speed_output.innerText = 'No Average speed data available.';
        return;
    }
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

    average_speed_output.innerText = average_speed_lap.length > 0
        ? `Average speed per lap: ${average_speed_lap.map(s => s.toFixed(2)).join(', ')} mi/h`
        : 'No Average speed data available.';
}

class KalmanFilter {
    constructor(options = {}) {
        // Initial state estimate (speed in mph)
        this.x = options.initialValue || 0;

        // Initial estimate uncertainty
        this.P = options.initialCovariance || 1;

        // Process noise (how much we expect speed to naturally change between updates)
        // Higher values = more responsive to changes but more noise
        this.Q = options.processNoise || 0.01;

        // Measurement noise (how noisy we expect GPS readings to be)
        // Higher values = smoother output but more lag
        this.R = options.measurementNoise || 0.5;

        // Control input (acceleration estimate) - can be adjusted with accelerometer data
        this.u = 0;

        // State transition model (how we expect speed to change naturally)
        this.F = 1;

        // Control input model
        this.B = options.controlGain || 0.1;

        // Last update timestamp
        this.lastTimestamp = null;
    }

    // Update the filter with a new measurement
    update(measurement, timestamp = Date.now(), acceleration = 0) {
        // Handle time delta for process updates
        if (this.lastTimestamp) {
            const dt = (timestamp - this.lastTimestamp) / 1000; // seconds

            // Apply control input (acceleration) if available
            this.u = acceleration * this.B * dt;
        }
        this.lastTimestamp = timestamp;

        // Prediction step
        const x_pred = this.F * this.x + this.u;
        const P_pred = this.F * this.P * this.F + this.Q;

        // Update step (Kalman gain)
        const K = P_pred / (P_pred + this.R);

        // Update state and covariance
        this.x = x_pred + K * (measurement - x_pred);
        this.P = (1 - K) * P_pred;

        return this.x;
    }

    // Get current state estimate without updating
    getCurrentEstimate() {
        return this.x;
    }

    // Reset the filter
    reset(value = 0) {
        this.x = value;
        this.P = 1;
        this.lastTimestamp = null;
    }
}

window.speedKalmanFilter = new KalmanFilter({
    initialValue: 0,
    processNoise: 0.2,     // Tune this: higher = more responsive but noisier
    measurementNoise: 0.5,  // Tune this: higher = smoother but more lag
    controlGain: 0.1 // Tune this: how much acceleration affects speed, higher = more responsive
});

let dataLogChartInstance = null;

function updateGraph() {
    const type = document.getElementById('graphSelect').value;
    const ctx = document.getElementById('graphCanvas').getContext('2d');

    if (dataLogChartInstance) {
        dataLogChartInstance.destroy();
    }

    let labels = [];
    let data = [];
    let label = '';

    if (!Array.isArray(dataLog) || dataLog.length === 0) {
        data = [];
        labels = [];
        label = 'No Data';
    } else {
        labels = dataLog.map(entry => entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '');

        if (type === 'speed') {
            data = dataLog.map(entry => parseFloat(entry.speed_mph) || 0);
            label = 'Speed (mph)';
        } else if (type === 'gForce') {
            data = dataLog.map(entry => parseFloat(entry.gForce) || 0);
            label = 'G-Force (g)';
        }
    }

    dataLogChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                title: { display: false },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x',
                        threshold: 10,
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                        },
                        pinch: {
                            enabled: true,
                        },
                        mode: 'x',
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: { display: true, text: 'Time' },
                    ticks: {
                        maxTicksLimit: 10,
                        autoSkip: true
                    }
                },
                y: {
                    display: true,
                    title: { display: true, text: label }
                }
            }
        }
    });
}

function resetZoom(){
    if (dataLogChartInstance) {
        dataLogChartInstance.resetZoom();
    }
}


if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        KalmanFilter,
        openTrackLapModal,
        segmentsIntersect,
        calculateTrackTimes,
        RACE_TRACK_finish_line_points,
        calculateAverageSpeedOfLap,
    };
}

