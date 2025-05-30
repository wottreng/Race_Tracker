function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6378137; // Earth radius in meters
    const toRad = (value) => (value * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // distance in meters
}

function processDataLogSegments(dataLog) {
    let maxGPoint = null;
    let maxSpeedPoint = null;
    let maxGValue = 0;
    let maxSpeedValue = 0;
    const segments = {
        speed_0_10: {points: [], color: 'rgb(1,90,174)'},
        speed_10_20: {points: [], color: 'rgb(43,111,182)'},
        speed_20_30: {points: [], color: 'rgb(95,142,225)'},
        speed_30_40: {points: [], color: 'rgb(145,175,225)'},
        speed_40_50: {points: [], color: 'rgb(253,180,180)'},
        speed_50_60: {points: [], color: 'rgb(255,130,130)'},
        speed_60_70: {points: [], color: 'rgb(255,100,100)'},
        speed_70_80: {points: [], color: 'rgb(255,70,70)'},
        speed_80_90: {points: [], color: 'rgb(200,47,47)'},
        speed_90_100: {points: [], color: 'rgb(168,21,21)'},
        veryFast: {points: [], color: 'rgb(115,2,2)'},
    }

    dataLog.forEach(point => {
        // Skip points with invalid coordinates
        if (!point.latitude || !point.longitude) return;

        const speed = parseFloat(point.speed_mph);
        const gForce = parseFloat(point.gForce);
        const latLng = [point.latitude, point.longitude];

        // Add point to the appropriate segment
        if (speed >= 0 && speed < 10) {
            segments.speed_0_10.points.push(latLng);
        } else if (speed >= 10 && speed < 20) {
            segments.speed_10_20.points.push(latLng);
        } else if (speed >= 20 && speed < 30) {
            segments.speed_20_30.points.push(latLng);
        } else if (speed >= 30 && speed < 40) {
            segments.speed_30_40.points.push(latLng);
        } else if (speed >= 40 && speed < 50) {
            segments.speed_40_50.points.push(latLng);
        } else if (speed >= 50 && speed < 60) {
            segments.speed_50_60.points.push(latLng);
        } else if (speed >= 60 && speed < 70) {
            segments.speed_60_70.points.push(latLng);
        } else if (speed >= 70 && speed < 80) {
            segments.speed_70_80.points.push(latLng);
        } else if (speed >= 80 && speed < 90) {
            segments.speed_80_90.points.push(latLng);
        } else if (speed >= 90 && speed < 100) {
            segments.speed_90_100.points.push(latLng);
        } else {
            segments.veryFast.points.push(latLng);
        }

        // Track max G-force point
        if (gForce > maxGValue) {
            maxGValue = gForce;
            maxGPoint = latLng;
        }

        // Track max speed point
        if (speed > maxSpeedValue) {
            maxSpeedValue = speed;
            maxSpeedPoint = latLng;
        }
    });

    return {segments, maxGPoint, maxGValue, maxSpeedPoint, maxSpeedValue};
}

