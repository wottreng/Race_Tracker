let map_struct = {
    MAP: null,
    MARKER: null,
    path: null,
}
let loggingActive = false;
let autoLoggingEnabled = false;
let locationWatchId = null;
let dataLog = [];
let loggingIntervalId = null;
let lastGpsUpdate = null;
let lastPosition = null;
let totalPointsRecorded = 0;
let data_point = {};
window.currentGForce = {x: 0, y: 0, z: 0};
const auto_logging_speed = 20; // mph
let update_map_view = true;
let wakeLock = null;
let tractionCtx;
let tractionCenterX;
let tractionCenterY;
const m_per_sec_to_mph = 2.23694;

let metrics = {
    max_speed: 0,
    maxG: 0,
}

function init() {
    document.getElementById('autoLogToggle').checked = autoLoggingEnabled;
    updateLogStatus();
    startLocationTracking();
    initMap();
    initSensors();
}

function initMap() {
    // Start with a neutral initial view that shows most of the world
    map_struct.MAP = L.map('map', {
        worldCopyJump: true,
        minZoom: 2
    }).setView([30, 0], 2); // More centered world view

    // Add tile layer (map style)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map_struct.MAP);

    // Add loading indicator
    const loadingControl = L.control({position: 'bottomleft'});
    loadingControl.onAdd = function () {
        const div = L.DomUtil.create('div', 'map-loading-indicator');
        div.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><span class="ms-2">Waiting for GPS signal...</span>';
        return div;
    };
    loadingControl.addTo(map_struct.MAP);

    // Create marker for current position (will be positioned when GPS data arrives)
    map_struct.MARKER = L.marker([0, 0]);
    map_struct.MARKER.addTo(map_struct.MAP);

    // Create polyline for tracking path
    map_struct.path = L.polyline([], {color: 'blue', weight: 3}).addTo(map_struct.MAP);

    // Try browser's geolocation API as a fallback while waiting for GPS
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                // If we get position before GPS initializes
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Only update if we haven't received GPS data yet
                if (!lastGpsUpdate) {
                    map_struct.MAP.setView([lat, lng], 13);
                    map_struct.MARKER.setLatLng([lat, lng]);
                    document.querySelector('.map-loading-indicator').innerHTML =
                        '<span class="text-warning">Using approximate location. Waiting for GPS...</span>';
                }
            },
            function (error) {
                console.log("Fallback geolocation failed:", error.message);
            },
            {timeout: 5000, maximumAge: 60000}
        );
    }

    // Set a timeout to remove the loading indicator after 20 seconds
    setTimeout(function () {
        const loadingIndicator = document.querySelector('.map-loading-indicator');
        if (loadingIndicator && !lastGpsUpdate) {
            loadingIndicator.innerHTML = '<span class="text-danger">GPS signal not found. Check permissions.</span>';
        }
    }, 20000);
}

function startLocationTracking() {
    console.log("Starting location tracking...");
    if (navigator.geolocation) {
        hideGPSpermissionButton();

        try {
            // Add check before starting the GPS watcher
            console.log("Requesting GPS permission...");

            locationWatchId = navigator.geolocation.watchPosition(
                function (position) {
                    console.log("GPS position received:", position.coords);
                    lastGpsUpdate = new Date();
                    updatePosition(position);
                },
                function (error) {
                    console.error("GPS Error:", error.code, error.message);
                    handleLocationError(error);
                },
                {enableHighAccuracy: true, timeout: 5000, maximumAge: 1000}
            );

            console.log("Location watch started with ID:", locationWatchId);
        } catch (e) {
            console.error("Exception starting GPS:", e);
            show_error("Error starting GPS: " + e.message);
        }
    } else {
        console.error("Geolocation not supported by browser");
        showToast("Geolocation is not supported by this browser.", 'error');
        document.getElementById('permissionBtn').style.display = 'block';
    }

    // Add periodic GPS health check
    setInterval(checkGpsHealth, 5000);
}

