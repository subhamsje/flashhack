/**
 * Live Arrival Index Frontend Application Controller
 */

let appState = {
  activeTab: "overview",
  treeVisualizer: null,
  numberLine: null,
  autoRefreshInterval: null,
};

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function switchTab(tabId) {
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.tab === tabId);
  });
  document.querySelectorAll(".workspace-page").forEach((el) => {
    el.classList.toggle("active", el.id === `page-${tabId}`);
  });
  appState.activeTab = tabId;

  const titles = {
    overview: "Warehouse Overview Dashboard",
    "live-arrival": "Live Arrival Registration & Inspector",
    intervals: "Interval Explorer & Number Line",
    "missing-range": "Missing Range Intelligence & Gap Analysis",
    "avl-tree": "AVL Interval Tree Architecture & Rotations",
    search: "Search & Query Workspace",
    analytics: "Warehouse Performance & Analytics",
    "data-management": "Data Management, Persistence & History",
    performance: "Performance Benchmarking Laboratory",
    testing: "Automated Testing Laboratory",
  };
  document.getElementById("topbarTitle").textContent = titles[tabId] || "Live Arrival Index";

  if (tabId === "avl-tree" && appState.treeVisualizer) {
    loadTreeData();
  }
  if (tabId === "intervals" && appState.numberLine) {
    appState.numberLine.resize();
  }
}

