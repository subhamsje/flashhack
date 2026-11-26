#ifndef SEARCH_H
#define SEARCH_H

#include "avl_tree.h"
#include <stdint.h>
#include <stdbool.h>

typedef struct {
    bool found;
    Interval containing_interval;
} LookupResult;

typedef struct {
    bool has_lower;
    int64_t lower_id;
    bool has_higher;
    int64_t higher_id;
    bool has_closest;
    int64_t closest_id;
    int64_t distance;
} ProximityResult;

typedef struct {
    Interval *intervals;
    int count;
    int64_t total_packages;
} RangeQueryResult;

// Individual package queries
LookupResult search_package(const AVLTree *tree, int64_t package_id);
ProximityResult search_proximity(const AVLTree *tree, int64_t package_id);

// Predecessor / Successor intervals
bool search_predecessor_interval(const AVLTree *tree, int64_t package_id, Interval *out_interval);
bool search_successor_interval(const AVLTree *tree, int64_t package_id, Interval *out_interval);

// Range queries
RangeQueryResult search_intervals_in_range(const AVLTree *tree, int64_t query_min, int64_t query_max);
void free_range_query_result(RangeQueryResult *result);

int64_t count_received_in_range(const AVLTree *tree, int64_t query_min, int64_t query_max);
int64_t count_missing_in_range(const AVLTree *tree, int64_t query_min, int64_t query_max);

// Extremum intervals
bool search_largest_interval(const AVLTree *tree, Interval *out_interval);
bool search_smallest_interval(const AVLTree *tree, Interval *out_interval);

#endif // SEARCH_H