function checkGpsHealth() {
    if (!lastGpsUpdate) {
        console.warn("GPS has never received a position update");
        show_error("Waiting for GPS signal...");
        return;
    }

    const timeSinceLastUpdate = new Date() - lastGpsUpdate;
    if (timeSinceLastUpdate > 10000) { // 10 seconds
        console.warn("GPS may be stale - last update was " + (timeSinceLastUpdate / 1000).toFixed(1) + "s ago");
        show_error("GPS signal weak or lost");
    }
}

function updatePosition(position) {
    try {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        let altitude = position.coords.altitude || 0;
        let calc_speed_meters_per_second = 0;
        const timestamp = position.timestamp;
        if (!altitude) {
            altitude = 0;
        }

        if (lastPosition) {
            // Manual speed calculation fallback
            const distance = haversineDistance(
                lastPosition.coords.latitude,
                lastPosition.coords.longitude,
                latitude,
                longitude
            );

            const timeDelta = (timestamp - lastPosition.timestamp) / 1000; // seconds
            if (timeDelta > 0) {
                calc_speed_meters_per_second = distance / timeDelta;
            }
        }
        lastPosition = position;
        let speed_mph = calc_speed_meters_per_second ? (calc_speed_meters_per_second * m_per_sec_to_mph) : 0;

        // Apply Kalman filter to speed
        let smoothed_speed = window.speedKalmanFilter.update(
            speed_mph,
            position.timestamp,
            window.currentGForce.y  // optional: use acceleration data if available
        );
        smoothed_speed = parseFloat(smoothed_speed.toFixed(1));

        data_point = {
            latitude: latitude,
            longitude: longitude,
            accuracy_ft: accuracy * 3.28084,
            altitude_ft: altitude * 3.28084,
            speed_mph: smoothed_speed,
            unfiltered_speed_mph: parseFloat(speed_mph.toFixed(1))
        }
        // Update max speed
        if (smoothed_speed > metrics.max_speed) {
            metrics.max_speed = smoothed_speed;
            document.getElementById("max_speed").textContent = metrics.max_speed.toString();
        }

        // Update text display
        if (latitude !== null && longitude !== null) {
            document.getElementById('Latitude').innerText = latitude.toString();
            document.getElementById('Longitude').innerText = longitude.toString();
        } else {
            document.getElementById('Latitude').innerText = "";
            document.getElementById('Longitude').innerText = "";
        }
        const accuracy_ui = document.getElementById('Accuracy')
        accuracy_ui.innerText = (data_point.accuracy_ft).toFixed(1);
        accuracy_ui.style.color = accuracy < 10 ? 'green' : (accuracy < 20 ? 'orange' : 'red');
        document.getElementById('Altitude').innerText = (data_point.altitude_ft).toFixed(1);
        document.getElementById('speed').innerText = smoothed_speed.toString();

        const newLatLng = [latitude, longitude];
        // Update marker position and center map
        map_struct.MARKER.setLatLng(newLatLng);
        if (update_map_view === true) {
            map_struct.MAP.setView(newLatLng);
            document.querySelector('.map-loading-indicator').innerHTML =
                '<span class="text-warning"></span>';
        }

    } catch (e) {
        console.error("Error updating position:", e);
        show_error("Error updating position: " + e.message);
    }
}

function handleLocationError(error) {
    let errorMsg = "";
    switch (error.code) {
        case error.PERMISSION_DENIED:
            errorMsg = "User denied geolocation permissions.";
            showGPSpermissionButton();
            showPermissionModal();
            break;
        case error.POSITION_UNAVAILABLE:
            errorMsg = "Location information is unavailable.";
            break;
        case error.TIMEOUT:
            errorMsg = "Request to get location timed out.";
            break;
        default:
            errorMsg = "An unknown error occurred: " + error.message;
            break;
    }
    show_error(errorMsg);
}

