#include "test_common.h"
#include <stdio.h>
#include <time.h>

extern bool test_avl_rotations_and_balancing(void);
extern bool test_avl_predecessor_successor(void);
extern bool test_interval_insertion_and_extension(void);
extern bool test_gap_analysis_and_coverage(void);
extern bool test_bridge_merge_basic(void);
extern bool test_bridge_merge_multi_alternating(void);
extern bool test_sparse_and_large_boundaries(void);
extern bool test_randomized_against_reference(void);
extern bool test_large_scale_50k_unique_ids(void);

int main(void) {
    printf("====================================================================\n");
    printf("     LIVE ARRIVAL INDEX - AUTOMATED C ENGINE TEST SUITE             \n");
    printf("====================================================================\n");

    TestReport report;
    memset(&report, 0, sizeof(report));

    clock_t start = clock();

    RUN_TEST(test_avl_rotations_and_balancing, report);
    RUN_TEST(test_avl_predecessor_successor, report);
    RUN_TEST(test_interval_insertion_and_extension, report);
    RUN_TEST(test_gap_analysis_and_coverage, report);
    RUN_TEST(test_bridge_merge_basic, report);
    RUN_TEST(test_bridge_merge_multi_alternating, report);
    RUN_TEST(test_sparse_and_large_boundaries, report);
    RUN_TEST(test_randomized_against_reference, report);
    RUN_TEST(test_large_scale_50k_unique_ids, report);

    clock_t end = clock();
    report.elapsed_ms = ((double)(end - start) / CLOCKS_PER_SEC) * 1000.0;

    printf("====================================================================\n");
    printf("TEST RESULTS: %d/%d PASSED (Failed: %d) in %.2f ms\n",
           report.passed_tests, report.total_tests, report.failed_tests, report.elapsed_ms);
    printf("====================================================================\n");

    return (report.failed_tests == 0) ? 0 : 1;
}
