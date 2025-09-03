"use client";
import { useEffect, useRef, useState } from "react";

export default function Page() {
  const canvasRef = useRef(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [bgReady, setBgReady] = useState(false);
  const bgImageRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/flyer-template.jpg";
    img.onload = () => {
      bgImageRef.current = img;
      setBgReady(true);
      draw();
    };
  }, []);

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, file, bgReady]);

  const draw = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    // Background
    ctx.fillStyle = "#f97316";
    ctx.fillRect(0, 0, W, H);

    if (bgReady && bgImageRef.current) {
      drawImageCover(ctx, bgImageRef.current, 0, 0, W, H);
    }

    // Photo
    if (file) {
      try {
        const bmp = await createImageBitmap(file);
        const size = 300;
        const x = 80;
        const y = H / 2 - size / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2 + 8, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        drawImageCover(ctx, bmp, x, y, size, size);
        ctx.restore();
      } catch {}
    }

    // Texts
    const textX = 450;
    const textY = 400;

    ctx.save();
    ctx.font = "700 42px Arial";
    ctx.fillStyle = "#0f172a";
    ctx.fillText(`I, ${name || "________"}, support ADJ`, textX, textY);
    ctx.restore();

    ctx.save();
    ctx.font = "600 36px Arial";
    ctx.fillStyle = "#111827";
    ctx.fillText("for House of Rep 2027", textX, textY + 60);
    ctx.restore();

    ctx.save();
    ctx.font = "italic 34px Arial";
    ctx.fillStyle = "#b91c1c";
    ctx.fillText("Ifo Lokan, Ifo lo ma se", textX, textY + 120);
    ctx.restore();
  };

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

  const handleDownloadAndShare = () => {
    const canvas = canvasRef.current;
    const url = canvas.toDataURL("image/jpeg", 0.92);

    // Auto download
    const link = document.createElement("a");
    link.download = "flyer.jpg";
    link.href = url;
    link.click();

    // Share options
    const whatsapp = `https://wa.me/?text=${encodeURIComponent("I just made my flyer! Make yours here: " + window.location.href)}`;
    const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
    const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent("I just made my flyer! Make yours here:")}&url=${encodeURIComponent(window.location.href)}`;

    // Open share window (WhatsApp default)
    window.open(whatsapp, "_blank");
    // Optionally you can add UI buttons for Facebook and X separately
  };

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-orange-500 via-orange-300 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-800 text-center mb-6">Flyer Auto‑Generator</h1>

        <div className="grid md:grid-cols-3 gap-4 items-start mb-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full rounded-2xl border border-gray-300 p-3 shadow"
          />

          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-2xl border border-gray-300 p-3 shadow bg-white"
          />

          <button
            onClick={handleDownloadAndShare}
            className="rounded-2xl px-5 py-3 bg-blue-600 text-white font-semibold shadow hover:bg-blue-700"
          >
            Download & Share
          </button>
        </div>

        <div className="bg-white/70 backdrop-blur rounded-2xl shadow-xl p-4">
          <canvas
            ref={canvasRef}
            width={1080}
            height={1080}
            className="w-full h-auto rounded-xl border border-white/60"
          />
        </div>
      </div>
    </main>
  );
}
