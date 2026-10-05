import React, { useEffect, useRef } from 'react';
import { DetectionResult } from '../types/detection';

interface ObjectDetectionOverlayProps {
  detections: DetectionResult[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
  showDistance?: boolean;
  showConfidence?: boolean;
}

export const ObjectDetectionOverlay: React.FC<ObjectDetectionOverlayProps> = ({
  detections,
  videoRef,
  showDistance = true,
  showConfidence = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Synchronize canvas resolution with actual video resolution
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;

    if (canvas.width !== vw || canvas.height !== vh) {
      canvas.width = vw;
      canvas.height = vh;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detections.length === 0) return;

    detections.forEach((det) => {
      const { x, y, width, height } = det.boundingBox;
      const isVeryClose = det.proximity === 'very-close';
      const color = isVeryClose ? '#EF4444' : det.color;

      // 1. Draw Bounding Box (Matches reference image style)
      ctx.lineWidth = Math.max(3, Math.round(canvas.width / 380));
      ctx.strokeStyle = color;
      
      // Subtle background fill
      ctx.fillStyle = isVeryClose ? 'rgba(239, 68, 68, 0.18)' : 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);

      // If very close, draw subtle pulsing corner accents
      if (isVeryClose) {
        ctx.lineWidth = ctx.lineWidth * 1.5;
        const cornerLen = Math.min(20, width * 0.25, height * 0.25);
        ctx.beginPath();
        // Top-Left
        ctx.moveTo(x, y + cornerLen);
        ctx.lineTo(x, y);
        ctx.lineTo(x + cornerLen, y);
        // Top-Right
        ctx.moveTo(x + width - cornerLen, y);
        ctx.lineTo(x + width, y);
        ctx.lineTo(x + width, y + cornerLen);
        // Bottom-Left
        ctx.moveTo(x, y + height - cornerLen);
        ctx.lineTo(x, y + height);
        ctx.lineTo(x + cornerLen, y + height);
        // Bottom-Right
        ctx.moveTo(x + width - cornerLen, y + height);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x + width, y + height - cornerLen);
        ctx.stroke();
      }

      // 2. Prepare Tag Label Text (Matches reference image)
      const classNameFormatted = det.className;
      const confPercent = Math.round(det.confidence * 100);
      const confText = showConfidence ? ` ${confPercent}%` : '';
      const distText =
        showDistance && det.estimatedDistance !== null
          ? ` • Estimated: ${det.estimatedDistance} m`
          : '';
      const warningText = isVeryClose ? ' ⚠ VERY CLOSE' : '';

      const line1 = `${classNameFormatted}${confText}${distText}${warningText}`;

      // Measure text font
      const fontSize = Math.max(13, Math.round(canvas.width / 55));
      ctx.font = `bold ${fontSize}px "Segoe UI", Roboto, -apple-system, sans-serif`;

      const textMetrics = ctx.measureText(line1);
      const tagPaddingX = 8;
      const tagPaddingY = 5;
      const tagWidth = textMetrics.width + tagPaddingX * 2;
      const tagHeight = fontSize + tagPaddingY * 2;

      // Position tag tab directly flush with the top edge of the box (like reference image)
      let tagY = y - tagHeight;
      if (tagY < 4) {
        tagY = y; // Inside top if at canvas ceiling
      }
      const tagX = Math.max(0, Math.min(canvas.width - tagWidth, x));

      // 3. Draw Solid Colored Tag Tab
      ctx.fillStyle = color;
      ctx.fillRect(tagX, tagY, tagWidth, tagHeight);

      // Contrast text color: Yellow and Lime Green get black text, others get white
      const isBrightColor = color === '#FFF000' || color === '#00FF2A' || color === '#FACC15';
      ctx.fillStyle = isBrightColor ? '#000000' : '#FFFFFF';
      ctx.textBaseline = 'middle';
      ctx.fillText(line1, tagX + tagPaddingX, tagY + tagHeight / 2 + 1);
    });
  }, [detections, videoRef, showDistance, showConfidence]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none w-full h-full object-cover z-10"
    />
  );
};
