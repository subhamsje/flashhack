#include "test_common.h"
#include "avl_tree.h"
#include "insertion.h"
#include "search.h"
#include "gap_analysis.h"

bool test_interval_insertion_and_extension(void) {
    AVLTree *tree = avl_create();

    // 1. Insert first ID: 10
    OperationResult res = arrival_process_package(tree, 10);
    ASSERT_EQ_INT(res.type, OP_NEW_INTERVAL, "First arrival should create new interval");
    ASSERT_EQ_INT(tree->total_intervals, 1, "Interval count should be 1");
    ASSERT_EQ_INT(tree->total_unique_packages, 1, "Unique package count should be 1");
    ASSERT_TRUE(avl_validate_invariants(tree).is_valid, "Tree invariants invalid");

    // 2. Extend right: 11
    res = arrival_process_package(tree, 11);
    ASSERT_EQ_INT(res.type, OP_EXTEND_LEFT, "11 should extend left interval [10]");
    ASSERT_EQ_INT(tree->total_intervals, 1, "Interval count should stay 1");
    ASSERT_EQ_INT(tree->total_unique_packages, 2, "Unique package count should be 2");
    ASSERT_TRUE(avl_validate_invariants(tree).is_valid, "Tree invariants invalid");

    // 3. Extend left: 9
    res = arrival_process_package(tree, 9);
    ASSERT_EQ_INT(res.type, OP_EXTEND_RIGHT, "9 should extend right interval [10, 11]");
    ASSERT_EQ_INT(tree->total_intervals, 1, "Interval count should stay 1");
    ASSERT_EQ_INT(tree->total_unique_packages, 3, "Unique package count should be 3");
    ASSERT_TRUE(avl_validate_invariants(tree).is_valid, "Tree invariants invalid");

    // Interval is now [9, 11]
    LookupResult lkup = search_package(tree, 10);
    ASSERT_TRUE(lkup.found, "Package 10 should be found");
    ASSERT_EQ_INT(lkup.containing_interval.start_id, 9, "Start should be 9");
    ASSERT_EQ_INT(lkup.containing_interval.end_id, 11, "End should be 11");

    // 4. Duplicate insertion: insert 10 again
    res = arrival_process_package(tree, 10);
    ASSERT_EQ_INT(res.type, OP_DUPLICATE, "10 should be detected as duplicate");
    ASSERT_TRUE(res.is_duplicate, "is_duplicate flag should be true");
    ASSERT_EQ_INT(tree->total_intervals, 1, "Interval count must not change on duplicate");
    ASSERT_EQ_INT(tree->total_unique_packages, 3, "Unique packages must not change on duplicate");
    ASSERT_TRUE(avl_validate_invariants(tree).is_valid, "Tree invariants invalid");

    // 5. Isolated interval: 20
    res = arrival_process_package(tree, 20);
    ASSERT_EQ_INT(res.type, OP_NEW_INTERVAL, "20 should create new interval");
    ASSERT_EQ_INT(tree->total_intervals, 2, "Interval count should be 2");
    ASSERT_EQ_INT(tree->total_unique_packages, 4, "Unique packages should be 4");
    ASSERT_TRUE(avl_validate_invariants(tree).is_valid, "Tree invariants invalid");

    avl_destroy(tree);
    return true;
}

bool test_gap_analysis_and_coverage(void) {
    AVLTree *tree = avl_create();
    // Intervals: [1, 3] and [7, 10]
    arrival_process_package(tree, 1);
    arrival_process_package(tree, 2);
    arrival_process_package(tree, 3);
    arrival_process_package(tree, 7);
    arrival_process_package(tree, 8);
    arrival_process_package(tree, 9);
    arrival_process_package(tree, 10);

    // Gaps in [1, 10]: should be [4, 6] (size 3)
    GapAnalysisResult gaps = gap_analysis_compute(tree, 1, 10);
    ASSERT_EQ_INT(gaps.count, 1, "Should have exactly 1 gap in [1, 10]");
    ASSERT_EQ_INT(gaps.gaps[0].start_id, 4, "Gap start should be 4");
    ASSERT_EQ_INT(gaps.gaps[0].end_id, 6, "Gap end should be 6");
    ASSERT_EQ_INT(gaps.total_missing_ids, 3, "Total missing IDs should be 3");
    // Received: 7, total: 10 => coverage 70%
    ASSERT_TRUE(gaps.coverage_percentage >= 69.9 && gaps.coverage_percentage <= 70.1, "Coverage should be 70%");
    free_gap_analysis_result(&gaps);

    // Gaps in [0, 15]: should have [0, 0], [4, 6], [11, 15]
    gaps = gap_analysis_compute(tree, 0, 15);
    ASSERT_EQ_INT(gaps.count, 3, "Should have 3 gaps in [0, 15]");
    ASSERT_EQ_INT(gaps.gaps[0].start_id, 0, "First gap should be [0, 0]");
    ASSERT_EQ_INT(gaps.gaps[0].end_id, 0, "First gap should be [0, 0]");
    ASSERT_EQ_INT(gaps.gaps[1].start_id, 4, "Second gap should be [4, 6]");
    ASSERT_EQ_INT(gaps.gaps[2].start_id, 11, "Third gap should be [11, 15]");
    ASSERT_EQ_INT(gaps.gaps[2].end_id, 15, "Third gap should be [11, 15]");
    free_gap_analysis_result(&gaps);

    avl_destroy(tree);
    return true;
}
