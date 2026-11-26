#include "benchmark.h"
#include "avl_tree.h"
#include "insertion.h"
#include "search.h"
#include "gap_analysis.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#if defined(_WIN32) || defined(_WIN64)
#include <windows.h>
static double get_time_us(void) {
    LARGE_INTEGER count, freq;
    QueryPerformanceFrequency(&freq);
    QueryPerformanceCounter(&count);
    return ((double)count.QuadPart / (double)freq.QuadPart) * 1000000.0;
}
#else
#include <time.h>
static double get_time_us(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (ts.tv_sec * 1000000.0) + (ts.tv_nsec / 1000.0);
}
#endif

const char* benchmark_pattern_name(ArrivalPattern pattern) {
    switch (pattern) {
        case PATTERN_SEQUENTIAL: return "Sequential (1..N)";
        case PATTERN_REVERSE: return "Reverse Sequential (N..1)";
        case PATTERN_RANDOM: return "Random Arrivals";
        case PATTERN_SPARSE: return "Sparse IDs (Widely Spaced)";
        case PATTERN_DUPLICATE_HEAVY: return "Duplicate Heavy";
        case PATTERN_ALTERNATING: return "Alternating Evens then Odds (Bridge Merges)";
        case PATTERN_BRIDGE_MERGE_HEAVY: return "Bridge-Merge Intensive";
        default: return "Unknown";
    }
}

static int64_t* generate_dataset(ArrivalPattern pattern, int count) {
    int64_t *data = (int64_t*)malloc(sizeof(int64_t) * count);
    if (!data) return NULL;

    srand(1337);

    switch (pattern) {
        case PATTERN_SEQUENTIAL:
            for (int i = 0; i < count; i++) {
                data[i] = i + 1;
            }
            break;

        case PATTERN_REVERSE:
            for (int i = 0; i < count; i++) {
                data[i] = count - i;
            }
            break;

        case PATTERN_RANDOM:
            for (int i = 0; i < count; i++) {
                data[i] = ((int64_t)rand() << 16) ^ rand();
                if (data[i] < 0) data[i] = -data[i];
                data[i] %= (count * 10);
            }
            break;

        case PATTERN_SPARSE:
            for (int i = 0; i < count; i++) {
                data[i] = (int64_t)i * 100000LL;
            }
            break;

        case PATTERN_DUPLICATE_HEAVY: {
            int unique_pool = count / 10;
            if (unique_pool < 5) unique_pool = 5;
            for (int i = 0; i < count; i++) {
                data[i] = rand() % unique_pool;
            }
            break;
        }

        case PATTERN_ALTERNATING: {
            int half = count / 2;
            for (int i = 0; i < half; i++) {
                data[i] = (int64_t)(i + 1) * 2; // Evens: 2, 4, 6...
            }
            for (int i = half; i < count; i++) {
                data[i] = (int64_t)(i - half) * 2 + 1; // Odds: 1, 3, 5... (bridges!)
            }
            break;
        }

        case PATTERN_BRIDGE_MERGE_HEAVY: {
            int step = 0;
            for (int i = 0; i < count; i++) {
                if (i % 3 == 0) {
                    data[i] = step * 4 + 1;
                } else if (i % 3 == 1) {
                    data[i] = step * 4 + 3;
                    step++;
                } else {
                    data[i] = (step - 1) * 4 + 2; // Bridge ID
                }
            }
            break;
        }
    }

    return data;
}

// Simple Sorted-Array Baseline for algorithmic comparison
typedef struct {
    Interval *items;
    int count;
    int cap;
} SortedArrayBaseline;

static void baseline_init(SortedArrayBaseline *b, int cap) {
    b->cap = cap > 16 ? cap : 16;
    b->items = (Interval*)malloc(sizeof(Interval) * b->cap);
    b->count = 0;
}

static void baseline_free(SortedArrayBaseline *b) {
    if (b->items) free(b->items);
    b->items = NULL;
    b->count = 0;
}

static void baseline_insert(SortedArrayBaseline *b, int64_t id) {
    if (b->count == 0) {
        b->items[b->count++] = interval_create(id, id);
        return;
    }

    // Binary search for position
    int low = 0, high = b->count - 1;
    int idx = b->count;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (b->items[mid].start_id > id) {
            idx = mid;
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }

    int left_idx = idx - 1;
    int right_idx = idx;

    if (left_idx >= 0 && b->items[left_idx].start_id <= id && id <= b->items[left_idx].end_id) {
        return; // Duplicate
    }

    bool can_merge_left = (left_idx >= 0 && b->items[left_idx].end_id + 1 == id);
    bool can_merge_right = (right_idx < b->count && id + 1 == b->items[right_idx].start_id);

    if (can_merge_left && can_merge_right) {
        b->items[left_idx].end_id = b->items[right_idx].end_id;
        memmove(&b->items[right_idx], &b->items[right_idx + 1], sizeof(Interval) * (b->count - right_idx - 1));
        b->count--;
    } else if (can_merge_left) {
        b->items[left_idx].end_id = id;
    } else if (can_merge_right) {
        b->items[right_idx].start_id = id;
    } else {
        if (b->count >= b->cap) {
            b->cap *= 2;
            b->items = (Interval*)realloc(b->items, sizeof(Interval) * b->cap);
        }
        memmove(&b->items[idx + 1], &b->items[idx], sizeof(Interval) * (b->count - idx));
        b->items[idx] = interval_create(id, id);
        b->count++;
    }
}

