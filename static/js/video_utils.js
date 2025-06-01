function exportLogAsVideo() {
    const fps = 10; // Frames per second
    const frameDuration = 1000 / fps; // Duration of each frame in ms
    let lastFrameTime = 0;

    if (!dataLog || dataLog.length === 0) {
        showToast('No log data to export as video!');
        return;
    }
    let isCancelled = false;

    // Create layered canvases - one for static elements, one for dynamic elements
    const staticCanvas = document.createElement('canvas');
    const dynamicCanvas = document.createElement('canvas');
    const outputCanvas = document.createElement('canvas');

    staticCanvas.width = dynamicCanvas.width = outputCanvas.width = 600;
    staticCanvas.height = dynamicCanvas.height = outputCanvas.height = 400;

    const staticCtx = staticCanvas.getContext('2d');
    const dynamicCtx = dynamicCanvas.getContext('2d');
    const outputCtx = outputCanvas.getContext('2d');

    // Keep output canvas hidden but in the DOM for MediaRecorder
    outputCanvas.style.display = 'none';
    document.body.appendChild(outputCanvas);

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

    // Add cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.marginTop = '20px';
    cancelButton.style.padding = '8px 16px';
    cancelButton.style.backgroundColor = '#ff4444';
    cancelButton.style.color = 'white';
    cancelButton.style.border = 'none';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.style.fontWeight = 'bold';

    // Add hover effect
    cancelButton.onmouseover = () => {
        cancelButton.style.backgroundColor = '#ff6666';
    };

    cancelButton.onmouseout = () => {
        cancelButton.style.backgroundColor = '#ff4444';
    };

    // Attach cancel event handler
    cancelButton.onclick = () => {
        isCancelled = true;
        progressText.textContent = 'Cancelling...';
    };

    progressBar.appendChild(progressFill);
    overlay.appendChild(progressText);
    overlay.appendChild(progressBar);
    overlay.appendChild(cancelButton);
    document.body.appendChild(overlay);

    // Common cleanup function to use on completion or cancellation
    const cleanup = () => {
        document.body.removeChild(overlay);
        document.body.removeChild(outputCanvas);
    };

    const totalFrames = dataLog.length;
    let currentFrame = 0;

    // Check MediaRecorder support
    if (!window.MediaRecorder) {
        showToast('Your browser does not support the MediaRecorder API');
        document.body.removeChild(overlay);
        document.body.removeChild(outputCanvas);
        return;
    }

    // Preload logo and wait for it
    const preloadResources = () => {
        return new Promise((resolve) => {
            if (!window.logoImage) {
                window.logoImage = new Image();
                window.logoImage.src = '/static/images/race_tracker.png';
                window.logoImage.onload = resolve;
            } else if (window.logoImage.complete) {
                resolve();
            } else {
                window.logoImage.onload = resolve;
            }
        });
    };

    // Calculate max speed once
    if (!window.maxSpeedForGauge) {
        const maxSpeed = dataLog.reduce((max, point) => {
            const s = parseFloat(point.speed_mph || 0);
            return isNaN(s) ? max : Math.max(max, s);
        }, 0);
        window.maxSpeedForGauge = Math.ceil((maxSpeed * 1.1) / 20) * 20;
        window.maxSpeedForGauge = Math.max(window.maxSpeedForGauge, 60);
    }

    // Pre-render static elements
    const renderStaticElements = () => {
        // Background
        const bgGradient = staticCtx.createLinearGradient(0, 0, 0, staticCanvas.height);
        bgGradient.addColorStop(0, '#1a1a1a');
        bgGradient.addColorStop(1, '#101010');
        staticCtx.fillStyle = bgGradient;
        staticCtx.fillRect(0, 0, staticCanvas.width, staticCanvas.height);

        // Grid pattern
        staticCtx.strokeStyle = 'rgba(255,255,255,0.03)';
        staticCtx.lineWidth = 1;
        for (let i = 0; i < staticCanvas.width; i += 20) {
            staticCtx.beginPath();
            staticCtx.moveTo(i, 0);
            staticCtx.lineTo(i, staticCanvas.height);
            staticCtx.stroke();
        }
        for (let i = 0; i < staticCanvas.height; i += 20) {
            staticCtx.beginPath();
            staticCtx.moveTo(0, i);
            staticCtx.lineTo(staticCanvas.width, i);
            staticCtx.stroke();
        }

        // Draw logo
        if (window.logoImage && window.logoImage.complete) {
            const x = staticCanvas.width/2;
            const y = 60;
            const width = 200;
            const aspectRatio = window.logoImage.height / window.logoImage.width;
            const height = width * aspectRatio;
            staticCtx.drawImage(window.logoImage, x - width / 2, y - height / 2, width, height);
        }

        // Pre-render gauge backgrounds
        drawGaugeBackgrounds(staticCtx);
    };

    // Only render the backgrounds for speedometer and g-force meter
    const drawGaugeBackgrounds = (ctx) => {
        const maxSpeed = window.maxSpeedForGauge;
        const maxG = 3;

        // Render speedometer background (175, 220)
        renderGaugeBackground(ctx, 175, 220, 140, maxSpeed, true);

        // Render G-force meter background (425, 220)
        renderGaugeBackground(ctx, 425, 220, 140, maxG, false);
    };

    // Generic gauge background renderer
    const renderGaugeBackground = (ctx, x, y, radius, maxValue, isSpeedometer) => {
        // Draw outer ring
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        const outerGradient = ctx.createRadialGradient(x, y, radius * 0.7, x, y, radius * 1.1);
        outerGradient.addColorStop(0, '#333');
        outerGradient.addColorStop(1, '#111');
        ctx.fillStyle = outerGradient;
        ctx.fill();

        // Draw inner background
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.95, 0, 2 * Math.PI);
        const innerGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        innerGradient.addColorStop(0, '#2a2a2a');
        innerGradient.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = innerGradient;
        ctx.fill();

        if (isSpeedometer) {
            // Draw speedometer tick marks
            const startAngle = Math.PI + Math.PI/6; // 210 degrees
            const endAngle = 3 * Math.PI - Math.PI/6; // 330 degrees
            const sweepAngle = endAngle - startAngle; // 240 degrees

            const tickStep = maxValue <= 100 ? 10 : 20;

            for (let i = 0; i <= maxValue; i += tickStep) {
                const angle = startAngle + (i / maxValue) * sweepAngle;
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
        } else {
            // Draw G-force tick marks
            for (let g = 0; g <= maxValue; g += 0.5) {
                const angle = (-0.5 + g / maxValue) * Math.PI;
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
        }
    };

    // Render dynamic elements for current frame
    const renderDynamicElements = (frame) => {
        dynamicCtx.clearRect(0, 0, dynamicCanvas.width, dynamicCanvas.height);

        const speed = dataLog[frame].speed_mph;
        const gForce = dataLog[frame].gForce;

        // Render speedometer needle
        renderSpeedometerNeedle(dynamicCtx, speed, 175, 220, 140);

        // Render G-force needle
        renderGForceNeedle(dynamicCtx, gForce, 425, 220, 140);

        // Format timestamp from data log
        const timestamp = dataLog[frame].timestamp;
        const formattedTime = new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });

        // Add frame info
        dynamicCtx.fillStyle = 'rgba(255,255,255,0.7)';
        dynamicCtx.font = '12px Arial, sans-serif';
        dynamicCtx.textAlign = 'right';
        dynamicCtx.fillText(`Frame: ${frame}/${totalFrames}`, dynamicCanvas.width - 20, dynamicCanvas.height - 16);
        dynamicCtx.textAlign = 'left';
        dynamicCtx.fillText(`Time: ${formattedTime}`, 20, dynamicCanvas.height - 16);
    };

    // Only render the speedometer needle
    const renderSpeedometerNeedle = (ctx, speed, x, y, radius) => {
        const maxSpeed = window.maxSpeedForGauge;
        speed = isNaN(parseFloat(speed)) ? 0 : parseFloat(speed);

        const startAngle = Math.PI + Math.PI/6; // 210 degrees
        const endAngle = 3 * Math.PI - Math.PI/6; // 330 degrees
        const sweepAngle = endAngle - startAngle; // 240 degrees

        // Draw speed needle
        ctx.save();
        ctx.shadowColor = 'rgba(255,102,0,0.6)';
        ctx.shadowBlur = 15;

        const angle = startAngle + (Math.min(speed, maxSpeed) / maxSpeed) * sweepAngle;
        const needleLength = radius * 0.85;

        const needleGradient = ctx.createLinearGradient(
            x, y,
            x + needleLength * Math.cos(angle),
            y + needleLength * Math.sin(angle)
        );
        needleGradient.addColorStop(0, '#ff6600');
        needleGradient.addColorStop(1, '#ff3300');

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

        // Speed text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(speed)}`, x, y + radius * 0.35);
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.fillText('MPH', x, y + radius * 0.5);
    };

    // Only render the G-force needle
    const renderGForceNeedle = (ctx, gForce, x, y, radius) => {
        const maxG = 3;
        gForce = isNaN(parseFloat(gForce)) ? 0 : parseFloat(gForce);

        // Draw G-force needle
        ctx.save();
        ctx.shadowColor = 'rgba(0,150,255,0.6)';
        ctx.shadowBlur = 15;

        const angle = (-0.5 + (gForce / maxG)) * Math.PI;
        const needleLength = radius * 0.85;

        const needleGradient = ctx.createLinearGradient(
            x, y,
            x + needleLength * Math.cos(angle),
            y + needleLength * Math.sin(angle)
        );
        needleGradient.addColorStop(0, '#30a0ff');
        needleGradient.addColorStop(1, '#0050ff');

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

        // G-force text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(gForce.toFixed(2), x, y + radius * 0.35);
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.fillText('G-FORCE', x, y + radius * 0.5);
    };

    // Composite all layers
    const compositeFrame = () => {
        outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
        outputCtx.drawImage(staticCanvas, 0, 0);
        outputCtx.drawImage(dynamicCanvas, 0, 0);
    };

    // Start video encoding process
    const startVideoEncoding = async () => {
        await preloadResources();
        renderStaticElements();

        const frameDuration = 1000 / fps;
        let lastFrameTime = 0;

        try {
            const stream = outputCanvas.captureStream(fps);
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm; codecs=vp8'
            });

            const chunks = [];
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

            mediaRecorder.onstop = function () {
                if (isCancelled) {
                    cleanup();
                    showToast('Video rendering cancelled');
                    return;
                }

                const blob = new Blob(chunks, {type: 'video/webm'});
                const url = URL.createObjectURL(blob);
                const fileName = `track_video_${new Date().toISOString().substring(0, 19).replace(/:/g, '-')}.webm`;

                cleanup();

                // document.body.removeChild(overlay);
                // document.body.removeChild(outputCanvas);

                // Handle download (mobile/desktop detection code stays the same)
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
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    a.click();
                    showToast('Video exported successfully');
                    URL.revokeObjectURL(url);
                }
            };

            mediaRecorder.start();

            // Rendering function with throttling
            const drawFrame = (timestamp) => {
                if (isCancelled) {
                    mediaRecorder.stop();
                    return;
                }

                if (currentFrame >= totalFrames) {
                    mediaRecorder.stop();
                    return;
                }

                // Calculate time elapsed since last frame
                const elapsed = timestamp - lastFrameTime;

                // Only draw a new frame when enough time has passed
                if (!lastFrameTime || elapsed >= frameDuration) {
                    // Update progress every 5 frames to reduce DOM updates
                    if (currentFrame % 5 === 0) {
                        progressFill.style.width = `${(currentFrame / totalFrames) * 100}%`;
                        progressText.textContent = `Rendering video: ${Math.round((currentFrame / totalFrames) * 100)}%`;
                    }

                    // Update last frame time, accounting for excess time
                    lastFrameTime = timestamp - (elapsed % frameDuration);

                    // Render dynamic elements for current frame
                    renderDynamicElements(currentFrame);

                    // Composite layers
                    compositeFrame();

                    // Move to next frame
                    currentFrame++;
                }

                // Continue rendering loop
                requestAnimationFrame(drawFrame);
            };

            requestAnimationFrame(drawFrame);
        } catch (error) {
            showToast(`Error creating video: ${error.message}`);
            cleanup();
        }
    };

    // Begin the process
    startVideoEncoding();
}