function requestGPSpermission() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                showToast("Permissions granted!");
                hideGPSpermissionButton();
                startLocationTracking();
            },
            function (error) {
                console.log(error);
                showToast("Could not get permissions");
            }
        );
    }
}

function showPermissionsBtnGroup(){
    const permissionsBtnGroup = document.getElementById('permissionsBtnGroup');
    if (permissionsBtnGroup) {
        permissionsBtnGroup.style.display = 'block';
    }
}

function hidePermissionsBtnGroup(){
    const permissionBtn = document.getElementById('permissionBtn');
    // if permission btn is visible, do not hide the group
    if (permissionBtn.style.display !== 'none') {
        return
    }
    // if motion sensor btn is visible, do not hide the group
    const motionBtn = document.getElementById('motionPermissionBtn');
    if (motionBtn.style.display !== 'none') {
        return;
    }
    const permissionsBtnGroup = document.getElementById('permissionsBtnGroup');
    if (permissionsBtnGroup) {
        permissionsBtnGroup.style.display = 'none';
    }
}

function showGPSpermissionButton() {
    const permissionBtn = document.getElementById('permissionBtn');
    if (permissionBtn.style.display === 'none' || permissionBtn.style.display === '') {
        permissionBtn.style.display = 'inline-block';
    }
    showPermissionsBtnGroup();
}

function hideGPSpermissionButton() {
    const permissionBtn = document.getElementById('permissionBtn');
    if (permissionBtn.style.display !== 'none') {
        permissionBtn.style.display = 'none';
    }
    hidePermissionsBtnGroup();
}

function showPermissionModal(){
    if (document.getElementById('PermissionsModal').classList.contains('show')) {
        return; // Modal is already open
    }
    const modal = new bootstrap.Modal(document.getElementById('PermissionsModal'));
    modal.show();
}

function hidePermissionModal(){
    const modal = bootstrap.Modal.getInstance(document.getElementById('PermissionsModal'));
    if (modal) {
        modal.hide();
    }
}

// request permission when btn is clicked
function requestMotionPermission(){
    if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    showToast("Motion permissions granted!");
                    initSensors();
                } else {
                    showToast("Motion permissions denied");
                }
            })
            .catch(error => showToast(`Error requesting motion permission: ${error}`));
    } else {
        showToast("DeviceMotionEvent not supported on this device");
    }
}

function showMotionPermissionButton() {
    const motionBtn = document.getElementById("motionPermissionBtn");
    if (motionBtn.style.display === 'none' || motionBtn.style.display === '') {
        motionBtn.style.display = 'inline-block';
    }
    showPermissionsBtnGroup();
}

function hideMotionPermissionButton(){
    const motionBtn = document.getElementById("motionPermissionBtn");
    if (motionBtn.style.display !== 'none') {
        motionBtn.style.display = 'none';
    }
    hidePermissionsBtnGroup();
}

function initSensors() {
    if (window.DeviceMotionEvent) {
        // iOS 13+ requires explicit permission
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            // iOS 13+ requires permission request
            showMotionPermissionButton();
        } else {
            // Android and older iOS versions
            hideMotionPermissionButton();
            window.removeEventListener('devicemotion', motionHandler);
            window.addEventListener('devicemotion', motionHandler);
        }
        initTractionCircle();
    } else {
        document.getElementById('gX').innerText = "Motion sensors not supported";
        showToast("Device motion not supported on this device");
    }
}

function motionHandler(event) {
    // Check if event has valid acceleration data
    if (!event.accelerationIncludingGravity) {
        console.warn("Motion event missing acceleration data");
        showToast("Motion event missing acceleration data", 'warning');
        return;
    }
    totalG = calculateGForce(event.acceleration, window.currentGForce.x, window.currentGForce.y, window.currentGForce.z);
    updateMaxG(totalG);
    updateTractionCircle();
}

