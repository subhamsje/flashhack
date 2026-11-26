#include "storage.h"
#include "gap_analysis.h"
#include <stdio.h>
#include <stdlib.h>

bool storage_export_intervals_csv(const AVLTree *tree, const char *filepath) {
    if (!tree || !filepath) return false;

    FILE *fp = fopen(filepath, "w");
    if (!fp) return false;

    fprintf(fp, "interval_index,start_id,end_id,size\n");

    Interval *intervals = NULL;
    int count = avl_get_all_intervals(tree, &intervals);

    for (int i = 0; i < count; i++) {
        fprintf(fp, "%d,%lld,%lld,%lld\n",
                i + 1,
                (long long)intervals[i].start_id,
                (long long)intervals[i].end_id,
                (long long)interval_size(intervals[i]));
    }

    if (intervals) free(intervals);
    fclose(fp);
    return true;
}

bool storage_export_gaps_csv(const AVLTree *tree, int64_t l, int64_t r, const char *filepath) {
    if (!tree || !filepath || l > r) return false;

    FILE *fp = fopen(filepath, "w");
    if (!fp) return false;

    fprintf(fp, "gap_index,start_id,end_id,missing_count\n");

    GapAnalysisResult gaps = gap_analysis_compute(tree, l, r);
    for (int i = 0; i < gaps.count; i++) {
        fprintf(fp, "%d,%lld,%lld,%lld\n",
                i + 1,
                (long long)gaps.gaps[i].start_id,
                (long long)gaps.gaps[i].end_id,
                (long long)interval_size(gaps.gaps[i]));
    }

    free_gap_analysis_result(&gaps);
    fclose(fp);
    return true;
}

bool storage_export_history_csv(const ArrivalHistory *hist, const char *filepath) {
    if (!hist || !filepath) return false;

    FILE *fp = fopen(filepath, "w");
    if (!fp) return false;

    fprintf(fp, "seq,package_id,timestamp,op_type,is_duplicate,merge_occurred,intervals_before,intervals_after,unique_before,unique_after,details\n");

    for (int i = 0; i < hist->count; i++) {
        const HistoryEntry *e = &hist->entries[i];
        fprintf(fp, "%llu,%lld,%lld,%s,%s,%s,%d,%d,%lld,%lld,\"%s\"\n",
                (unsigned long long)e->sequence_id,
                (long long)e->package_id,
                (long long)e->timestamp,
                operation_type_to_string(e->op_type),
                e->is_duplicate ? "true" : "false",
                e->merge_occurred ? "true" : "false",
                e->intervals_before, e->intervals_after,
                (long long)e->unique_packages_before, (long long)e->unique_packages_after,
                e->details);
    }

    fclose(fp);
    return true;
}

bool storage_export_analytics_csv(const WarehouseAnalytics *a, const char *filepath) {
    if (!a || !filepath) return false;

    FILE *fp = fopen(filepath, "w");
    if (!fp) return false;

    fprintf(fp, "metric,value\n");
    fprintf(fp, "total_arrival_attempts,%lld\n", (long long)a->total_arrival_attempts);
    fprintf(fp, "total_unique_packages,%lld\n", (long long)a->total_unique_packages);
    fprintf(fp, "duplicate_count,%lld\n", (long long)a->duplicate_count);
    fprintf(fp, "total_intervals,%d\n", a->total_intervals);
    fprintf(fp, "tree_height,%d\n", a->tree_height);
    fprintf(fp, "total_rotations,%llu\n", (unsigned long long)a->total_rotations);
    fprintf(fp, "rotations_ll,%llu\n", (unsigned long long)a->count_ll);
    fprintf(fp, "rotations_rr,%llu\n", (unsigned long long)a->count_rr);
    fprintf(fp, "rotations_lr,%llu\n", (unsigned long long)a->count_lr);
    fprintf(fp, "rotations_rl,%llu\n", (unsigned long long)a->count_rl);
    fprintf(fp, "largest_interval_size,%lld\n", (long long)a->largest_interval_size);
    fprintf(fp, "smallest_interval_size,%lld\n", (long long)a->smallest_interval_size);
    fprintf(fp, "average_interval_size,%.2f\n", a->average_interval_size);
    fprintf(fp, "isolated_package_count,%d\n", a->isolated_package_count);
    fprintf(fp, "total_gaps,%d\n", a->total_gaps);
    fprintf(fp, "largest_gap_size,%lld\n", (long long)a->largest_gap_size);
    fprintf(fp, "average_gap_size,%.2f\n", a->average_gap_size);
    fprintf(fp, "global_coverage_percentage,%.2f\n", a->global_coverage_percentage);

    fclose(fp);
    return true;
}