BenchmarkResult benchmark_run(ArrivalPattern pattern, int count, bool run_baseline) {
    BenchmarkResult res;
    memset(&res, 0, sizeof(res));
    res.pattern = pattern;
    res.dataset_size = count;

    int64_t *dataset = generate_dataset(pattern, count);
    if (!dataset) return res;

    AVLTree *tree = avl_create();

    // 1. Insertion timing
    double t0 = get_time_us();
    double max_single_us = 0;

    for (int i = 0; i < count; i++) {
        double s0 = get_time_us();
        arrival_process_package(tree, dataset[i]);
        double s1 = get_time_us();
        double dt = s1 - s0;
        if (dt > max_single_us) {
            max_single_us = dt;
        }
    }
    double t1 = get_time_us();

    res.total_insertion_us = t1 - t0;
    res.avg_insertion_ns = (res.total_insertion_us / count) * 1000.0;
    res.max_insertion_us = max_single_us;
    res.actual_unique_packages = (int)tree->total_unique_packages;
    res.resulting_intervals = tree->total_intervals;
    res.tree_height = avl_node_height(tree->root);
    res.total_rotations = tree->total_rotations;
    res.memory_bytes = tree->total_intervals * sizeof(AVLNode) + sizeof(AVLTree);

    // 2. Search lookup timing (1,000 random lookups)
    int lookups = count < 1000 ? count : 1000;
    double st0 = get_time_us();
    for (int i = 0; i < lookups; i++) {
        search_package(tree, dataset[i]);
    }
    double st1 = get_time_us();
    res.search_lookup_us = st1 - st0;

    // 3. Range query timing
    double rq0 = get_time_us();
    RangeQueryResult rq = search_intervals_in_range(tree, dataset[0], dataset[count - 1]);
    double rq1 = get_time_us();
    free_range_query_result(&rq);
    res.range_query_us = rq1 - rq0;

    // 4. Gap analysis timing
    double ga0 = get_time_us();
    int64_t min_id = dataset[0] < dataset[count - 1] ? dataset[0] : dataset[count - 1];
    int64_t max_id = dataset[0] > dataset[count - 1] ? dataset[0] : dataset[count - 1];
    GapAnalysisResult gaps = gap_analysis_compute(tree, min_id, max_id);
    double ga1 = get_time_us();
    free_gap_analysis_result(&gaps);
    res.gap_analysis_us = ga1 - ga0;

    // 5. Baseline Comparison (if enabled and count <= 25,000 to avoid excessive O(N^2) wait)
    if (run_baseline && count <= 25000) {
        res.has_baseline = true;
        SortedArrayBaseline baseline;
        baseline_init(&baseline, count);

        double bt0 = get_time_us();
        for (int i = 0; i < count; i++) {
            baseline_insert(&baseline, dataset[i]);
        }
        double bt1 = get_time_us();

        res.baseline_insertion_us = bt1 - bt0;
        res.speedup_factor = (res.total_insertion_us > 0) ? (res.baseline_insertion_us / res.total_insertion_us) : 1.0;
        baseline_free(&baseline);
    }

    avl_destroy(tree);
    free(dataset);
    return res;
}

char* benchmark_result_to_json(const BenchmarkResult *res) {
    char *buf = (char*)malloc(1024);
    if (!buf) return NULL;

    snprintf(buf, 1024,
        "{"
        "\"pattern_id\":%d,"
        "\"pattern_name\":\"%s\","
        "\"dataset_size\":%d,"
        "\"actual_unique_packages\":%d,"
        "\"resulting_intervals\":%d,"
        "\"tree_height\":%d,"
        "\"total_rotations\":%llu,"
        "\"total_insertion_us\":%.2f,"
        "\"avg_insertion_ns\":%.2f,"
        "\"max_insertion_us\":%.2f,"
        "\"search_lookup_us\":%.2f,"
        "\"range_query_us\":%.2f,"
        "\"gap_analysis_us\":%.2f,"
        "\"memory_bytes\":%zu,"
        "\"has_baseline\":%s,"
        "\"baseline_insertion_us\":%.2f,"
        "\"speedup_factor\":%.2f"
        "}",
        res->pattern,
        benchmark_pattern_name(res->pattern),
        res->dataset_size,
        res->actual_unique_packages,
        res->resulting_intervals,
        res->tree_height,
        (unsigned long long)res->total_rotations,
        res->total_insertion_us,
        res->avg_insertion_ns,
        res->max_insertion_us,
        res->search_lookup_us,
        res->range_query_us,
        res->gap_analysis_us,
        res->memory_bytes,
        res->has_baseline ? "true" : "false",
        res->baseline_insertion_us,
        res->speedup_factor
    );

    return buf;
}