function calculateGForce(acceleration, g_force_x, g_force_y, g_force_z) {
    // Convert acceleration to G-forces (9.8 m/s² = 1G)
    // Apply low-pass filter: newValue = alpha * currentValue + (1 - alpha) * oldValue
    let alpha = 0.01; // Lower alpha = more smoothing but more lag
    if (acceleration.x === 0 && acceleration.y === 0 && acceleration.z === 0) {
        alpha = 0.1; // Increase alpha for no movement
    }
    g_force_x = alpha * (acceleration.x / 9.8) + (1 - alpha) * (g_force_x || 0);
    g_force_y = alpha * (acceleration.y / 9.8) + (1 - alpha) * (g_force_y || 0);
    g_force_z = alpha * (acceleration.z / 9.8) + (1 - alpha) * (g_force_z || 0);
    window.currentGForce.x = g_force_x;
    window.currentGForce.y = g_force_y;
    window.currentGForce.z = g_force_z;

    // Update display
    const gX = document.getElementById('gX');
    const gY = document.getElementById('gY');
    const gZ = document.getElementById('gZ');
    const gTotal = document.getElementById('gTotal');
    // update UI values
    gX.innerText = `X: ${g_force_x.toFixed(2)} G`;
    gY.innerText = `Y: ${g_force_y.toFixed(2)} G`;
    gZ.innerText = `Z: ${g_force_z.toFixed(2)} G`;
    gTotal.innerText = Math.sqrt(Math.pow(g_force_x, 2) + Math.pow(g_force_y, 2) + Math.pow(g_force_z, 2)).toFixed(2).toString();
    if (g_force_x > 0.7) {
        emphasizeTextUI("gX");
    } else {
        deEmphasizeTextUI("gX");
    }
    if (g_force_y > 0.7) {
        emphasizeTextUI("gY");
    } else {
        deEmphasizeTextUI("gY");
    }
    if (g_force_z > 0.7) {
        emphasizeTextUI("gZ");
    } else {
        deEmphasizeTextUI("gZ");
    }

    // Calculate total G-force
    const totalG = Math.sqrt(
        Math.pow(g_force_x, 2) +
        Math.pow(g_force_y, 2) +
        Math.pow(g_force_z, 2)
    );
    return totalG;
}

function updateMaxG(new_g_force) {
    // Update max G-force if new value is greater
    if (new_g_force > metrics.maxG) {
        metrics.maxG = new_g_force;
        document.getElementById('maxG').innerText = metrics.maxG.toFixed(2);
    }
}

function resetMaxG() {
    maxG = 0;
    document.getElementById('maxG').innerText = "0.0";
    showToast("Max G-force reset");
}

function initTractionCircle() {
    const canvas = document.getElementById('tractionCanvas');
    tractionCtx = canvas.getContext('2d');
    tractionCenterX = canvas.width / 2;
    tractionCenterY = canvas.height / 2;
}

