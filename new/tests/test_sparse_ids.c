#include "test_common.h"
#include "avl_tree.h"
#include "insertion.h"
#include "search.h"
#include "gap_analysis.h"

bool test_sparse_and_large_boundaries(void) {
    AVLTree *tree = avl_create();

    // Insert 0
    OperationResult res0 = arrival_process_package(tree, 0);
    ASSERT_EQ_INT(res0.type, OP_NEW_INTERVAL, "0 should create interval");

    // Insert 5
    OperationResult res5 = arrival_process_package(tree, 5);
    ASSERT_EQ_INT(res5.type, OP_NEW_INTERVAL, "5 should create interval");

    // Insert 100,000,000 (10^8)
    OperationResult res8 = arrival_process_package(tree, 100000000LL);
    ASSERT_EQ_INT(res8.type, OP_NEW_INTERVAL, "10^8 should create interval");

    // Insert 1,000,000,000 (10^9)
    OperationResult res9 = arrival_process_package(tree, 1000000000LL);
    ASSERT_EQ_INT(res9.type, OP_NEW_INTERVAL, "10^9 should create interval");

    ASSERT_EQ_INT(tree->total_intervals, 4, "Should have 4 intervals");
    ASSERT_EQ_INT(tree->total_unique_packages, 4, "Should have 4 unique packages");

    // Memory footprint: exactly 4 nodes allocated, each ~48-64 bytes! Zero dense arrays.
    TreeValidationResult val = avl_validate_invariants(tree);
    ASSERT_TRUE(val.is_valid, "Tree invariants invalid for sparse IDs");

    // Query gap between 5 and 10^8
    GapAnalysisResult gaps = gap_analysis_compute(tree, 0, 1000000000LL);
    ASSERT_EQ_INT(gaps.count, 3, "Should have 3 massive gaps");
    ASSERT_EQ_INT(gaps.gaps[0].start_id, 1, "First gap start should be 1");
    ASSERT_EQ_INT(gaps.gaps[0].end_id, 4, "First gap end should be 4");

    ASSERT_EQ_INT(gaps.gaps[1].start_id, 6, "Second gap start should be 6");
    ASSERT_EQ_INT(gaps.gaps[1].end_id, 99999999LL, "Second gap end should be 99,999,999");

    ASSERT_EQ_INT(gaps.gaps[2].start_id, 100000001LL, "Third gap start should be 100,000,001");
    ASSERT_EQ_INT(gaps.gaps[2].end_id, 999999999LL, "Third gap end should be 999,999,999");

    // Total missing IDs: 1,000,000,001 - 4 = 999,999,997
    ASSERT_EQ_INT(gaps.total_missing_ids, 999999997LL, "Missing calculation correct across 10^9");
    free_gap_analysis_result(&gaps);

    // Negative ID handling
    OperationResult res_neg = arrival_process_package(tree, -1);
    ASSERT_EQ_INT(res_neg.type, OP_ERROR, "Negative ID should return OP_ERROR");

    avl_destroy(tree);
    return true;
}
