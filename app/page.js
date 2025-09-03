"use client";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Next.js + TailwindCSS single-file page component
 * Flyer auto-generator ("I'll be there" style)
 * - Live name typing
 * - Live photo upload (camera/gallery)
 * - Pre-designed flyer template background
 * - Circular photo crop with border ring
 * - Download JPG & Share (Web Share API fallback to WhatsApp link)
 *
 * Usage in Next.js (App Router):
 *   Save this file as app/page.jsx and put your flyer image in /public/flyer-template.jpg
 * Tailwind: ensure globals.css has @tailwind base; components; utilities;
 */

export default function Page() {
  const canvasRef = useRef(null);

  // UI state
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);

  // Preload the flyer template once
  const [bgReady, setBgReady] = useState(false);
  const bgImageRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // safe when served from same origin
    img.src = "/flyer-template.jpg"; // <-- put your template in /public
    img.onload = () => {
      bgImageRef.current = img;
      setBgReady(true);
      draw();
    };
  }, []);

  // When name or file changes, redraw
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, file, bgReady]);

  // Helper: draw everything
  const draw = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    // BACKGROUND: fallback gradient while template loads
    const gradient = ctx.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, "#f97316");
    gradient.addColorStop(1, "#ffffff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    if (bgReady && bgImageRef.current) {
      // Draw template full-bleed contain/cover -> we'll use cover
      drawImageCover(ctx, bgImageRef.current, 0, 0, W, H);
    }

    // PHOTO (optional): circular crop with white ring
    if (file) {
      try {
        const bmp = await createImageBitmap(file);
        const size = 220; // diameter of circular photo on flyer
        const x = 48; // top-left of bounding square
        const y = H / 2 - size / 2; // vertically centered

        // Draw ring behind
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2 + 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.fill();
        ctx.restore();

        // Clip to circle and draw the image with cover behavior
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        drawImageCover(ctx, bmp, x, y, size, size);
        ctx.restore();
      } catch (e) {
        // If createImageBitmap unsupported, fallback to HTMLImageElement
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          const size = 220;
          const x = 48;
          const y = H / 2 - size / 2;
          ctx.save();
          ctx.beginPath();
          ctx.arc(x + size / 2, y + size / 2, size / 2 + 6, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.fill();
          ctx.restore();

          ctx.save();
          ctx.beginPath();
          ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
          ctx.clip();
          drawImageCover(ctx, img, x, y, size, size);
          ctx.restore();
          URL.revokeObjectURL(url);
        };
        img.src = url;
      }
    }

    // TEXT OVERLAYS
    const mainX = 300; // left padding after photo
    const mainY = 180;

    // Title line
    ctx.save();
    ctx.font = "700 34px Arial"; // bold
    ctx.fillStyle = "#0f172a"; // slate-900
    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 4;
    drawText(ctx, `I, ${name || "________"}, support ADJ`, mainX, mainY, W - mainX - 32);
    ctx.restore();

    // Sub line
    ctx.save();
    ctx.font = "600 28px Arial";
    ctx.fillStyle = "#111827"; // gray-900
    drawText(ctx, "for House of Rep 2027", mainX, mainY + 48, W - mainX - 32);
    ctx.restore();

    // Slogan
    ctx.save();
    ctx.font = "italic 26px Arial";
    ctx.fillStyle = "#b91c1c"; // red-700
    drawText(ctx, "Ifo Lokan, Ifo lo ma se", mainX, mainY + 100, W - mainX - 32);
    ctx.restore();
  };

  // Draw image like CSS background-size: cover
  function drawImageCover(ctx, img, x, y, w, h) {
    const iw = img.width || img.bitmap?.width || 0;
    const ih = img.height || img.bitmap?.height || 0;
    if (!iw || !ih) return ctx.drawImage(img, x, y, w, h);
    const scale = Math.max(w / iw, h / ih);
    const nw = iw * scale;
    const nh = ih * scale;
    const nx = x + (w - nw) / 2;
    const ny = y + (h - nh) / 2;
    ctx.drawImage(img, nx, ny, nw, nh);
  }

  // Draw text with auto-fit (reduce font size to fit width if needed)
  function drawText(ctx, text, x, y, maxWidth) {
    let size = parseInt(ctx.font.match(/(\d+)px/)[1], 10);
    // downscale until it fits
    while (ctx.measureText(text).width > maxWidth && size > 12) {
      size -= 1;
      const parts = ctx.font.split(" ");
      parts[parts.length - 2] = `${size}px`;
      ctx.font = parts.join(" ");
    }
    ctx.fillText(text, x, y);
  }

  // Download as high-quality JPG
  const handleDownload = () => {
    const canvas = canvasRef.current;
    const url = canvas.toDataURL("image/jpeg", 0.92);
    const link = document.createElement("a");
    link.download = "flyer.jpg";
    link.href = url;
    link.click();
  };

  // Share (Web Share API) with JPG; fallback to WhatsApp text link
  const handleShare = async () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const blob = dataURLtoBlob(dataUrl);
    const file = new File([blob], "flyer.jpg", { type: "image/jpeg" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text: "Make yours here:", url: window.location.href });
    } else {
      const whatsappUrl =
        "https://wa.me/?text=" +
        encodeURIComponent("I just made my flyer! Make yours: " + window.location.href);
      window.open(whatsappUrl, "_blank");
    }
  };

  function dataURLtoBlob(dataURL) {
    const [hdr, b64] = dataURL.split(",");
    const mime = hdr.match(/:(.*?);/)[1];
    const bin = atob(b64);
    const len = bin.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-orange-500 via-orange-300 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-gray-800">Flyer Auto‑Generator</h1>
          <p className="text-gray-700">Upload your photo, type your name — get a ready flyer instantly.</p>
        </div>

        {/* Controls */}
        <div className="grid md:grid-cols-3 gap-4 items-start mb-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="md:col-span-1 w-full rounded-2xl border border-gray-300 p-3 shadow focus:outline-none focus:ring-2 focus:ring-orange-400"
          />

          <label className="md:col-span-1 block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Upload photo</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-2xl border border-gray-300 p-3 shadow bg-white"
            />
          </label>

          <div className="md:col-span-1 flex gap-3 justify-start md:justify-end">
            <button
              onClick={handleDownload}
              className="rounded-2xl px-5 py-3 bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700"
            >
              Download JPG
            </button>
            <button
              onClick={handleShare}
              className="rounded-2xl px-5 py-3 bg-blue-600 text-white font-semibold shadow hover:bg-blue-700"
            >
              Share
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="bg-white/70 backdrop-blur rounded-2xl shadow-xl p-4">
          <canvas
            ref={canvasRef}
            width={1200}
            height={630}
            className="w-full h-auto rounded-xl border border-white/60"
          />
        </div>

        {/* Tips */}
        <p className="text-sm text-gray-600 mt-3">Tip: Replace <code>/public/flyer-template.jpg</code> with your real design. Adjust positions in code (photo size/coords & text positions) to match your template layout.</p>
      </div>
    </main>
  );
}