function updateTractionCircle() {
    const canvas = document.getElementById('tractionCanvas');
    tractionCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid circles for 0.5g, 1g, and 2g
    // 0.5g circle (radius 25)
    tractionCtx.beginPath();
    tractionCtx.arc(tractionCenterX, tractionCenterY, 25, 0, 2 * Math.PI);
    tractionCtx.setLineDash([2, 2]);  // Dotted line
    tractionCtx.strokeStyle = '#444';
    tractionCtx.stroke();

    // 1g circle (radius 50)
    tractionCtx.beginPath();
    tractionCtx.arc(tractionCenterX, tractionCenterY, 50, 0, 2 * Math.PI);
    tractionCtx.setLineDash([5, 3]);  // Dashed line
    tractionCtx.strokeStyle = '#666';
    tractionCtx.stroke();

    // Reset line dash for solid lines
    tractionCtx.setLineDash([]);

    // Main circle (2g)
    tractionCtx.beginPath();
    tractionCtx.arc(tractionCenterX, tractionCenterY, 100, 0, 2 * Math.PI);
    tractionCtx.strokeStyle = '#555';
    tractionCtx.stroke();

    // Draw crosshair
    tractionCtx.beginPath();
    tractionCtx.moveTo(tractionCenterX - 100, tractionCenterY);
    tractionCtx.lineTo(tractionCenterX + 100, tractionCenterY);
    tractionCtx.moveTo(tractionCenterX, tractionCenterY - 100);
    tractionCtx.lineTo(tractionCenterX, tractionCenterY + 100);
    tractionCtx.strokeStyle = '#333';
    tractionCtx.stroke();

    // Add labels for g-force circles
    tractionCtx.fillStyle = '#888';
    tractionCtx.font = '10px sans-serif';
    tractionCtx.fillText("0.5g", tractionCenterX + 25, tractionCenterY - 5);
    tractionCtx.fillText("1g", tractionCenterX + 50, tractionCenterY - 5);
    tractionCtx.fillText("2g", tractionCenterX + 100, tractionCenterY - 5);

    // Draw G-force dot
    const dotX = tractionCenterX + (window.currentGForce.x * 50);
    const dotY = tractionCenterY - (window.currentGForce.y * 50);
    tractionCtx.beginPath();
    tractionCtx.arc(dotX, dotY, 8, 0, 2 * Math.PI);
    tractionCtx.fillStyle = '#0af';
    tractionCtx.fill();
}

// Data logging
function logData(data) {
    // Add data to log array
    dataLog.push(data);

    // Update the display with the latest entries
    updateDataLogDisplay();

    // Optional: save to localStorage as you log
    // localStorage.setItem('raceTrackerLog', JSON.stringify(dataLog));
}

function clearLog() {
    dataLog = [];
    showToast('Log cleared!');
    localStorage.removeItem('raceTrackerLog');
    updateDataLogDisplay();
}

function exportLog() {
    if (dataLog.length === 0) {
        showToast('No log data to export!');
        return;
    }

    try {
        // Create CSV content
        const headers = Object.keys(dataLog[0]).join(',');
        const rows = dataLog.map(row => Object.values(row).join(',')).join('\n');
        const csvContent = `${headers}\n${rows}`;
        const filename = `race_log_${new Date().toISOString().replace(/:/g, '-')}.csv`;

        // Create blob and URL
        const blob = new Blob([csvContent], {type: 'text/csv'});
        const url = URL.createObjectURL(blob);

        // Try Web Share API first (mobile-friendly)
        if (navigator.share && navigator.canShare && navigator.canShare({files: [new File([blob], filename, {type: 'text/csv'})]})) {
            navigator.share({
                files: [new File([blob], filename, {type: 'text/csv'})],
                title: 'Race Log Data'
            }).then(() => {
                showToast('Log shared successfully!');
            }).catch(err => {
                // Fall back to download approach
                downloadFile(url, filename);
            });
        } else {
            // Use download approach for browsers without Share API
            downloadFile(url, filename);
        }
    } catch (err) {
        console.error('Export failed:', err);
        showToast('Export failed. Try again.');
    }

    function downloadFile(url, filename) {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast('Log exported! Check your downloads.');
        }, 100);
    }
}

// Toast notification
function showToast(message, type = 'info') {
    const toastEl = document.getElementById('toast');
    const toastBody = toastEl.querySelector('.toast-body');
    toastBody.innerText = message;

    // Set toast color based on type
    toastEl.classList.remove('bg-danger', 'bg-info', 'bg-success', 'bg-warning');
    if (type === 'error') {
        toastEl.classList.add('bg-danger', 'text-black');
    } else if (type === 'success') {
        toastEl.classList.add('bg-success', 'text-white');
    } else if (type === 'warning') {
        toastEl.classList.add('bg-warning', 'text-black');
    } else {
        toastEl.classList.add('bg-info', 'text-black');
    }

    // Remove any existing toast instance
    if (toastEl._toastInstance) {
        toastEl._toastInstance.dispose();
        toastEl._toastInstance = null;
    }

    const toast = new bootstrap.Toast(toastEl, {
        delay: 3000
    });
    toastEl._toastInstance = toast;
    toast.show();
}

