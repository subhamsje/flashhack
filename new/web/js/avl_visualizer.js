/**
 * AVL Tree Interactive Visualizer
 * Renders actual AVL interval tree snapshots from the C engine into SVG.
 */
class AVLVisualizer {
  constructor(svgId) {
    this.svg = document.getElementById(svgId);
    if (!this.svg) return;
    this.g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.svg.appendChild(this.g);

    this.scale = 1.0;
    this.translateX = 0;
    this.translateY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    this.setupInteractions();
  }

  setupInteractions() {
    this.svg.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.startX = e.clientX - this.translateX;
      this.startY = e.clientY - this.translateY;
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      this.translateX = e.clientX - this.startX;
      this.translateY = e.clientY - this.startY;
      this.updateTransform();
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    this.svg.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      this.scale *= zoomFactor;
      this.scale = Math.max(0.2, Math.min(this.scale, 3.0));
      this.updateTransform();
    });
  }

  updateTransform() {
    this.g.setAttribute("transform", `translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`);
  }

  resetView() {
    this.scale = 1.0;
    this.translateX = 0;
    this.translateY = 0;
    this.updateTransform();
  }

  render(treeData) {
    while (this.g.firstChild) {
      this.g.removeChild(this.g.firstChild);
    }

    if (!treeData || !treeData.root) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", "300");
      text.setAttribute("y", "200");
      text.setAttribute("fill", "#64748b");
      text.setAttribute("font-size", "14");
      text.setAttribute("text-anchor", "middle");
      text.textContent = "AVL Tree is empty. Register packages to build index.";
      this.g.appendChild(text);
      return;
    }

    // Step 1: Assign positions via in-order traversal
    let xCounter = 0;
    const assignCoords = (node, depth) => {
      if (!node) return;
      assignCoords(node.left, depth + 1);
      node.x = xCounter * 120 + 80;
      node.y = depth * 85 + 60;
      xCounter++;
      assignCoords(node.right, depth + 1);
    };

    assignCoords(treeData.root, 0);

    // Center tree initially if not panned
    const svgWidth = this.svg.clientWidth || 800;
    const totalTreeWidth = xCounter * 120;
    if (this.translateX === 0) {
      this.translateX = Math.max(20, (svgWidth - totalTreeWidth) / 2);
      this.translateY = 20;
      this.updateTransform();
    }

    // Step 2: Draw branches
    const drawBranches = (node) => {
      if (!node) return;
      if (node.left) {
        this.drawBranch(node.x, node.y, node.left.x, node.left.y);
        drawBranches(node.left);
      }
      if (node.right) {
        this.drawBranch(node.x, node.y, node.right.x, node.right.y);
        drawBranches(node.right);
      }
    };
    drawBranches(treeData.root);

    // Step 3: Draw nodes
    const drawNodes = (node) => {
      if (!node) return;
      this.drawNode(node);
      drawNodes(node.left);
      drawNodes(node.right);
    };
    drawNodes(treeData.root);
  }

  drawBranch(x1, y1, x2, y2) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const midY = (y1 + y2) / 2;
    const d = `M ${x1} ${y1 + 15} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2 - 15}`;
    path.setAttribute("d", d);
    path.setAttribute("stroke", "#334155");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("fill", "none");
    this.g.appendChild(path);
  }

  drawNode(node) {
    const nodeG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodeG.setAttribute("transform", `translate(${node.x}, ${node.y})`);

    const width = 100;
    const height = 44;

    // Node capsule background
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", -width / 2);
    rect.setAttribute("y", -height / 2);
    rect.setAttribute("width", width);
    rect.setAttribute("height", height);
    rect.setAttribute("rx", "8");
    rect.setAttribute("fill", "#1e293b");
    rect.setAttribute("stroke", "#3b82f6");
    rect.setAttribute("stroke-width", "1.5");
    rect.setAttribute("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.4))");
    nodeG.appendChild(rect);

    // Interval label: [start, end]
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", "0");
    label.setAttribute("y", "-4");
    label.setAttribute("fill", "#f8fafc");
    label.setAttribute("font-size", "11");
    label.setAttribute("font-weight", "700");
    label.setAttribute("font-family", "ui-monospace, monospace");
    label.setAttribute("text-anchor", "middle");
    label.textContent = (node.start === node.end) ? `[${node.start}]` : `[${node.start}, ${node.end}]`;
    nodeG.appendChild(label);

    // Badges line: Height and Balance factor
    const subLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    subLabel.setAttribute("x", "0");
    subLabel.setAttribute("y", "12");
    subLabel.setAttribute("fill", "#94a3b8");
    subLabel.setAttribute("font-size", "9.5");
    subLabel.setAttribute("font-family", "ui-monospace, monospace");
    subLabel.setAttribute("text-anchor", "middle");

    const bfColor = (node.balance === 0) ? "#10b981" : (Math.abs(node.balance) === 1 ? "#38bdf8" : "#f43f5e");
    subLabel.innerHTML = `h:${node.height} | <tspan fill="${bfColor}">bf:${node.balance}</tspan> | n:${node.count}`;
    nodeG.appendChild(subLabel);

    // Interactive tooltip hover
    nodeG.style.cursor = "pointer";
    nodeG.addEventListener("mouseenter", () => {
      rect.setAttribute("stroke", "#38bdf8");
      rect.setAttribute("stroke-width", "2.5");
    });
    nodeG.addEventListener("mouseleave", () => {
      rect.setAttribute("stroke", "#3b82f6");
      rect.setAttribute("stroke-width", "1.5");
    });

    this.g.appendChild(nodeG);
  }
}
