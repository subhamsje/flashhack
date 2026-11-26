#include "search.h"
#include <stdlib.h>
#include <string.h>
#include <limits.h>

LookupResult search_package(const AVLTree *tree, int64_t package_id) {
    LookupResult res;
    res.found = false;
    res.containing_interval = interval_create(-1, -1);

    if (!tree) return res;

    AVLNode *node = avl_find_containing(tree, package_id);
    if (node) {
        res.found = true;
        res.containing_interval = interval_create(node->start_id, node->end_id);
    }
    return res;
}

ProximityResult search_proximity(const AVLTree *tree, int64_t package_id) {
    ProximityResult res;
    memset(&res, 0, sizeof(res));
    res.distance = -1;

    if (!tree || !tree->root) return res;

    // Check if package is already contained
    AVLNode *cont = avl_find_containing(tree, package_id);
    if (cont) {
        res.has_closest = true;
        res.closest_id = package_id;
        res.distance = 0;
        res.has_lower = (package_id > cont->start_id);
        res.lower_id = res.has_lower ? (package_id - 1) : -1;
        res.has_higher = (package_id < cont->end_id);
        res.higher_id = res.has_higher ? (package_id + 1) : -1;

        if (!res.has_lower) {
            AVLNode *pred = avl_predecessor_of_id(tree, package_id);
            if (pred) {
                res.has_lower = true;
                res.lower_id = pred->end_id;
            }
        }
        if (!res.has_higher) {
            AVLNode *succ = avl_successor_of_id(tree, package_id);
            if (succ) {
                res.has_higher = true;
                res.higher_id = succ->start_id;
            }
        }
        return res;
    }

    AVLNode *pred = avl_predecessor_of_id(tree, package_id);
    AVLNode *succ = avl_successor_of_id(tree, package_id);

    if (pred) {
        res.has_lower = true;
        res.lower_id = pred->end_id;
    }
    if (succ) {
        res.has_higher = true;
        res.higher_id = succ->start_id;
    }

    if (res.has_lower && res.has_higher) {
        int64_t dist_lower = package_id - res.lower_id;
        int64_t dist_higher = res.higher_id - package_id;
        if (dist_lower <= dist_higher) {
            res.has_closest = true;
            res.closest_id = res.lower_id;
            res.distance = dist_lower;
        } else {
            res.has_closest = true;
            res.closest_id = res.higher_id;
            res.distance = dist_higher;
        }
    } else if (res.has_lower) {
        res.has_closest = true;
        res.closest_id = res.lower_id;
        res.distance = package_id - res.lower_id;
    } else if (res.has_higher) {
        res.has_closest = true;
        res.closest_id = res.higher_id;
        res.distance = res.higher_id - package_id;
    }

    return res;
}

bool search_predecessor_interval(const AVLTree *tree, int64_t package_id, Interval *out_interval) {
    if (!tree || !out_interval) return false;
    AVLNode *pred = avl_predecessor_of_id(tree, package_id);
    if (pred) {
        *out_interval = interval_create(pred->start_id, pred->end_id);
        return true;
    }
    return false;
}

bool search_successor_interval(const AVLTree *tree, int64_t package_id, Interval *out_interval) {
    if (!tree || !out_interval) return false;
    AVLNode *succ = avl_successor_of_id(tree, package_id);
    if (succ) {
        *out_interval = interval_create(succ->start_id, succ->end_id);
        return true;
    }
    return false;
}

static void collect_range(const AVLNode *node, int64_t qmin, int64_t qmax,
                          Interval **arr, int *count, int *cap, int64_t *total_pkgs) {
    if (!node) return;

    if (node->left && node->start_id >= qmin) {
        collect_range(node->left, qmin, qmax, arr, count, cap, total_pkgs);
    }

    // Check intersection with [qmin, qmax]
    if (!(node->end_id < qmin || node->start_id > qmax)) {
        int64_t clip_start = (node->start_id > qmin) ? node->start_id : qmin;
        int64_t clip_end = (node->end_id < qmax) ? node->end_id : qmax;
        if (clip_start <= clip_end) {
            if (*count >= *cap) {
                *cap = (*cap == 0) ? 16 : (*cap * 2);
                *arr = (Interval*)realloc(*arr, sizeof(Interval) * (*cap));
            }
            (*arr)[*count] = interval_create(clip_start, clip_end);
            (*count)++;
            *total_pkgs += (clip_end - clip_start + 1);
        }
    }

    if (node->right && node->end_id <= qmax) {
        collect_range(node->right, qmin, qmax, arr, count, cap, total_pkgs);
    }
}

RangeQueryResult search_intervals_in_range(const AVLTree *tree, int64_t query_min, int64_t query_max) {
    RangeQueryResult res;
    res.intervals = NULL;
    res.count = 0;
    res.total_packages = 0;

    if (!tree || query_min > query_max) return res;

    int cap = 16;
    res.intervals = (Interval*)malloc(sizeof(Interval) * cap);
    collect_range(tree->root, query_min, query_max, &res.intervals, &res.count, &cap, &res.total_packages);

    return res;
}

void free_range_query_result(RangeQueryResult *result) {
    if (result && result->intervals) {
        free(result->intervals);
        result->intervals = NULL;
        result->count = 0;
        result->total_packages = 0;
    }
}

int64_t count_received_in_range(const AVLTree *tree, int64_t query_min, int64_t query_max) {
    if (!tree || query_min > query_max) return 0;
    RangeQueryResult res = search_intervals_in_range(tree, query_min, query_max);
    int64_t total = res.total_packages;
    free_range_query_result(&res);
    return total;
}

int64_t count_missing_in_range(const AVLTree *tree, int64_t query_min, int64_t query_max) {
    if (query_min > query_max) return 0;
    int64_t total_span = query_max - query_min + 1;
    int64_t received = count_received_in_range(tree, query_min, query_max);
    return total_span - received;
}

static void find_extremes(const AVLNode *node, Interval *largest, int64_t *max_sz,
                          Interval *smallest, int64_t *min_sz) {
    if (!node) return;
    int64_t sz = node->end_id - node->start_id + 1;
    if (sz > *max_sz) {
        *max_sz = sz;
        *largest = interval_create(node->start_id, node->end_id);
    }
    if (sz < *min_sz) {
        *min_sz = sz;
        *smallest = interval_create(node->start_id, node->end_id);
    }
    find_extremes(node->left, largest, max_sz, smallest, min_sz);
    find_extremes(node->right, largest, max_sz, smallest, min_sz);
}

bool search_largest_interval(const AVLTree *tree, Interval *out_interval) {
    if (!tree || !tree->root || !out_interval) return false;
    Interval largest = interval_create(0, 0);
    Interval smallest = interval_create(0, 0);
    int64_t max_sz = -1;
    int64_t min_sz = INT64_MAX;
    find_extremes(tree->root, &largest, &max_sz, &smallest, &min_sz);
    if (max_sz > 0) {
        *out_interval = largest;
        return true;
    }
    return false;
}

bool search_smallest_interval(const AVLTree *tree, Interval *out_interval) {
    if (!tree || !tree->root || !out_interval) return false;
    Interval largest = interval_create(0, 0);
    Interval smallest = interval_create(0, 0);
    int64_t max_sz = -1;
    int64_t min_sz = INT64_MAX;
    find_extremes(tree->root, &largest, &max_sz, &smallest, &min_sz);
    if (min_sz < INT64_MAX) {
        *out_interval = smallest;
        return true;
    }
    return false;
}
