const fps = 10; // Frames per second
const frameDuration = 1000 / fps; // Duration of each frame in ms
let lastFrameTime = 0;

function exportLogAsVideo() {
    // Check if there's data to create video from
    if (!dataLog || dataLog.length === 0) {
        showToast('No log data to export as video!');
        return;
    }

    // Create a canvas for our video frames
    const canvas = document.createElement('canvas');
    canvas.width = 600;  // Set video resolution
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    // Create canvas offscreen without adding to DOM
    canvas.style.display = 'none';
    document.body.appendChild(canvas);

    // Create progress indicator
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '9999';
    overlay.style.flexDirection = 'column';

    const progressText = document.createElement('div');
    progressText.style.color = 'white';
    progressText.style.fontSize = '18px';
    progressText.style.marginBottom = '20px';
    progressText.textContent = 'Preparing video...';

    const progressBar = document.createElement('div');
    progressBar.style.width = '80%';
    progressBar.style.maxWidth = '300px';
    progressBar.style.height = '10px';
    progressBar.style.backgroundColor = '#444';
    progressBar.style.borderRadius = '5px';
    progressBar.style.overflow = 'hidden';
    progressBar.style.position = 'relative';
    progressBar.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';

    const progressFill = document.createElement('div');
    progressFill.style.width = '0%';
    progressFill.style.height = '100%';
    progressFill.style.backgroundColor = '#76c7c0';
    progressFill.style.position = 'absolute';
    progressFill.style.top = '0';
    progressFill.style.left = '0';
    progressFill.style.transition = 'width 0.5s ease-in-out';

    progressBar.appendChild(progressFill);
    overlay.appendChild(progressText);
    overlay.appendChild(progressBar);
    document.body.appendChild(overlay);

    const totalFrames = dataLog.length;
    let currentFrame = 0;

    // Check if MediaRecorder is supported
    if (!window.MediaRecorder) {
        showToast('Your browser does not support the MediaRecorder API');
        document.body.removeChild(overlay);
        document.body.removeChild(canvas);
        return;
    }

    // Set up recording
    try {
        const stream = canvas.captureStream(fps);
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm; codecs=vp8'
        });

        const chunks = [];
        mediaRecorder.ondataavailable = function (e) {
            chunks.push(e.data);
        };

        mediaRecorder.onstop = function () {
            const blob = new Blob(chunks, {type: 'video/webm'});
            const url = URL.createObjectURL(blob);
            const fileName = `track_video_${new Date().toISOString().substring(0, 19).replace(/:/g, '-')}.webm`;

            // Remove progress overlay
            document.body.removeChild(overlay);
            document.body.removeChild(canvas);

            // Check if we're on a mobile device
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            if (isMobile) {
                // Create mobile-friendly download interface
                const downloadOverlay = document.createElement('div');
                downloadOverlay.style.position = 'fixed';
                downloadOverlay.style.top = '0';
                downloadOverlay.style.left = '0';
                downloadOverlay.style.width = '100%';
                downloadOverlay.style.height = '100%';
                downloadOverlay.style.backgroundColor = 'rgba(0,0,0,0.85)';
                downloadOverlay.style.display = 'flex';
                downloadOverlay.style.flexDirection = 'column';
                downloadOverlay.style.justifyContent = 'center';
                downloadOverlay.style.alignItems = 'center';
                downloadOverlay.style.zIndex = '9999';

                const downloadBox = document.createElement('div');
                downloadBox.style.backgroundColor = '#222';
                downloadBox.style.borderRadius = '12px';
                downloadBox.style.padding = '20px';
                downloadBox.style.maxWidth = '90%';
                downloadBox.style.width = '360px';
                downloadBox.style.textAlign = 'center';
                downloadBox.style.boxShadow = '0 4px 24px rgba(0,0,0,0.5)';

                const title = document.createElement('h3');
                title.textContent = 'Video Ready';
                title.style.color = 'white';
                title.style.marginBottom = '15px';

                const downloadBtn = document.createElement('a');
                downloadBtn.href = url;
                downloadBtn.download = fileName;
                downloadBtn.textContent = 'Tap to Download';
                downloadBtn.style.display = 'block';
                downloadBtn.style.backgroundColor = '#0d6efd';
                downloadBtn.style.color = 'white';
                downloadBtn.style.padding = '14px 20px';
                downloadBtn.style.borderRadius = '6px';
                downloadBtn.style.textDecoration = 'none';
                downloadBtn.style.fontWeight = 'bold';
                downloadBtn.style.margin = '10px 0';

                const closeBtn = document.createElement('button');
                closeBtn.textContent = 'Close';
                closeBtn.style.backgroundColor = 'transparent';
                closeBtn.style.border = '1px solid #666';
                closeBtn.style.color = '#fff';
                closeBtn.style.padding = '8px 16px';
                closeBtn.style.borderRadius = '6px';
                closeBtn.style.marginTop = '15px';
                closeBtn.onclick = function () {
                    document.body.removeChild(downloadOverlay);
                    URL.revokeObjectURL(url);
                };

                downloadBox.appendChild(title);
                downloadBox.appendChild(downloadBtn);
                downloadBox.appendChild(closeBtn);
                downloadOverlay.appendChild(downloadBox);
                document.body.appendChild(downloadOverlay);
            } else {
                // Desktop behavior - automatic download plus notification
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();

                showToast('Video exported successfully');
                URL.revokeObjectURL(url);
            }
        };

        mediaRecorder.start();

        const drawFrame = (timestamp) => {
            if (currentFrame < totalFrames) {
                // Calculate time elapsed since last frame
                const elapsed = timestamp - lastFrameTime;

                // Only draw a new frame when enough time has passed
                if (!lastFrameTime || elapsed >= frameDuration) {
                    // Update last frame time, accounting for any excess time
                    lastFrameTime = timestamp - (elapsed % frameDuration);

                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    const speed = dataLog[currentFrame].speed_mph;
                    const gForce = dataLog[currentFrame].gForce;
                    drawGauge(ctx, speed, gForce);

                    currentFrame++;
                    progressFill.style.width = `${(currentFrame / totalFrames) * 100}%`;
                    progressText.textContent = `Rendering video: ${Math.round((currentFrame / totalFrames) * 100)}%`;
                }
                requestAnimationFrame(drawFrame);
            } else {
                mediaRecorder.stop();
            }
        };

        // Start drawing frames with timestamp parameter
        requestAnimationFrame(drawFrame);
    } catch (error) {
        showToast(`Error creating video: ${error.message}`);
        document.body.removeChild(overlay);
        document.body.removeChild(canvas);
    }

    function drawGauge(ctx, speed, gForce) {
        // Create modern dark gradient background
        const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGradient.addColorStop(0, '#1a1a1a');
        bgGradient.addColorStop(1, '#101010');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add subtle grid pattern
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 20) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }

        // Load and draw logo
        drawLogo(ctx, canvas.width/2, 60, 200);

        // Draw gauges with modern style
        drawSpeedometer(ctx, speed, 175, 220, 140);
        drawGForceMeter(ctx, gForce, 425, 220, 140);

        // Format timestamp from data log
        const timestamp = dataLog[currentFrame].timestamp;
        const formattedTime = new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });

        // Add frame info with modern styling
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '12px Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`Frame: ${currentFrame}/${totalFrames}`, canvas.width - 20, canvas.height - 16);
        ctx.textAlign = 'left';
        ctx.fillText(`Time: ${formattedTime}`, 20, canvas.height - 16);
    }