function show_error(message) {
    const error_el = document.getElementById('geoError');
    error_el.innerText = message;
    // remove visually-hidden class
    error_el.classList.remove('visually-hidden');
    setTimeout(() => {
        error_el.classList.add('visually-hidden');
    }, 5000);
}

function toggleAutoLogging(silent = true) {
    autoLoggingEnabled = document.getElementById('autoLogToggle').checked;
    if (!silent) {
        showToast('Auto-logging ' + (autoLoggingEnabled ? 'enabled' : 'disabled'));
    }
    if (autoLoggingEnabled && !window.speedCheckInterval) {
        document.getElementById("logStatus").style.background = 'orange';
        window.speedCheckInterval = setInterval(() => {
            const speed = parseFloat(data_point.speed_mph || 0);

            if (speed > auto_logging_speed && !loggingActive) {
                startLogging(true);
                showToast('Auto-logging activated - Speed above 20mph');
            }
        }, 1000);
    } else if (!autoLoggingEnabled && window.speedCheckInterval) {
        document.getElementById("logStatus").style.background = 'red';
        clearInterval(window.speedCheckInterval);
        window.speedCheckInterval = null;

        if (loggingActive) {
            stopLogging();
        }
    }
}

function manualStartLogging() {
    startLogging();
    // autoLoggingEnabled = true;
}

function manualStopLogging() {
    document.getElementById('autoLogToggle').checked = false;
    toggleAutoLogging(true);
    stopLogging();
}

function startLogging(silent = false) {
    loggingActive = true;
    updateLogStatus();
    localStorage.setItem('loggingActive', JSON.stringify(loggingActive));
    document.getElementById('stopLogBtn').style.display = 'inline-block';
    document.getElementById('startLogBtn').style.display = 'none';

    // Start a 10Hz logging interval (every 100ms)
    loggingIntervalId = setInterval(recordDataPoint, 100);

    if (!silent) showToast('Logging started!');
}

function stopLogging() {
    loggingActive = false;
    updateLogStatus();
    localStorage.setItem('loggingActive', JSON.stringify(loggingActive));
    localStorage.setItem('raceTrackerLog', JSON.stringify(dataLog));
    document.getElementById('stopLogBtn').style.display = 'none';
    document.getElementById('startLogBtn').style.display = 'inline-block';

    // Stop the logging interval
    if (loggingIntervalId !== null) {
        clearInterval(loggingIntervalId);
        loggingIntervalId = null;
    }

    showToast('Logging stopped!');
}

function recordDataPoint() {
    try {
        // Test if marker exists and has position data
        if (!map_struct.MARKER) {
            console.error("No marker available for position data");
            showToast("No marker available for position data");
            return;
        }

        const position = map_struct.MARKER.getLatLng();
        if (!position || (position.lat === 0 && position.lng === 0)) {
            console.warn("Invalid position data:", position);
            showToast("Invalid position data");
            return;
        }

        const _data_point = {
            timestamp: new Date().toISOString(),
            latitude: data_point['latitude'],
            longitude: data_point['longitude'],
            accuracy_ft: data_point['accuracy_ft'].toFixed(1),
            speed_mph: data_point['speed_mph'],
            gForce: Math.sqrt(
                Math.pow(window.currentGForce.x, 2) +
                Math.pow(window.currentGForce.y, 2) +
                Math.pow(window.currentGForce.z, 2)
            ) || 0,
            gX: window.currentGForce.x || 0,
            gY: window.currentGForce.y || 0,
            gZ: window.currentGForce.z || 0
        };

        logData(_data_point);
        totalPointsRecorded++;
    } catch (e) {
        console.error("Error recording data point:", e);
        showToast("Error recording data point: " + e.message);
    }
}

function updateLogStatus() {
    document.getElementById('logStatus').style.background = loggingActive ? 'lime' : 'red';
}

