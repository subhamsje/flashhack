#ifndef GAP_ANALYSIS_H
#define GAP_ANALYSIS_H

#include "avl_tree.h"
#include <stdint.h>
#include <stdbool.h>

typedef struct {
    Interval *gaps;
    int count;
    int64_t total_missing_ids;
    Interval largest_gap;
    int64_t largest_gap_size;
    Interval smallest_gap;
    int64_t smallest_gap_size;
    double average_gap_size;
    double coverage_percentage;
    int64_t query_l;
    int64_t query_r;
} GapAnalysisResult;

// Gap Computation
GapAnalysisResult gap_analysis_compute(const AVLTree *tree, int64_t l, int64_t r);
void free_gap_analysis_result(GapAnalysisResult *result);

// Gap Filtering & Sorting
void gap_sort_by_size(Interval *gaps, int count, bool descending);
int gap_filter_by_size(const Interval *gaps, int count, int64_t min_size, int64_t max_size, Interval *out_gaps, int max_capacity);

// Comprehensive Text Gap Report
char* gap_generate_report(const AVLTree *tree, int64_t l, int64_t r);

#endif // GAP_ANALYSIS_H
