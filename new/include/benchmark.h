#ifndef BENCHMARK_H
#define BENCHMARK_H

#include <stdint.h>
#include <stdbool.h>

typedef enum {
    PATTERN_SEQUENTIAL = 0,
    PATTERN_REVERSE,
    PATTERN_RANDOM,
    PATTERN_SPARSE,
    PATTERN_DUPLICATE_HEAVY,
    PATTERN_ALTERNATING,
    PATTERN_BRIDGE_MERGE_HEAVY
} ArrivalPattern;

const char* benchmark_pattern_name(ArrivalPattern pattern);

typedef struct {
    ArrivalPattern pattern;
    int dataset_size;
    int actual_unique_packages;
    int resulting_intervals;
    int tree_height;
    uint64_t total_rotations;

    // High resolution timings (microseconds)
    double total_insertion_us;
    double avg_insertion_ns;
    double max_insertion_us;
    double search_lookup_us;
    double range_query_us;
    double gap_analysis_us;

    // Memory (bytes)
    size_t memory_bytes;

    // Baseline comparison (sorted array)
    bool has_baseline;
    double baseline_insertion_us;
    double speedup_factor;
} BenchmarkResult;

BenchmarkResult benchmark_run(ArrivalPattern pattern, int count, bool run_baseline);

char* benchmark_result_to_json(const BenchmarkResult *res);

#endif // BENCHMARK_H
