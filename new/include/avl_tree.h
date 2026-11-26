#ifndef AVL_TREE_H
#define AVL_TREE_H

#include "interval.h"
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

typedef enum {
    ROT_NONE = 0,
    ROT_LL,
    ROT_RR,
    ROT_LR,
    ROT_RL
} RotationType;

typedef struct {
    RotationType type;
    Interval pivot;
    Interval parent;
} RotationEvent;

typedef struct AVLNode {
    int64_t start_id;
    int64_t end_id;
    int height;
    int64_t subtree_count;    // Total package count in this subtree
    int subtree_nodes;        // Total interval nodes in this subtree
    int64_t max_id;           // Max package ID in subtree
    struct AVLNode *left;
    struct AVLNode *right;
} AVLNode;

typedef struct {
    AVLNode *root;
    int64_t total_unique_packages;
    int total_intervals;

    // Rotation metrics
    uint64_t total_rotations;
    uint64_t count_ll;
    uint64_t count_rr;
    uint64_t count_lr;
    uint64_t count_rl;

    // Temporary trace for the latest operation
    RotationEvent last_rotations[16];
    int last_rotation_count;
} AVLTree;

// Core Tree Management
AVLTree* avl_create(void);
void avl_destroy(AVLTree *tree);
void avl_clear(AVLTree *tree);

// Node inspection
int avl_node_height(const AVLNode *node);
int avl_node_balance(const AVLNode *node);
int64_t avl_node_subtree_count(const AVLNode *node);
int avl_node_subtree_nodes(const AVLNode *node);
int64_t avl_node_max_id(const AVLNode *node);

// Rotations and balancing
AVLNode* avl_rotate_right(AVLTree *tree, AVLNode *y);
AVLNode* avl_rotate_left(AVLTree *tree, AVLNode *x);
AVLNode* avl_rebalance(AVLTree *tree, AVLNode *node);

// Search operations
AVLNode* avl_find_containing(const AVLTree *tree, int64_t package_id);
AVLNode* avl_find_exact(const AVLTree *tree, int64_t start_id);
AVLNode* avl_min_node(AVLNode *node);
AVLNode* avl_max_node(AVLNode *node);

// Predecessor & Successor (based on interval boundaries relative to package_id)
AVLNode* avl_predecessor_of_id(const AVLTree *tree, int64_t package_id);
AVLNode* avl_successor_of_id(const AVLTree *tree, int64_t package_id);
AVLNode* avl_predecessor_node(const AVLTree *tree, const AVLNode *node);
AVLNode* avl_successor_node(const AVLTree *tree, const AVLNode *node);

// Insertion and Deletion
AVLNode* avl_insert_interval_node(AVLTree *tree, AVLNode *node, int64_t start_id, int64_t end_id);
AVLNode* avl_delete_interval_node(AVLTree *tree, AVLNode *node, int64_t start_id);

// Traversal and extraction
int avl_inorder_intervals(const AVLTree *tree, Interval *out_array, int max_capacity);
int avl_get_all_intervals(const AVLTree *tree, Interval **out_array);

// Invariant Validation
typedef struct {
    bool is_valid;
    bool bst_property;
    bool avl_heights_valid;
    bool balance_factors_valid;
    bool intervals_disjoint;
    bool intervals_non_adjacent;
    bool package_counts_consistent;
    char error_message[256];
} TreeValidationResult;

TreeValidationResult avl_validate_invariants(const AVLTree *tree);

// JSON Serialization for interactive visualization
char* avl_to_json(const AVLTree *tree);

#endif // AVL_TREE_H