async function fetchAPI(endpoint, options = {}) {
  try {
    const res = await fetch(endpoint, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

async function loadAnalytics() {
  try {
    const data = await fetchAPI("/api/analytics");
    document.getElementById("kpiTotalUnique").textContent = (data.total_unique_packages || 0).toLocaleString();
    document.getElementById("kpiTotalIntervals").textContent = (data.total_intervals || 0).toLocaleString();
    document.getElementById("kpiArrivalAttempts").textContent = (data.total_arrival_attempts || 0).toLocaleString();
    document.getElementById("kpiCoverage").textContent = `${(data.global_coverage_percentage || 100).toFixed(1)}%`;
    document.getElementById("kpiTreeHeight").textContent = data.tree_height || 0;
    document.getElementById("kpiRotations").textContent = (data.total_rotations || 0).toLocaleString();

    document.getElementById("topUnique").textContent = (data.total_unique_packages || 0).toLocaleString();
    document.getElementById("topIntervals").textContent = (data.total_intervals || 0).toLocaleString();
    document.getElementById("topHeight").textContent = data.tree_height || 0;

    // Overview statistics table
    document.getElementById("statDuplicates").textContent = data.duplicate_count || 0;
    document.getElementById("statLargestInterval").textContent = data.largest_interval ? `[${data.largest_interval.start}, ${data.largest_interval.end}] (${data.largest_interval_size})` : "None";
    document.getElementById("statAvgIntervalSize").textContent = (data.average_interval_size || 0).toFixed(2);
    document.getElementById("statTotalGaps").textContent = data.total_gaps || 0;
    document.getElementById("statLargestGap").textContent = data.largest_gap ? `[${data.largest_gap.start}, ${data.largest_gap.end}] (${data.largest_gap_size})` : "None";
    document.getElementById("statAvgGapSize").textContent = (data.average_gap_size || 0).toFixed(2);
    document.getElementById("statIsolated").textContent = data.isolated_package_count || 0;

    // Charts
    if (data.operations) {
      AnalyticsCharts.drawDonut(
        "opsDonutChart",
        [data.operations.new || 0, data.operations.extend || 0, data.operations.merge || 0, data.duplicate_count || 0],
        ["#38bdf8", "#10b981", "#a855f7", "#f59e0b"],
        ["New Interval", "Extension", "Bridge Merge", "Duplicate"]
      );
    }
    if (data.rotations) {
      AnalyticsCharts.drawBarChart(
        "rotationsChart",
        [data.rotations.ll || 0, data.rotations.rr || 0, data.rotations.lr || 0, data.rotations.rl || 0],
        ["LL", "RR", "LR", "RL"],
        "#6366f1"
      );
    }
  } catch (e) {
    console.warn("Failed to load analytics:", e);
  }
}

async function loadIntervals() {
  try {
    const data = await fetchAPI("/api/intervals");
    const intervals = data.intervals || [];

    if (appState.numberLine) {
      appState.numberLine.updateData(intervals);
    }

    const tbody = document.getElementById("intervalTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (intervals.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No intervals recorded.</td></tr>`;
      return;
    }

    intervals.forEach((iv, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-family: var(--font-mono);">${idx + 1}</td>
        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-blue);">[${iv.start}, ${iv.end}]</td>
        <td style="font-family: var(--font-mono);">${iv.size.toLocaleString()}</td>
        <td><span class="badge ${iv.size > 1 ? 'badge-emerald' : 'badge-blue'}">${iv.size > 1 ? 'Range' : 'Isolated'}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.warn("Failed to load intervals:", e);
  }
}

async function loadTreeData() {
  try {
    const tree = await fetchAPI("/api/tree");
    if (appState.treeVisualizer) {
      appState.treeVisualizer.render(tree);
    }
    document.getElementById("treeHeightDetail").textContent = tree.height || 0;
    document.getElementById("treeRotationsDetail").textContent = tree.rotations || 0;
    document.getElementById("treeNodesDetail").textContent = tree.total_intervals || 0;
  } catch (e) {
    console.warn("Failed to load tree data:", e);
  }
}

async function loadHistory() {
  try {
    const history = await fetchAPI("/api/history?limit=20");
    const tbody = document.getElementById("historyTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!history || history.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No arrival events logged yet.</td></tr>`;
      return;
    }

    history.forEach((h) => {
      const tr = document.createElement("tr");
      const badgeClass = h.is_duplicate ? "badge-amber" : (h.merge_occurred ? "badge-purple" : "badge-emerald");
      tr.innerHTML = `
        <td style="font-family: var(--font-mono);">${h.seq}</td>
        <td style="font-family: var(--font-mono); font-weight: 700;">#${h.package_id}</td>
        <td><span class="badge ${badgeClass}">${h.op_type}</span></td>
        <td style="font-family: var(--font-mono);">${h.intervals_before} → ${h.intervals_after}</td>
        <td style="font-family: var(--font-mono);">${h.unique_before} → ${h.unique_after}</td>
        <td style="color: var(--text-secondary); font-size: 12px;">${h.details}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.warn("Failed to load history:", e);
  }
}

async function registerPackage(id) {
  try {
    const res = await fetchAPI("/api/arrival", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ package_id: id }),
    });

    showToast(`Registered package #${id}: ${res.type}`, res.is_duplicate ? "warning" : "success");

    // Update Operation Inspector
    const inspector = document.getElementById("operationInspector");
    if (inspector) {
      inspector.innerHTML = "";
      const header = document.createElement("div");
      header.style.color = "var(--accent-blue)";
      header.style.marginBottom = "8px";
      header.style.fontWeight = "700";
      header.textContent = `=== OPERATION EXECUTION TRACE (Package #${id}) ===`;
      inspector.appendChild(header);

      if (res.steps) {
        res.steps.forEach((step) => {
          const div = document.createElement("div");
          div.className = "inspector-step";
          div.textContent = step;
          inspector.appendChild(div);
        });
      }

      const summary = document.createElement("div");
      summary.style.marginTop = "8px";
      summary.style.color = "var(--accent-emerald)";
      summary.textContent = `Result: ${res.details} (Intervals: ${res.intervals_before} -> ${res.intervals_after})`;
      inspector.appendChild(summary);
    }

    // Refresh views
    loadAnalytics();
    loadIntervals();
    loadHistory();
    if (appState.activeTab === "avl-tree") {
      loadTreeData();
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function registerBatch(packages) {
  try {
    const res = await fetchAPI("/api/arrival/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packages }),
    });
    showToast(`Batch processed: ${res.added} unique packages added`, "success");
    loadAnalytics();
    loadIntervals();
    loadHistory();
    if (appState.activeTab === "avl-tree") {
      loadTreeData();
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function runGapAnalysis() {
  const l = parseInt(document.getElementById("gapQueryL").value) || 0;
  const r = parseInt(document.getElementById("gapQueryR").value) || 1000;
  try {
    const data = await fetchAPI(`/api/gaps?l=${l}&r=${r}`);
    document.getElementById("gapResultCoverage").textContent = `${data.coverage_percentage.toFixed(2)}%`;
    document.getElementById("gapResultMissing").textContent = data.total_missing.toLocaleString();
    document.getElementById("gapResultCount").textContent = data.gap_count;
    document.getElementById("gapResultLargest").textContent = data.largest_gap ? `[${data.largest_gap.start}, ${data.largest_gap.end}] (${data.largest_gap.size})` : "None";

    const tbody = document.getElementById("gapTableBody");
    tbody.innerHTML = "";
    if (data.gaps.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--accent-emerald);">Full coverage! No gaps in [${l}, ${r}].</td></tr>`;
      return;
    }
    data.gaps.forEach((g, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-family: var(--font-mono);">${idx + 1}</td>
        <td style="font-family: var(--font-mono); color: var(--accent-rose); font-weight: 700;">[${g.start}, ${g.end}]</td>
        <td style="font-family: var(--font-mono);">${g.size.toLocaleString()}</td>
        <td><span class="badge badge-rose">Missing</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    showToast(e.message, "danger");
  }
}

async function runSearch() {
  const id = parseInt(document.getElementById("searchPackageInput").value);
  if (isNaN(id) || id < 0) {
    showToast("Please enter a valid package ID", "warning");
    return;
  }
  try {
    const data = await fetchAPI("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ package_id: id }),
    });

    const box = document.getElementById("searchResultsBox");
    box.style.display = "block";
    document.getElementById("searchResStatus").textContent = data.found ? "RECEIVED" : "NOT RECEIVED";
    document.getElementById("searchResStatus").className = `badge ${data.found ? 'badge-emerald' : 'badge-rose'}`;
    document.getElementById("searchResInterval").textContent = data.found ? `[${data.containing_interval.start}, ${data.containing_interval.end}]` : "None";
    document.getElementById("searchResClosest").textContent = data.closest_id >= 0 ? `#${data.closest_id} (distance: ${data.distance})` : "None";
    document.getElementById("searchResLower").textContent = data.has_lower ? `#${data.lower_id}` : "None";
    document.getElementById("searchResHigher").textContent = data.has_higher ? `#${data.higher_id}` : "None";
  } catch (e) {
    showToast(e.message, "danger");
  }
}

async function runBenchmark() {
  const pattern = parseInt(document.getElementById("benchPatternSelect").value) || 2;
  const count = parseInt(document.getElementById("benchCountSelect").value) || 1000;
  const btn = document.getElementById("btnRunBenchmark");
  btn.disabled = true;
  btn.textContent = "Executing C Benchmark...";

  try {
    const res = await fetchAPI("/api/benchmark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pattern, count }),
    });

    document.getElementById("benchResultBox").style.display = "block";
    document.getElementById("benchResPattern").textContent = res.pattern_name;
    document.getElementById("benchResTotalTime").textContent = `${res.total_insertion_us.toFixed(2)} μs`;
    document.getElementById("benchResAvgTime").textContent = `${res.avg_insertion_ns.toFixed(2)} ns/op`;
    document.getElementById("benchResTreeHeight").textContent = res.tree_height;
    document.getElementById("benchResRotations").textContent = res.total_rotations.toLocaleString();
    document.getElementById("benchResIntervals").textContent = res.resulting_intervals.toLocaleString();
    document.getElementById("benchResMemory").textContent = `${(res.memory_bytes / 1024).toFixed(2)} KB`;

    if (res.has_baseline) {
      document.getElementById("benchBaselineRow").style.display = "table-row";
      document.getElementById("benchResBaseline").textContent = `${res.baseline_insertion_us.toFixed(2)} μs`;
      document.getElementById("benchResSpeedup").textContent = `${res.speedup_factor.toFixed(2)}x faster`;
    } else {
      document.getElementById("benchBaselineRow").style.display = "none";
    }

    showToast("Benchmark completed successfully!", "success");
  } catch (e) {
    showToast(e.message, "danger");
  } finally {
    btn.disabled = false;
    btn.textContent = "Run Benchmark";
  }
}

async function runTestSuite() {
  const btn = document.getElementById("btnRunTests");
  btn.disabled = true;
  btn.textContent = "Running C Test Suite...";

  try {
    const data = await fetchAPI("/api/tests");
    document.getElementById("testSummary").textContent = `${data.passed}/${data.total} PASSED (${data.failed} Failed)`;
    document.getElementById("testSummary").className = `badge ${data.failed === 0 ? 'badge-emerald' : 'badge-rose'}`;

    const tbody = document.getElementById("testTableBody");
    tbody.innerHTML = "";
    data.tests.forEach((t) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight: 600;">${t.name}</td>
        <td><span class="badge ${t.status === 'PASS' ? 'badge-emerald' : 'badge-rose'}">${t.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
    showToast(`Tests finished: ${data.passed}/${data.total} passed`, data.failed === 0 ? "success" : "danger");
  } catch (e) {
    showToast(e.message, "danger");
  } finally {
    btn.disabled = false;
    btn.textContent = "Run Automated Test Suite";
  }
}

async function resetIndex() {
  if (!confirm("Are you sure you want to reset all intervals and warehouse history?")) {
    return;
  }
  try {
    await fetchAPI("/api/reset", { method: "POST" });
    showToast("Warehouse index reset successfully", "info");
    loadAnalytics();
    loadIntervals();
    loadHistory();
    if (appState.treeVisualizer) appState.treeVisualizer.resetView();
    loadTreeData();
  } catch (e) {
    showToast(e.message, "danger");
  }
}

async function saveState() {
  try {
    const res = await fetchAPI("/api/save", { method: "POST" });
    showToast(`Saved state to ${res.file}`, "success");
  } catch (e) {
    showToast(e.message, "danger");
  }
}

async function restoreState() {
  try {
    const res = await fetchAPI("/api/restore", { method: "POST" });
    showToast(`Restored state: ${res.unique_packages} packages, ${res.total_intervals} intervals`, "success");
    loadAnalytics();
    loadIntervals();
    loadHistory();
    loadTreeData();
  } catch (e) {
    showToast(e.message, "danger");
  }
}

// Initial Setup
window.addEventListener("DOMContentLoaded", () => {
  // Navigation tabs
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.addEventListener("click", () => switchTab(el.dataset.tab));
  });

  // Initialize visualizers
  appState.treeVisualizer = new AVLVisualizer("treeSvg");
  appState.numberLine = new NumberLineVisualizer("numberLineCanvas");

  // Single arrival form
  document.getElementById("singleArrivalForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("packageIdInput");
    const id = parseInt(input.value);
    if (!isNaN(id) && id >= 0) {
      registerPackage(id);
      input.value = "";
    }
  });

  // Batch arrival form
  document.getElementById("batchArrivalForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("batchInput");
    const raw = input.value.split(/[\s,]+/);
    const pkgs = raw.map((x) => parseInt(x)).filter((x) => !isNaN(x) && x >= 0);
    if (pkgs.length > 0) {
      registerBatch(pkgs);
      input.value = "";
    }
  });

  // Number line controls
  document.getElementById("btnNlZoomIn").addEventListener("click", () => appState.numberLine.setZoom(0.75));
  document.getElementById("btnNlZoomOut").addEventListener("click", () => appState.numberLine.setZoom(1.33));

  // Tree controls
  document.getElementById("btnResetTreeZoom").addEventListener("click", () => appState.treeVisualizer.resetView());

  // Search & Gaps & Benchmarks & Tests
  document.getElementById("btnRunGapQuery").addEventListener("click", runGapAnalysis);
  document.getElementById("btnRunSearch").addEventListener("click", runSearch);
  document.getElementById("btnRunBenchmark").addEventListener("click", runBenchmark);
  document.getElementById("btnRunTests").addEventListener("click", runTestSuite);

  // Persistence
  document.getElementById("btnSaveState").addEventListener("click", saveState);
  document.getElementById("btnRestoreState").addEventListener("click", restoreState);
  document.getElementById("btnResetIndex").addEventListener("click", resetIndex);

  // Load initial data
  loadAnalytics();
  loadIntervals();
  loadHistory();
  loadTreeData();

  // Polling every 2.5s for live dashboard
  appState.autoRefreshInterval = setInterval(() => {
    loadAnalytics();
    if (appState.activeTab === "intervals") loadIntervals();
    if (appState.activeTab === "data-management") loadHistory();
  }, 2500);
});
