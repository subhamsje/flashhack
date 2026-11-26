#ifndef ANALYTICS_H
#define ANALYTICS_H

#include "avl_tree.h"
#include <stdint.h>
#include <stdbool.h>

typedef struct {
    int64_t total_arrival_attempts;
    int64_t total_unique_packages;
    int64_t duplicate_count;
    int total_intervals;

    Interval largest_interval;
    int64_t largest_interval_size;

    Interval smallest_interval;
    int64_t smallest_interval_size;

    double average_interval_size;
    int isolated_package_count; // intervals where start == end

    int total_gaps;
    Interval largest_gap;
    int64_t largest_gap_size;
    double average_gap_size;

    // Operation counters
    int64_t new_interval_count;
    int64_t extend_count;
    int64_t merge_count;

    // AVL Tree Metrics
    int tree_height;
    uint64_t total_rotations;
    uint64_t count_ll;
    uint64_t count_rr;
    uint64_t count_lr;
    uint64_t count_rl;

    // Bounded coverage for global span [min_id, max_id]
    int64_t global_min_id;
    int64_t global_max_id;
    double global_coverage_percentage;
} WarehouseAnalytics;

WarehouseAnalytics analytics_calculate(const AVLTree *tree, int64_t arrival_attempts, 
                                      int64_t duplicates, int64_t new_intervals, 
                                      int64_t extensions, int64_t merges);

char* analytics_to_json(const WarehouseAnalytics *analytics);

#endif // ANALYTICS_H
