#include "test_common.h"
#include "avl_tree.h"
#include "insertion.h"

bool test_bridge_merge_basic(void) {
    AVLTree *tree = avl_create();

    // Create [1, 3]
    arrival_process_package(tree, 1);
    arrival_process_package(tree, 2);
    arrival_process_package(tree, 3);

    // Create [5, 7]
    arrival_process_package(tree, 5);
    arrival_process_package(tree, 6);
    arrival_process_package(tree, 7);

    ASSERT_EQ_INT(tree->total_intervals, 2, "Should have 2 intervals before merge");
    ASSERT_EQ_INT(tree->total_unique_packages, 6, "Should have 6 unique packages");

    // Insert connecting ID: 4
    OperationResult res = arrival_process_package(tree, 4);
    ASSERT_EQ_INT(res.type, OP_BRIDGE_MERGE, "ID 4 should trigger BRIDGE_MERGE");
    ASSERT_TRUE(res.merge_occurred, "merge_occurred should be true");
    ASSERT_EQ_INT(res.prev_affected_1.start_id, 1, "Pred start should be 1");
    ASSERT_EQ_INT(res.prev_affected_1.end_id, 3, "Pred end should be 3");
    ASSERT_EQ_INT(res.prev_affected_2.start_id, 5, "Succ start should be 5");
    ASSERT_EQ_INT(res.prev_affected_2.end_id, 7, "Succ end should be 7");
    ASSERT_EQ_INT(res.updated_interval.start_id, 1, "Updated start should be 1");
    ASSERT_EQ_INT(res.updated_interval.end_id, 7, "Updated end should be 7");

    ASSERT_EQ_INT(tree->total_intervals, 1, "Interval count should be 1 after bridge merge");
    ASSERT_EQ_INT(tree->total_unique_packages, 7, "Total unique packages should be 7");

    TreeValidationResult val = avl_validate_invariants(tree);
    ASSERT_TRUE(val.is_valid, "Tree invariants violated after bridge merge");

    avl_destroy(tree);
    return true;
}

bool test_bridge_merge_multi_alternating(void) {
    AVLTree *tree = avl_create();

    // Insert 50 evens: 2, 4, 6, ..., 100
    for (int i = 1; i <= 50; i++) {
        OperationResult res = arrival_process_package(tree, i * 2);
        ASSERT_EQ_INT(res.type, OP_NEW_INTERVAL, "Even number should create isolated interval");
    }

    ASSERT_EQ_INT(tree->total_intervals, 50, "Should have exactly 50 intervals");
    ASSERT_EQ_INT(tree->total_unique_packages, 50, "Should have 50 unique packages");
    TreeValidationResult val = avl_validate_invariants(tree);
    ASSERT_TRUE(val.is_valid, "Invariants failed after evens");

    // Insert 49 odds to bridge all intervals: 3, 5, 7, ..., 99
    for (int i = 1; i < 50; i++) {
        int64_t bridge_id = i * 2 + 1;
        OperationResult res = arrival_process_package(tree, bridge_id);
        ASSERT_EQ_INT(res.type, OP_BRIDGE_MERGE, "Odd ID should trigger bridge merge");
        ASSERT_TRUE(res.merge_occurred, "Merge flag should be true");

        // Validate tree after each merge
        val = avl_validate_invariants(tree);
        ASSERT_TRUE(val.is_valid, "Invariants failed during intermediate merge step");
    }

    // Now all intervals should be merged into a single interval [2, 100]!
    ASSERT_EQ_INT(tree->total_intervals, 1, "All intervals should be merged into 1");
    ASSERT_EQ_INT(tree->total_unique_packages, 99, "Total packages should be 99");
    ASSERT_EQ_INT(tree->root->start_id, 2, "Start ID should be 2");
    ASSERT_EQ_INT(tree->root->end_id, 100, "End ID should be 100");

    avl_destroy(tree);
    return true;
}