// Updates the data log display with current log entries
function updateDataLogDisplay() {
    const display = document.getElementById('dataLogDisplay');
    if (!display) {
        console.error("dataLogDisplay element not found!");
        return;
    }

    if (dataLog.length === 0) {
        display.innerHTML = '<p style="color: #888; text-align: center;">No data recorded yet</p>';
        return;
    }

    // Create table to display data
    let html = '<table style="width: 100%; border-collapse: collapse;">';

    // Add headers
    html += '<tr style="border-bottom: 1px solid #555; position: sticky; top: 0; background: #222; z-index: 2;">';
    Object.keys(dataLog[0]).forEach(key => {
        html += `<th style="padding: 4px; text-align: left; color: #0af; background: #222; position: sticky; top: 0; z-index: 2;">${key}</th>`;
    });
    html += '</tr>';

    // Add rows (most recent first)
    dataLog.slice().reverse().forEach(entry => {
        html += '<tr style="border-bottom: 1px solid #444;">';
        Object.values(entry).forEach(value => {
            html += `<td style="padding: 4px;">${value}</td>`;
        });
        html += '</tr>';
    });

    html += '</table>';
    display.innerHTML = html;
}

function initializeDataLog() {
    try {
        const savedLog = localStorage.getItem('raceTrackerLog');
        if (savedLog) {
            dataLog = JSON.parse(savedLog);
            updateDataLogDisplay();
        }
    } catch (e) {
        console.error("Error loading saved log:", e);
    }
}

function resetMaxSpeed() {
    metrics.max_speed = 0;
    document.getElementById("max_speed").innerText = "0.0";
    showToast("Max speed reset");
}

function uploadCSVdata() {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';

    // Handle file selection
    fileInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) {
            showToast('No file selected');
            return;
        }

        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                // Parse CSV content
                const csvContent = event.target.result;
                const lines = csvContent.split('\n');

                if (lines.length < 2) {
                    showToast('Invalid CSV file - no data rows found');
                    return;
                }

                // Parse headers
                const headers = lines[0].split(',');

                // Parse data rows
                const importedData = [];
                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue; // Skip empty lines

                    const values = lines[i].split(',');
                    if (values.length !== headers.length) {
                        console.warn(`Skipping row ${i}: column count mismatch`);
                        continue;
                    }

                    const dataPoint = {};
                    headers.forEach((header, index) => {
                        dataPoint[header] = values[index];
                    });

                    importedData.push(dataPoint);
                }

                // Replace or append to existing data log
                if (importedData.length > 0) {

                    const importModal = new bootstrap.Modal(document.getElementById('importConfirmModal'));
                    document.getElementById("number_of_data_points").innerHTML = importedData.length.toString();
                    importModal.show();

                    const confirmBtn = document.getElementById('confirmImport');
                    const newBtn = confirmBtn.cloneNode(true);
                    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
                    newBtn.addEventListener('click', function () {
                        dataLog = importedData;
                        updateDataLogDisplay();
                        localStorage.setItem('raceTrackerLog', JSON.stringify(dataLog));
                        showToast(`Successfully imported ${importedData.length} data points`);
                        importModal.hide();
                    });
                } else {
                    showToast('No valid data found in CSV file');
                }
            } catch (err) {
                console.error('CSV import failed:', err);
                showToast('Failed to import CSV: ' + err.message);
            }
        };

        reader.onerror = function () {
            showToast('Error reading file');
        };

        reader.readAsText(file);
    });

    // Trigger file selection dialog
    fileInput.click();
}

function reset_GPS() {
    if (locationWatchId) {
        navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
        lastGpsUpdate = null;
        lastPosition = null;
        show_error("GPS reset. Restarting GPS...");

        // Add a small delay before restarting GPS
        setTimeout(() => {
            // Restart location tracking
            startLocationTracking();
            showToast("GPS tracking restarted");
        }, 500);
    } else {
        show_error("No active GPS session to reset.");
        // Try starting GPS if there's no active session
        startLocationTracking();
    }
}

