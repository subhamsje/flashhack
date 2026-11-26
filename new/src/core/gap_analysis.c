#include "gap_analysis.h"
#include "search.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

GapAnalysisResult gap_analysis_compute(const AVLTree *tree, int64_t l, int64_t r) {
    GapAnalysisResult res;
    memset(&res, 0, sizeof(res));
    res.query_l = l;
    res.query_r = r;
    res.largest_gap_size = 0;
    res.smallest_gap_size = INT64_MAX;

    if (!tree || l > r || l < 0) {
        res.smallest_gap_size = 0;
        return res;
    }

    int64_t total_span = r - l + 1;
    RangeQueryResult received = search_intervals_in_range(tree, l, r);

    if (received.count == 0) {
        // The entire range is missing
        res.count = 1;
        res.gaps = (Interval*)malloc(sizeof(Interval));
        res.gaps[0] = interval_create(l, r);
        res.total_missing_ids = total_span;
        res.largest_gap = res.gaps[0];
        res.largest_gap_size = total_span;
        res.smallest_gap = res.gaps[0];
        res.smallest_gap_size = total_span;
        res.average_gap_size = (double)total_span;
        res.coverage_percentage = 0.0;
        free_range_query_result(&received);
        return res;
    }

    int cap = received.count + 2;
    res.gaps = (Interval*)malloc(sizeof(Interval) * cap);
    int gap_count = 0;
    int64_t curr = l;

    for (int i = 0; i < received.count; i++) {
        int64_t s = received.intervals[i].start_id;
        int64_t e = received.intervals[i].end_id;

        if (curr < s) {
            Interval gap = interval_create(curr, s - 1);
            int64_t gsz = interval_size(gap);
            res.gaps[gap_count++] = gap;
            res.total_missing_ids += gsz;
            if (gsz > res.largest_gap_size) {
                res.largest_gap_size = gsz;
                res.largest_gap = gap;
            }
            if (gsz < res.smallest_gap_size) {
                res.smallest_gap_size = gsz;
                res.smallest_gap = gap;
            }
        }
        curr = e + 1;
    }

    if (curr <= r) {
        Interval gap = interval_create(curr, r);
        int64_t gsz = interval_size(gap);
        res.gaps[gap_count++] = gap;
        res.total_missing_ids += gsz;
        if (gsz > res.largest_gap_size) {
            res.largest_gap_size = gsz;
            res.largest_gap = gap;
        }
        if (gsz < res.smallest_gap_size) {
            res.smallest_gap_size = gsz;
            res.smallest_gap = gap;
        }
    }

    res.count = gap_count;
    if (res.smallest_gap_size == INT64_MAX) {
        res.smallest_gap_size = 0;
    }
    res.average_gap_size = (gap_count > 0) ? ((double)res.total_missing_ids / gap_count) : 0.0;
    int64_t received_ids = total_span - res.total_missing_ids;
    res.coverage_percentage = (total_span > 0) ? (((double)received_ids / total_span) * 100.0) : 0.0;

    free_range_query_result(&received);
    return res;
}

void free_gap_analysis_result(GapAnalysisResult *result) {
    if (result && result->gaps) {
        free(result->gaps);
        result->gaps = NULL;
        result->count = 0;
    }
}

static int compare_gaps_desc(const void *a, const void *b) {
    int64_t sz_a = interval_size(*(const Interval*)a);
    int64_t sz_b = interval_size(*(const Interval*)b);
    if (sz_a > sz_b) return -1;
    if (sz_a < sz_b) return 1;
    return 0;
}

static int compare_gaps_asc(const void *a, const void *b) {
    int64_t sz_a = interval_size(*(const Interval*)a);
    int64_t sz_b = interval_size(*(const Interval*)b);
    if (sz_a < sz_b) return -1;
    if (sz_a > sz_b) return 1;
    return 0;
}

void gap_sort_by_size(Interval *gaps, int count, bool descending) {
    if (!gaps || count <= 1) return;
    if (descending) {
        qsort(gaps, count, sizeof(Interval), compare_gaps_desc);
    } else {
        qsort(gaps, count, sizeof(Interval), compare_gaps_asc);
    }
}

