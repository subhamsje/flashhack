#include "test_common.h"
#include "avl_tree.h"
#include <stdlib.h>

bool test_avl_rotations_and_balancing(void) {
    AVLTree *tree = avl_create();
    ASSERT_TRUE(tree != NULL, "AVL tree creation failed");

    // Insert intervals that force LL rotation: 30, 20, 10
    tree->root = avl_insert_interval_node(tree, tree->root, 30, 30);
    tree->total_intervals++;
    tree->total_unique_packages++;

    tree->root = avl_insert_interval_node(tree, tree->root, 20, 20);
    tree->total_intervals++;
    tree->total_unique_packages++;

    tree->root = avl_insert_interval_node(tree, tree->root, 10, 10);
    tree->total_intervals++;
    tree->total_unique_packages++;

    TreeValidationResult val = avl_validate_invariants(tree);
    ASSERT_TRUE(val.is_valid, "AVL invariants violated after LL rotation");
    ASSERT_EQ_INT(tree->root->start_id, 20, "Root should be 20 after LL rotation");

    // Clear and test RR rotation: 10, 20, 30
    avl_clear(tree);
    tree->root = avl_insert_interval_node(tree, tree->root, 10, 10);
    tree->total_intervals++;
    tree->total_unique_packages++;

    tree->root = avl_insert_interval_node(tree, tree->root, 20, 20);
    tree->total_intervals++;
    tree->total_unique_packages++;

    tree->root = avl_insert_interval_node(tree, tree->root, 30, 30);
    tree->total_intervals++;
    tree->total_unique_packages++;

    val = avl_validate_invariants(tree);
    ASSERT_TRUE(val.is_valid, "AVL invariants violated after RR rotation");
    ASSERT_EQ_INT(tree->root->start_id, 20, "Root should be 20 after RR rotation");

    // Test LR rotation: 30, 10, 20
    avl_clear(tree);
    tree->root = avl_insert_interval_node(tree, tree->root, 30, 30);
    tree->total_intervals++;
    tree->total_unique_packages++;

    tree->root = avl_insert_interval_node(tree, tree->root, 10, 10);
    tree->total_intervals++;
    tree->total_unique_packages++;

    tree->root = avl_insert_interval_node(tree, tree->root, 20, 20);
    tree->total_intervals++;
    tree->total_unique_packages++;

    val = avl_validate_invariants(tree);
    ASSERT_TRUE(val.is_valid, "AVL invariants violated after LR rotation");
    ASSERT_EQ_INT(tree->root->start_id, 20, "Root should be 20 after LR rotation");

    // Test RL rotation: 10, 30, 20
    avl_clear(tree);
    tree->root = avl_insert_interval_node(tree, tree->root, 10, 10);
    tree->total_intervals++;
    tree->total_unique_packages++;

    tree->root = avl_insert_interval_node(tree, tree->root, 30, 30);
    tree->total_intervals++;
    tree->total_unique_packages++;

    tree->root = avl_insert_interval_node(tree, tree->root, 20, 20);
    tree->total_intervals++;
    tree->total_unique_packages++;

    val = avl_validate_invariants(tree);
    ASSERT_TRUE(val.is_valid, "AVL invariants violated after RL rotation");
    ASSERT_EQ_INT(tree->root->start_id, 20, "Root should be 20 after RL rotation");

    avl_destroy(tree);
    return true;
}

bool test_avl_predecessor_successor(void) {
    AVLTree *tree = avl_create();
    // Insert [10, 20], [30, 40], [50, 60]
    tree->root = avl_insert_interval_node(tree, tree->root, 30, 40);
    tree->total_intervals++;
    tree->total_unique_packages += 11;

    tree->root = avl_insert_interval_node(tree, tree->root, 10, 20);
    tree->total_intervals++;
    tree->total_unique_packages += 11;

    tree->root = avl_insert_interval_node(tree, tree->root, 50, 60);
    tree->total_intervals++;
    tree->total_unique_packages += 11;

    // Predecessor of 25: should be [10, 20]
    AVLNode *pred = avl_predecessor_of_id(tree, 25);
    ASSERT_TRUE(pred != NULL, "Predecessor of 25 should exist");
    ASSERT_EQ_INT(pred->start_id, 10, "Predecessor of 25 start should be 10");
    ASSERT_EQ_INT(pred->end_id, 20, "Predecessor of 25 end should be 20");

    // Successor of 25: should be [30, 40]
    AVLNode *succ = avl_successor_of_id(tree, 25);
    ASSERT_TRUE(succ != NULL, "Successor of 25 should exist");
    ASSERT_EQ_INT(succ->start_id, 30, "Successor of 25 start should be 30");

    // Predecessor of 5: should be NULL
    ASSERT_TRUE(avl_predecessor_of_id(tree, 5) == NULL, "Predecessor of 5 should be NULL");

    // Successor of 70: should be NULL
    ASSERT_TRUE(avl_successor_of_id(tree, 70) == NULL, "Successor of 70 should be NULL");

    avl_destroy(tree);
    return true;
}
