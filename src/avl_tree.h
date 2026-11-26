#ifndef AVL_TREE_H
#define AVL_TREE_H

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#include "warehouse_index.h"

/**
 * @brief Node in the self-balancing AVL Tree of disjoint intervals.
 */
typedef struct AVLNode {
    package_id_t start;
    package_id_t end;
    int height;
    struct AVLNode *left;
    struct AVLNode *right;
} AVLNode;

/**
 * @brief Allocate a new AVL node for interval [start, end].
 */
AVLNode *avl_create_node(package_id_t start, package_id_t end);

/**
 * @brief Free an entire AVL subtree.
 */
void avl_free_tree(AVLNode *root);

/**
 * @brief Insert a new interval [start, end] into the AVL tree.
 * Returns the new root.
 */
AVLNode *avl_insert(AVLNode *root, package_id_t start, package_id_t end);

/**
 * @brief Delete the node identified by interval start key.
 * Returns the new root.
 */
AVLNode *avl_delete(AVLNode *root, package_id_t start);

/**
 * @brief Locate containing interval or immediate predecessor and successor intervals.
 *
 * @param root Tree root.
 * @param x Package ID to locate.
 * @param out_containing Set to node containing x, or NULL if not found.
 * @param out_pred Set to node with greatest end < x, or NULL.
 * @param out_succ Set to node with smallest start > x, or NULL.
 */
void avl_find_pred_succ(AVLNode *root, package_id_t x,
                        AVLNode **out_containing,
                        AVLNode **out_pred,
                        AVLNode **out_succ);

/**
 * @brief In-order traversal to populate an array of intervals.
 */
size_t avl_collect_inorder(const AVLNode *root, Interval *arr, size_t offset);

/**
 * @brief Callback function type for range queries.
 */
typedef void (*IntervalVisitor)(package_id_t start, package_id_t end, void *user_data);

/**
 * @brief Traverse only the intervals that overlap [low, high].
 * Prunes non-overlapping subtrees in O(log K + M) time.
 */
void avl_traverse_range(const AVLNode *root, package_id_t low, package_id_t high,
                        IntervalVisitor visitor, void *user_data);

/**
 * @brief Calculate total number of nodes (intervals) in the tree.
 */
size_t avl_node_count(const AVLNode *root);

/**
 * @brief Verify AVL invariants (for debugging and testing).
 * Returns true if the tree satisfies binary search and AVL height balance invariants.
 */
bool avl_verify_invariants(const AVLNode *root);

#endif /* AVL_TREE_H */
