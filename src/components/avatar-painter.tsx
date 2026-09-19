"use client";

import { useEffect, useRef, useState } from "react";

export function AvatarPainter({
  defaultData,
  hue,
  initialLetter,
}: {
  defaultData?: string;
  hue: number;
  initialLetter: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#ecf3ff");
  const [size, setSize] = useState(6);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (defaultData) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        updateHiddenInput();
      };
      img.src = defaultData;
    } else {
      ctx.fillStyle = `hsl(${hue} 80% 46%)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#090d16";
      ctx.font = "bold 120px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initialLetter, canvas.width / 2, canvas.height / 2 + 10);
      updateHiddenInput();
    }
  }, [defaultData, hue, initialLetter]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDrawing(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.stroke();
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    if (!isDrawing) return;
    setIsDrawing(false);
    updateHiddenInput();
  }

  function updateHiddenInput() {
    const canvas = canvasRef.current;
    const hidden = hiddenInputRef.current;
    if (canvas && hidden) {
      hidden.value = canvas.toDataURL("image/png");
    }
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `hsl(${hue} 80% 46%)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    updateHiddenInput();
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="avatarData" ref={hiddenInputRef} />
      
      <div className="flex gap-4">
        <canvas
          ref={canvasRef}
          width={256}
          height={256}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          className="h-48 w-48 touch-none rounded-full cursor-crosshair border border-white/10 shadow-xl"
        />

        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-white">Werkzeuge</p>
          <div className="flex gap-2">
            {["#ecf3ff", "#090d16", "#00f5a0", "#ff6b7a", "#fbbf24", "#8b5cf6"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-white" : "border-transparent"}`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Pinselgröße:</span>
            <input type="range" min="2" max="30" value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-24 accent-emerald-400" />
          </div>

          <button type="button" onClick={clearCanvas} className="w-fit rounded-xl border border-rose-500/30 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/10">
            Zurücksetzen
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500">Du kannst auf der Fläche direkt malen, um deinen eigenen Avatar zu erstellen.</p>
    </div>
  );
}