function plotDataLogOnMap() {
    // Clear all map content completely
    // Remove all layers except the base tile layer
    update_map_view = false;
    map_struct.MAP.eachLayer(function (layer) {
        if (!(layer instanceof L.TileLayer)) {
            map_struct.MAP.removeLayer(layer);
        }
    });

    // Reset path reference and recreate empty path
    map_struct.path = L.polyline([], {color: 'blue', weight: 3}).addTo(map_struct.MAP);

    // Re-add the position marker if needed
    if (map_struct.MARKER) {
        map_struct.MARKER.addTo(map_struct.MAP);
    }

    // Remove any existing legends
    const legendControls = document.querySelectorAll('.leaflet-control.info.legend');
    legendControls.forEach(control => control.remove());

    // Check if we have data to plot
    if (!dataLog || dataLog.length < 2) {
        showToast("Not enough data points to plot");
        return;
    }

    const {segments, maxGPoint, maxGValue, maxSpeedPoint, maxSpeedValue} = processDataLogSegments(dataLog);

    // Draw the segments on the map
    const allPoints = [];
    Object.values(segments).forEach(segment => {
        if (segment.points.length > 0) {
            // Plot individual points
            segment.points.forEach(point => {
                L.circleMarker(point, {
                    radius: 3,
                    color: segment.color,
                    fillColor: segment.color,
                    fillOpacity: 0.8,
                    weight: 1
                }).addTo(map_struct.MAP);
            });

            // Add all points to array for bounds calculation
            allPoints.push(...segment.points);
        }
    });

    // Add markers for notable points
    if (maxGPoint) {
        L.marker(maxGPoint, {
            icon: L.divIcon({
                className: 'max-g-marker',
                html: `<div style="background-color:#b6590e;color:white;padding:3px;border-radius:50%;width:24px;height:24px;text-align:center;line-height:18px;font-weight:bold;">G</div>`,
                iconSize: [24, 24]
            })
        }).addTo(map_struct.MAP).bindPopup(`Max G-Force: ${maxGValue.toFixed(2)}G`);
    }

    if (maxSpeedPoint) {
        L.marker(maxSpeedPoint, {
            icon: L.divIcon({
                className: 'max-speed-marker',
                html: `<div style="background-color:#880f1a;color:white;padding:3px;border-radius:50%;width:24px;height:24px;text-align:center;line-height:18px;font-weight:bold;">S</div>`,
                iconSize: [24, 24]
            })
        }).addTo(map_struct.MAP).bindPopup(`Max Speed: ${maxSpeedValue.toFixed(1)} mph`);
    }

    // Set map view to include all points
    if (allPoints.length > 0) {
        try {
            const bounds = L.latLngBounds(allPoints);
            map_struct.MAP.fitBounds(bounds, {padding: [30, 30]});

            // Add a legend to the map
            const legend = L.control({position: 'topright'});
            legend.onAdd = function () {
                const div = L.DomUtil.create('div', 'info legend');
                div.style.backgroundColor = 'rgba(255,255,255,0.8)';
                div.style.padding = '6px';
                div.style.borderRadius = '4px';
                div.innerHTML = `
                    <div class="map_text"><span style="display:inline-block;width:12px;height:12px;background-color:${segments.speed_0_10.color};"></span> 0-10 mph</div>
                    <div class="map_text"><span style="display:inline-block;width:12px;height:12px;background-color:${segments.speed_10_20.color}"></span> 10-20 mph</div>
                    <div class="map_text"><span style="display:inline-block;width:12px;height:12px;background-color:${segments.speed_20_30.color}"></span> 20-30 mph</div>
                    <div class="map_text"><span style="display:inline-block;width:12px;height:12px;background-color:${segments.speed_30_40.color}"></span> 30-40 mph</div>
                    <div class="map_text"><span style="display:inline-block;width:12px;height:12px;background-color:${segments.speed_40_50.color}"></span> 40-50 mph</div>
                    <div class="map_text"><span style="display:inline-block;width:12px;height:12px;background-color:${segments.speed_50_60.color}"></span> 50-60 mph</div>
                    <div class="map_text"><span style="display:inline-block;width:12px;height:12px;background-color:${segments.speed_60_70.color}"></span> 60-70 mph</div>
                    <div class="map_text"><span style="display:inline-block;width:12px;height:12px;background-color:${segments.speed_70_80.color}"></span> 70-80 mph</div>
                    <div class="map_text"><span style="display:inline-block;width:12px;height:12px;background-color:${segments.speed_80_90.color}"></span> 80-90 mph</div>
                    <div class="map_text"><span style="display:inline-block;width:12px;height:12px;background-color:${segments.speed_90_100.color}"></span> 90-100 mph</div>
                    <div class="map_text"><span style="display:inline-block;width:12px;height:12px;background-color:${segments.veryFast.color}"></span> 100+ mph</div>
                `;
                return div;
            };
            legend.addTo(map_struct.MAP);

            showToast("Track data plotted on map");
        } catch (e) {
            console.error("Error fitting bounds:", e);
            showToast("Error plotting track data");
        }
    }
}

function clearMap() {
    // Clear all map content completely
    // Remove all layers except the base tile layer
    update_map_view = true;
    map_struct.MAP.eachLayer(function (layer) {
        if (!(layer instanceof L.TileLayer)) {
            map_struct.MAP.removeLayer(layer);
        }
    });

    // Reset path reference and recreate empty path
    map_struct.path = L.polyline([], {color: 'blue', weight: 3}).addTo(map_struct.MAP);

    // Re-add the position marker if needed
    if (map_struct.MARKER) {
        map_struct.MARKER.addTo(map_struct.MAP);
    }

    // Remove any existing legends
    const legendControls = document.querySelectorAll('.leaflet-control.info.legend');
    legendControls.forEach(control => control.remove());

    showToast("Map cleared");
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        haversineDistance, processDataLogSegments
    };
}
