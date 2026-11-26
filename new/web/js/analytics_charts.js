/**
 * Analytics Canvas Charts for Warehouse Metrics
 */
class AnalyticsCharts {
  static drawDonut(canvasId, data, colors, labels) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * window.devicePixelRatio;
    canvas.height = h * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, w, h);
    const total = data.reduce((a, b) => a + b, 0);
    if (total === 0) {
      ctx.fillStyle = "#64748b";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No operation data recorded", w / 2, h / 2);
      return;
    }

    const centerX = w / 3;
    const centerY = h / 2;
    const radius = Math.min(centerX, centerY) - 15;
    const innerRadius = radius * 0.6;

    let startAngle = -Math.PI / 2;
    for (let i = 0; i < data.length; i++) {
      if (data[i] === 0) continue;
      const sliceAngle = (data[i] / total) * (2 * Math.PI);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      startAngle += sliceAngle;
    }

    // Legend on the right
    ctx.textAlign = "left";
    ctx.font = "12px sans-serif";
    const legendX = centerX + radius + 30;
    let legendY = 30;

    for (let i = 0; i < data.length; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(legendX, legendY, 12, 12);
      ctx.fillStyle = "#f8fafc";
      const pct = ((data[i] / total) * 100).toFixed(1);
      ctx.fillText(`${labels[i]}: ${data[i]} (${pct}%)`, legendX + 20, legendY + 10);
      legendY += 24;
    }
  }

  static drawBarChart(canvasId, values, labels, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * window.devicePixelRatio;
    canvas.height = h * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, w, h);
    if (!values || values.length === 0) return;

    const maxVal = Math.max(...values, 1);
    const chartHeight = h - 40;
    const barWidth = Math.min(45, (w - 60) / values.length);
    const startX = 40;

    for (let i = 0; i < values.length; i++) {
      const barH = (values[i] / maxVal) * (chartHeight - 20);
      const x = startX + i * (barWidth + 15);
      const y = h - 25 - barH;

      ctx.fillStyle = color || "#38bdf8";
      ctx.fillRect(x, y, barWidth, barH);

      // Value label on top
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(values[i], x + barWidth / 2, y - 5);

      // Category label below
      ctx.fillText(labels[i] || "", x + barWidth / 2, h - 10);
    }
  }
}