async function keepScreenOn() {
    if (navigator.wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log("Screen wake lock acquired");
        wakeLock.addEventListener('release', () => {
            console.log("Screen wake lock released");
            wakeLock = null;
        });

        document.removeEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("visibilitychange", handleVisibilityChange);
    } else {
        console.warn("Wake Lock API not supported");
        showToast("Wake Lock API not supported on this device");
    }
}

async function handleVisibilityChange() {
    if (document.visibilityState === "visible") {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log("Screen wake lock re-acquired");
        } catch (err) {
            console.error("Failed to re-acquire screen wake lock:", err);
        }
    } else {
        if (wakeLock) {
            await wakeLock.release();
            console.log("Screen wake lock released on visibility change");
            wakeLock = null;
        }
    }
}

function add_event_listener_setup() {
    const logTab = document.getElementById('logTab');
    const logPanel = document.getElementById('logPanel');
    const closeBtn = document.getElementById('closeLogPanel');
    const backdrop = document.getElementById('panelBackdrop');

    // Open panel when tab is clicked
    logTab.addEventListener('click', function () {
        logPanel.classList.add('panel-active');
        backdrop.classList.add('backdrop-active');
        // Tab stays in place, no need to move it
    });

    // Close panel when close button is clicked
    closeBtn.addEventListener('click', function () {
        logPanel.classList.remove('panel-active');
        backdrop.classList.remove('backdrop-active');
    });

    const optionPanel = document.getElementById('optionPanel');
    // Close panel when backdrop is clicked
    backdrop.addEventListener('click', function () {
        logPanel.classList.remove('panel-active');
        optionPanel.classList.remove('option-tab-active');
        backdrop.classList.remove('backdrop-active');
    });

    // Update log status indicator
    window.updateLogStatus = function () {
        document.getElementById('logStatus').style.background = loggingActive ? 'lime' : 'red';
    };

    const optionTab = document.getElementById('optionTab');
    // open option panel when option tab is clicked
    optionTab.addEventListener('click', function () {
        optionPanel.classList.add('panel-active');
        backdrop.classList.add('backdrop-active');
        // Tab stays in place, no need to move it
    });

    const closeOptionBtn = document.getElementById('closeOptionPanel');
    // close option panel when close button is clicked
    closeOptionBtn.addEventListener('click', function () {
        optionPanel.classList.remove('panel-active');
        backdrop.classList.remove('backdrop-active');
    });

    const mapTab = document.getElementById('mapTab');
    const mapPanel = document.getElementById('mapPanel');
    const closeMapBtn = document.getElementById('closeMapPanel');

    // Open map panel when map tab is clicked
    mapTab.addEventListener('click', function () {
        mapPanel.classList.add('panel-active');
        backdrop.classList.add('backdrop-active');
    });

    // Close map panel when close button is clicked
    closeMapBtn.addEventListener('click', function () {
        mapPanel.classList.remove('panel-active');
        backdrop.classList.remove('backdrop-active');
    });

    // graph modal
    const graphTab = document.getElementById('GraphDataTab');
    const graphPanel = document.getElementById('graphPanel');
    const closeGraphBtn = document.getElementById('closeGraphPanel');

    // Open map panel when map tab is clicked
    graphTab.addEventListener('click', function () {
        graphPanel.classList.add('panel-active');
        backdrop.classList.add('backdrop-active');
    });

    // Close map panel when close button is clicked
    closeGraphBtn.addEventListener('click', function () {
        graphPanel.classList.remove('panel-active');
        backdrop.classList.remove('backdrop-active');
    });

}

document.addEventListener('DOMContentLoaded', function () {
    init();
    add_event_listener_setup();
    initializeDataLog();
    keepScreenOn();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        toggleAutoLogging,
        updatePosition,
        resetMaxG,
        updateMaxG,
        calculateGForce,
    };
}
