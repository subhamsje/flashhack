/**
 * Virtualized Interactive Number-Line Canvas Visualizer
 * Renders received intervals (green) and missing gaps (red/striped).
 */
class NumberLineVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    this.minId = 0;
    this.maxId = 100;
    this.viewStart = 0;
    this.viewEnd = 100;

    this.intervals = [];
    this.isDragging = false;
    this.dragStartX = 0;

    this.setupEvents();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.draw();
  }

  setupEvents() {
    this.canvas.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX;
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.dragStartX;
      this.dragStartX = e.clientX;
      const span = this.viewEnd - this.viewStart;
      const idDelta = -(dx / this.canvas.clientWidth) * span;
      this.viewStart = Math.max(0, this.viewStart + idDelta);
      this.viewEnd = this.viewStart + span;
      this.draw();
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoom = e.deltaY < 0 ? 0.8 : 1.25;
      const span = (this.viewEnd - this.viewStart) * zoom;
      const mid = (this.viewStart + this.viewEnd) / 2;
      this.viewStart = Math.max(0, Math.floor(mid - span / 2));
      this.viewEnd = Math.max(this.viewStart + 5, Math.ceil(mid + span / 2));
      this.draw();
    });
  }

  updateData(intervals) {
    this.intervals = intervals || [];
    if (this.intervals.length > 0) {
      this.minId = Math.max(0, this.intervals[0].start - 5);
      this.maxId = this.intervals[this.intervals.length - 1].end + 10;
      this.viewStart = this.minId;
      this.viewEnd = this.maxId;
    }
    this.draw();
  }

  setZoom(factor) {
    const span = (this.viewEnd - this.viewStart) * factor;
    const mid = (this.viewStart + this.viewEnd) / 2;
    this.viewStart = Math.max(0, Math.floor(mid - span / 2));
    this.viewEnd = Math.max(this.viewStart + 5, Math.ceil(mid + span / 2));
    this.draw();
  }

  draw() {
    if (!this.ctx) return;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.ctx.clearRect(0, 0, w, h);

    const span = this.viewEnd - this.viewStart;
    if (span <= 0) return;

    const toX = (id) => ((id - this.viewStart) / span) * w;

    // Draw baseline axis
    const axisY = h / 2;
    this.ctx.strokeStyle = "#334155";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, axisY);
    this.ctx.lineTo(w, axisY);
    this.ctx.stroke();

    // Draw tick marks and labels
    const step = Math.max(1, Math.pow(10, Math.floor(Math.log10(span / 8))));
    const firstTick = Math.ceil(this.viewStart / step) * step;

    this.ctx.fillStyle = "#64748b";
    this.ctx.font = "10px ui-monospace, monospace";
    this.ctx.textAlign = "center";

    for (let id = firstTick; id <= this.viewEnd; id += step) {
      const tx = toX(id);
      this.ctx.beginPath();
      this.ctx.moveTo(tx, axisY - 6);
      this.ctx.lineTo(tx, axisY + 6);
      this.ctx.stroke();
      this.ctx.fillText(id.toLocaleString(), tx, axisY + 22);
    }

    // Draw Missing Gaps background (red tinted)
    let curr = this.viewStart;
    this.intervals.forEach((iv) => {
      if (iv.end < this.viewStart || iv.start > this.viewEnd) return;
      if (curr < iv.start) {
        const gapStart = Math.max(curr, this.viewStart);
        const gapEnd = Math.min(iv.start - 1, this.viewEnd);
        const gx1 = toX(gapStart);
        const gx2 = toX(gapEnd + 1);
        this.ctx.fillStyle = "rgba(244, 63, 94, 0.15)";
        this.ctx.fillRect(gx1, axisY - 20, Math.max(2, gx2 - gx1), 40);
      }
      curr = Math.max(curr, iv.end + 1);
    });

    if (curr <= this.viewEnd) {
      const gx1 = toX(curr);
      const gx2 = toX(this.viewEnd);
      this.ctx.fillStyle = "rgba(244, 63, 94, 0.15)";
      this.ctx.fillRect(gx1, axisY - 20, Math.max(2, gx2 - gx1), 40);
    }

    // Draw Received Intervals (green glowing blocks)
    this.intervals.forEach((iv) => {
      if (iv.end < this.viewStart || iv.start > this.viewEnd) return;

      const x1 = toX(iv.start);
      const x2 = toX(iv.end + 1);
      const blockW = Math.max(3, x2 - x1);

      // Gradient fill
      const grad = this.ctx.createLinearGradient(x1, 0, x2, 0);
      grad.addColorStop(0, "#10b981");
      grad.addColorStop(1, "#059669");

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.roundRect(x1, axisY - 18, blockW, 36, 4);
      this.ctx.fill();

      // Border
      this.ctx.strokeStyle = "#34d399";
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      // Interval range label inside block if width permits
      if (blockW > 50) {
        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "bold 11px ui-monospace, monospace";
        this.ctx.textAlign = "center";
        const label = (iv.start === iv.end) ? `${iv.start}` : `[${iv.start}..${iv.end}]`;
        this.ctx.fillText(label, x1 + blockW / 2, axisY + 4);
      }
    });
  }
}