int gap_filter_by_size(const Interval *gaps, int count, int64_t min_size, int64_t max_size,
                       Interval *out_gaps, int max_capacity) {
    if (!gaps || !out_gaps || count <= 0 || max_capacity <= 0) return 0;
    int written = 0;
    for (int i = 0; i < count && written < max_capacity; i++) {
        int64_t sz = interval_size(gaps[i]);
        if (sz >= min_size && sz <= max_size) {
            out_gaps[written++] = gaps[i];
        }
    }
    return written;
}

char* gap_generate_report(const AVLTree *tree, int64_t l, int64_t r) {
    GapAnalysisResult gaps = gap_analysis_compute(tree, l, r);
    int64_t total_span = (r >= l) ? (r - l + 1) : 0;
    int64_t received_ids = total_span - gaps.total_missing_ids;

    size_t cap = 4096 + (gaps.count * 128);
    char *report = (char*)malloc(cap);
    if (!report) {
        free_gap_analysis_result(&gaps);
        return NULL;
    }

    int offset = snprintf(report, cap,
        "================================================================================\n"
        "                  WAREHOUSE LIVE ARRIVAL GAP ANALYSIS REPORT                    \n"
        "================================================================================\n"
        "Target Query Range      : [%lld, %lld] (Total Span: %lld package IDs)\n"
        "Total Received IDs      : %lld\n"
        "Total Missing IDs       : %lld\n"
        "Arrival Coverage        : %.2f%%\n"
        "Total Disjoint Gaps     : %d\n"
        "Largest Missing Range   : [%lld, %lld] (%lld packages)\n"
        "Smallest Missing Range  : [%lld, %lld] (%lld packages)\n"
        "Average Gap Magnitude   : %.2f packages\n"
        "--------------------------------------------------------------------------------\n"
        "DETAILED GAP BREAKDOWN (First 25 Gaps):\n"
        "--------------------------------------------------------------------------------\n"
        "%-6s %-25s %-15s %-15s\n",
        (long long)l, (long long)r, (long long)total_span,
        (long long)received_ids, (long long)gaps.total_missing_ids,
        gaps.coverage_percentage, gaps.count,
        (long long)gaps.largest_gap.start_id, (long long)gaps.largest_gap.end_id, (long long)gaps.largest_gap_size,
        (long long)gaps.smallest_gap.start_id, (long long)gaps.smallest_gap.end_id, (long long)gaps.smallest_gap_size,
        gaps.average_gap_size,
        "Index", "Range [Start, End]", "Missing Count", "% of Total Missing");

    int display_count = gaps.count < 25 ? gaps.count : 25;
    for (int i = 0; i < display_count; i++) {
        int64_t gsz = interval_size(gaps.gaps[i]);
        double pct = gaps.total_missing_ids > 0 ? ((double)gsz / gaps.total_missing_ids * 100.0) : 0.0;
        char range_str[64];
        snprintf(range_str, sizeof(range_str), "[%lld, %lld]",
                 (long long)gaps.gaps[i].start_id, (long long)gaps.gaps[i].end_id);
        offset += snprintf(report + offset, cap - offset,
                           "%-6d %-25s %-15lld %-15.2f%%\n",
                           i + 1, range_str, (long long)gsz, pct);
    }

    if (gaps.count > 25) {
        offset += snprintf(report + offset, cap - offset,
                           "... and %d additional missing gaps omitted from summary view.\n",
                           gaps.count - 25);
    }

    offset += snprintf(report + offset, cap - offset,
        "--------------------------------------------------------------------------------\n"
        "OPERATIONAL RECOMMENDATION:\n");

    if (gaps.coverage_percentage >= 99.0) {
        offset += snprintf(report + offset, cap - offset,
            "STATUS: EXCELLENT. Warehouse intake is near complete. Minimal broken ranges.\n");
    } else if (gaps.coverage_percentage >= 75.0) {
        offset += snprintf(report + offset, cap - offset,
            "STATUS: MODERATE. Significant consecutive arrival, but isolated batches pending.\n");
    } else {
        offset += snprintf(report + offset, cap - offset,
            "STATUS: HIGH LATENCY. Large package spans missing. Investigate incoming courier trucks.\n");
    }
    snprintf(report + offset, cap - offset,
        "================================================================================\n");

    free_gap_analysis_result(&gaps);
    return report;
}
