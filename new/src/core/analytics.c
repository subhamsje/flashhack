#include "analytics.h"
#include "search.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>

WarehouseAnalytics analytics_calculate(const AVLTree *tree, int64_t arrival_attempts,
                                      int64_t duplicates, int64_t new_intervals,
                                      int64_t extensions, int64_t merges) {
    WarehouseAnalytics a;
    memset(&a, 0, sizeof(a));

    a.total_arrival_attempts = arrival_attempts;
    a.duplicate_count = duplicates;
    a.new_interval_count = new_intervals;
    a.extend_count = extensions;
    a.merge_count = merges;

    if (!tree || !tree->root) {
        return a;
    }

    a.total_unique_packages = tree->total_unique_packages;
    a.total_intervals = tree->total_intervals;
    a.tree_height = avl_node_height(tree->root);
    a.total_rotations = tree->total_rotations;
    a.count_ll = tree->count_ll;
    a.count_rr = tree->count_rr;
    a.count_lr = tree->count_lr;
    a.count_rl = tree->count_rl;

    // Retrieve all intervals in sorted order
    Interval *intervals = NULL;
    int count = avl_get_all_intervals(tree, &intervals);
    if (count > 0 && intervals) {
        a.global_min_id = intervals[0].start_id;
        a.global_max_id = intervals[count - 1].end_id;

        a.largest_interval_size = 0;
        a.smallest_interval_size = INT64_MAX;

        int64_t total_sz = 0;
        int isolated = 0;

        for (int i = 0; i < count; i++) {
            int64_t sz = interval_size(intervals[i]);
            total_sz += sz;
            if (sz == 1) isolated++;
            if (sz > a.largest_interval_size) {
                a.largest_interval_size = sz;
                a.largest_interval = intervals[i];
            }
            if (sz < a.smallest_interval_size) {
                a.smallest_interval_size = sz;
                a.smallest_interval = intervals[i];
            }
        }

        a.isolated_package_count = isolated;
        a.average_interval_size = (count > 0) ? ((double)total_sz / count) : 0.0;

        // Internal gaps between consecutive intervals
        if (count > 1) {
            a.total_gaps = count - 1;
            int64_t sum_gaps = 0;
            a.largest_gap_size = 0;

            for (int i = 0; i < count - 1; i++) {
                int64_t gap_start = intervals[i].end_id + 1;
                int64_t gap_end = intervals[i + 1].start_id - 1;
                if (gap_start <= gap_end) {
                    int64_t gsz = gap_end - gap_start + 1;
                    sum_gaps += gsz;
                    if (gsz > a.largest_gap_size) {
                        a.largest_gap_size = gsz;
                        a.largest_gap = interval_create(gap_start, gap_end);
                    }
                }
            }
            a.average_gap_size = (a.total_gaps > 0) ? ((double)sum_gaps / a.total_gaps) : 0.0;
        }

        int64_t global_span = a.global_max_id - a.global_min_id + 1;
        a.global_coverage_percentage = (global_span > 0) ?
            (((double)a.total_unique_packages / global_span) * 100.0) : 100.0;

        free(intervals);
    }

    return a;
}

char* analytics_to_json(const WarehouseAnalytics *a) {
    char *buf = (char*)malloc(2048);
    if (!buf) return NULL;

    snprintf(buf, 2048,
        "{"
        "\"total_arrival_attempts\":%lld,"
        "\"total_unique_packages\":%lld,"
        "\"duplicate_count\":%lld,"
        "\"total_intervals\":%d,"
        "\"tree_height\":%d,"
        "\"total_rotations\":%llu,"
        "\"rotations\":{\"ll\":%llu,\"rr\":%llu,\"lr\":%llu,\"rl\":%llu},"
        "\"largest_interval\":{\"start\":%lld,\"end\":%lld,\"size\":%lld},"
        "\"smallest_interval\":{\"start\":%lld,\"end\":%lld,\"size\":%lld},"
        "\"average_interval_size\":%.2f,"
        "\"isolated_package_count\":%d,"
        "\"total_gaps\":%d,"
        "\"largest_gap\":{\"start\":%lld,\"end\":%lld,\"size\":%lld},"
        "\"average_gap_size\":%.2f,"
        "\"operations\":{\"new\":%lld,\"extend\":%lld,\"merge\":%lld},"
        "\"global_min_id\":%lld,"
        "\"global_max_id\":%lld,"
        "\"global_coverage_percentage\":%.2f"
        "}",
        (long long)a->total_arrival_attempts,
        (long long)a->total_unique_packages,
        (long long)a->duplicate_count,
        a->total_intervals,
        a->tree_height,
        (unsigned long long)a->total_rotations,
        (unsigned long long)a->count_ll,
        (unsigned long long)a->count_rr,
        (unsigned long long)a->count_lr,
        (unsigned long long)a->count_rl,
        (long long)a->largest_interval.start_id, (long long)a->largest_interval.end_id, (long long)a->largest_interval_size,
        (long long)a->smallest_interval.start_id, (long long)a->smallest_interval.end_id, (long long)a->smallest_interval_size,
        a->average_interval_size,
        a->isolated_package_count,
        a->total_gaps,
        (long long)a->largest_gap.start_id, (long long)a->largest_gap.end_id, (long long)a->largest_gap_size,
        a->average_gap_size,
        (long long)a->new_interval_count,
        (long long)a->extend_count,
        (long long)a->merge_count,
        (long long)a->global_min_id,
        (long long)a->global_max_id,
        a->global_coverage_percentage
    );

    return buf;
}
