#ifndef AVL_TREE_H
#define AVL_TREE_H

#include "warehouse.h"

typedef struct Node {
    package_id_t start;
    package_id_t end;
    int height;
    struct Node *left;
    struct Node *right;
} Node;

int avl_max(int a, int b);
int avl_height(Node *n);
void avl_update_height(Node *n);
int avl_balance_factor(Node *n);
Node *avl_rotate_right(Node *y);
Node *avl_rotate_left(Node *x);
Node *avl_rebalance(Node *node);
Node *avl_create_node(package_id_t start, package_id_t end);
void avl_free_tree(Node *root);
Node *avl_insert(Node *root, package_id_t start, package_id_t end);
Node *avl_find_min(Node *node);
Node *avl_delete(Node *root, package_id_t start);
void avl_find_pred_succ(Node *root, package_id_t x,
                        Node **out_containing,
                        Node **out_pred,
                        Node **out_succ);
size_t avl_collect_inorder(Node *root, Interval *arr, size_t idx);

#endif /* AVL_TREE_H */