// Function to load and draw the logo
    function drawLogo(ctx, x, y, width) {
        // Create and use logo image if not already loaded
        if (!window.logoImage) {
            window.logoImage = new Image();
            window.logoImage.src = '/static/images/race_tracker.png';
            window.logoImage.onload = () => {
                // Once loaded, it will be used in the next frame
            };
        }

        // Draw logo if loaded
        if (window.logoImage && window.logoImage.complete) {
            const aspectRatio = window.logoImage.height / window.logoImage.width;
            const height = width * aspectRatio;
            ctx.drawImage(window.logoImage, x - width / 2, y - height / 2, width, height);
        }
    }

    function drawSpeedometer(ctx, speed, x, y, radius) {
        // Fix NaN speed value to prevent visual issues
        speed = isNaN(parseFloat(speed)) ? 0 : parseFloat(speed);

        // Calculate max speed from dataLog if not already calculated
        if (!window.maxSpeedForGauge) {
            // Find maximum speed in dataLog with 10% padding
            const maxSpeed = dataLog.reduce((max, point) => {
                const s = parseFloat(point.speed_mph || 0);
                return isNaN(s) ? max : Math.max(max, s);
            }, 0);

            // Add padding and round to nearest multiple of 20
            window.maxSpeedForGauge = Math.ceil((maxSpeed * 1.1) / 20) * 20;
            // Ensure minimum reasonable scale (at least 60 mph)
            window.maxSpeedForGauge = Math.max(window.maxSpeedForGauge, 60);
        }

        const maxSpeed = window.maxSpeedForGauge;

        // Define sweep angle (now 240 degrees instead of 180)
        const startAngle = Math.PI + Math.PI/6; // 210 degrees
        const endAngle = 3 * Math.PI - Math.PI/6; // 330 degrees
        const sweepAngle = endAngle - startAngle; // 240 degrees

        // Draw outer ring with gradient
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        const outerGradient = ctx.createRadialGradient(x, y, radius * 0.7, x, y, radius * 1.1);
        outerGradient.addColorStop(0, '#333');
        outerGradient.addColorStop(1, '#111');
        ctx.fillStyle = outerGradient;
        ctx.fill();

        // Draw inner background with gradient
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.95, 0, 2 * Math.PI);
        const innerGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        innerGradient.addColorStop(0, '#2a2a2a');
        innerGradient.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = innerGradient;
        ctx.fill();

        // Draw tick marks with expanded sweep
        const tickStep = maxSpeed <= 100 ? 10 : 20; // Adjust tick spacing based on max speed
        for (let i = 0; i <= maxSpeed; i += tickStep) {
            const angle = startAngle + (i / maxSpeed) * sweepAngle;
            const innerRadius = radius * 0.8;
            const outerRadius = i % (tickStep*2) === 0 ? radius * 0.95 : radius * 0.9;

            ctx.beginPath();
            ctx.moveTo(
                x + innerRadius * Math.cos(angle),
                y + innerRadius * Math.sin(angle)
            );
            ctx.lineTo(
                x + outerRadius * Math.cos(angle),
                y + outerRadius * Math.sin(angle)
            );
            ctx.strokeStyle = i % (tickStep*2) === 0 ? '#ff6600' : 'rgba(255,255,255,0.4)';
            ctx.lineWidth = i % (tickStep*2) === 0 ? 3 : 1;
            ctx.stroke();

            // Add speed labels for major ticks
            if (i % (tickStep*2) === 0) {
                const textRadius = radius * 0.7;
                ctx.fillStyle = '#ccc';
                ctx.font = 'bold 14px Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(
                    i.toString(),
                    x + textRadius * Math.cos(angle),
                    y + textRadius * Math.sin(angle)
                );
            }
        }

        // Draw speed needle with shadow using new angle calculation
        ctx.save();
        ctx.shadowColor = 'rgba(255,102,0,0.6)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        const angle = startAngle + (Math.min(speed, maxSpeed) / maxSpeed) * sweepAngle;
        const needleLength = radius * 0.85;

        // Create needle gradient
        const needleGradient = ctx.createLinearGradient(
            x, y,
            x + needleLength * Math.cos(angle),
            y + needleLength * Math.sin(angle)
        );
        needleGradient.addColorStop(0, '#ff6600');
        needleGradient.addColorStop(1, '#ff3300');

        // Draw needle
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
            x + needleLength * Math.cos(angle),
            y + needleLength * Math.sin(angle)
        );
        ctx.strokeStyle = needleGradient;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        // Draw center cap
        ctx.beginPath();
        const centerGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.15);
        centerGradient.addColorStop(0, '#ff7700');
        centerGradient.addColorStop(1, '#cc5500');
        ctx.fillStyle = centerGradient;
        ctx.arc(x, y, radius * 0.1, 0, 2 * Math.PI);
        ctx.fill();

        // Draw ring around center cap
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.1, 0, 2 * Math.PI);
        ctx.strokeStyle = '#ff9955';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Speed text with shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(speed)}`, x, y + radius * 0.35);
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.fillText('MPH', x, y + radius * 0.5);

        // Add max speed indicator
        ctx.font = 'bold 12px Arial, sans-serif';
        ctx.fillStyle = '#ff6600';
        ctx.textAlign = 'center';
        ctx.fillText(`MAX: ${maxSpeed}`, x, y + radius * 0.65);
        ctx.restore();
    }

    function drawGForceMeter(ctx, gForce, x, y, radius) {
        // Fix NaN gForce value
        gForce = isNaN(parseFloat(gForce)) ? 0 : parseFloat(gForce);
        const maxG = 3;

        // Draw outer ring with gradient
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        const outerGradient = ctx.createRadialGradient(x, y, radius * 0.7, x, y, radius * 1.1);
        outerGradient.addColorStop(0, '#333');
        outerGradient.addColorStop(1, '#111');
        ctx.fillStyle = outerGradient;
        ctx.fill();

        // Draw inner background with gradient
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.95, 0, 2 * Math.PI);
        const innerGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        innerGradient.addColorStop(0, '#2a2a2a');
        innerGradient.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = innerGradient;
        ctx.fill();

        // Draw G-force indicator sectors
        for (let g = 0; g <= maxG; g += 0.5) {
            const angle = (-0.5 + g / maxG) * Math.PI;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.arc(x, y, radius * 0.85, -0.5 * Math.PI, angle);
            ctx.lineTo(x, y);

            // Gradient based on g-force value
            const sectorGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            const intensity = g / maxG;
            const color = g <= 1 ?
                `rgba(0,${Math.round(200 * intensity)},${Math.round(255 * (1 - intensity))},0.15)` :
                `rgba(${Math.round(255 * intensity)},${Math.round(200 * (1 - intensity / 2))},0,0.15)`;

            sectorGradient.addColorStop(0, 'transparent');
            sectorGradient.addColorStop(1, color);
            ctx.fillStyle = sectorGradient;
            ctx.fill();
        }

        // Draw tick marks
        for (let g = 0; g <= maxG; g += 0.5) {
            const angle = (-0.5 + g / maxG) * Math.PI;
            const innerRadius = radius * 0.8;
            const outerRadius = g % 1 === 0 ? radius * 0.95 : radius * 0.9;

            ctx.beginPath();
            ctx.moveTo(
                x + innerRadius * Math.cos(angle),
                y + innerRadius * Math.sin(angle)
            );
            ctx.lineTo(
                x + outerRadius * Math.cos(angle),
                y + outerRadius * Math.sin(angle)
            );

            const tickColor = g <= 1 ? '#30a0ff' :
                g <= 2 ? '#30ff30' : '#ff3030';

            ctx.strokeStyle = g % 1 === 0 ? tickColor : 'rgba(255,255,255,0.4)';
            ctx.lineWidth = g % 1 === 0 ? 3 : 1;
            ctx.stroke();

            // Add G-force labels for whole numbers
            if (g % 1 === 0) {
                const textRadius = radius * 0.7;
                ctx.fillStyle = '#ccc';
                ctx.font = 'bold 14px Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(
                    g.toString(),
                    x + textRadius * Math.cos(angle),
                    y + textRadius * Math.sin(angle)
                );
            }
        }

        // Draw G-force needle with glow effect
        ctx.save();
        ctx.shadowColor = 'rgba(0,150,255,0.6)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        const angle = (-0.5 + (gForce / maxG)) * Math.PI;
        const needleLength = radius * 0.85;

        // Create needle gradient
        const needleGradient = ctx.createLinearGradient(
            x, y,
            x + needleLength * Math.cos(angle),
            y + needleLength * Math.sin(angle)
        );
        needleGradient.addColorStop(0, '#30a0ff');
        needleGradient.addColorStop(1, '#0050ff');

        // Draw needle
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
            x + needleLength * Math.cos(angle),
            y + needleLength * Math.sin(angle)
        );
        ctx.strokeStyle = needleGradient;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        // Draw center cap
        ctx.beginPath();
        const centerGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.15);
        centerGradient.addColorStop(0, '#50c0ff');
        centerGradient.addColorStop(1, '#0070c0');
        ctx.fillStyle = centerGradient;
        ctx.arc(x, y, radius * 0.1, 0, 2 * Math.PI);
        ctx.fill();

        // Draw ring around center cap
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.1, 0, 2 * Math.PI);
        ctx.strokeStyle = '#80d0ff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // G-force text with shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(gForce.toFixed(2), x, y + radius * 0.35);
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.fillText('G-FORCE', x, y + radius * 0.5);
        ctx.restore();
    }
}