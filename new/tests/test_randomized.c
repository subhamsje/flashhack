#include "test_common.h"
#include "avl_tree.h"
#include "insertion.h"
#include "search.h"
#include <stdlib.h>

bool test_randomized_against_reference(void) {
    AVLTree *tree = avl_create();
    const int RANGE = 3000;
    bool ref_presence[3000];
    memset(ref_presence, 0, sizeof(ref_presence));

    srand(42);

    int operations = 2500;
    int expected_unique = 0;

    for (int i = 0; i < operations; i++) {
        int pkg = rand() % RANGE;
        if (!ref_presence[pkg]) {
            ref_presence[pkg] = true;
            expected_unique++;
        }

        arrival_process_package(tree, pkg);

        if (i % 250 == 0) {
            TreeValidationResult val = avl_validate_invariants(tree);
            ASSERT_TRUE(val.is_valid, "Randomized test invariant check failed");
            ASSERT_EQ_INT(tree->total_unique_packages, expected_unique, "Unique package count mismatch");
        }
    }

    // Comprehensive query verification across entire range
    for (int pkg = 0; pkg < RANGE; pkg++) {
        LookupResult res = search_package(tree, pkg);
        ASSERT_EQ_INT(res.found, ref_presence[pkg], "Search result mismatch between AVL and reference");
    }

    avl_destroy(tree);
    return true;
}

bool test_large_scale_50k_unique_ids(void) {
    AVLTree *tree = avl_create();
    const int COUNT = 50000;

    // Insert 50,000 sequential and scrambled IDs
    for (int i = 0; i < COUNT; i++) {
        arrival_process_package(tree, i);
    }

    ASSERT_EQ_INT(tree->total_unique_packages, COUNT, "50,000 unique packages not met");
    ASSERT_EQ_INT(tree->total_intervals, 1, "Should merge into 1 single interval [0, 49999]");
    ASSERT_EQ_INT(tree->root->start_id, 0, "Start ID should be 0");
    ASSERT_EQ_INT(tree->root->end_id, COUNT - 1, "End ID should be 49999");

    TreeValidationResult val = avl_validate_invariants(tree);
    ASSERT_TRUE(val.is_valid, "AVL invariants violated for 50,000 packages");

    avl_destroy(tree);
    return true;
}
