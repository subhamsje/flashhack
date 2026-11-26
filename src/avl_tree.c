#include "avl_tree.h"
#include <stdlib.h>
#include <stdio.h>

static inline int max_int(int a, int b) {
    return (a > b) ? a : b;
}

static inline int node_height(const AVLNode *node) {
    return node ? node->height : 0;
}

static inline void update_height(AVLNode *node) {
    if (node) {
        node->height = 1 + max_int(node_height(node->left), node_height(node->right));
    }
}

static inline int balance_factor(const AVLNode *node) {
    return node ? (node_height(node->left) - node_height(node->right)) : 0;
}

static AVLNode *rotate_right(AVLNode *y) {
    AVLNode *x = y->left;
    AVLNode *T2 = x->right;

    x->right = y;
    y->left = T2;

    update_height(y);
    update_height(x);

    return x;
}

static AVLNode *rotate_left(AVLNode *x) {
    AVLNode *y = x->right;
    AVLNode *T2 = y->left;

    y->left = x;
    x->right = T2;

    update_height(x);
    update_height(y);

    return y;
}

static AVLNode *balance_node(AVLNode *node) {
    if (!node) return NULL;

    update_height(node);
    int bf = balance_factor(node);

    /* Left Heavy */
    if (bf > 1) {
        if (balance_factor(node->left) < 0) {
            node->left = rotate_left(node->left);
        }
        return rotate_right(node);
    }

    /* Right Heavy */
    if (bf < -1) {
        if (balance_factor(node->right) > 0) {
            node->right = rotate_right(node->right);
        }
        return rotate_left(node);
    }

    return node;
}

AVLNode *avl_create_node(package_id_t start, package_id_t end) {
    AVLNode *node = (AVLNode *)malloc(sizeof(AVLNode));
    if (!node) return NULL;
    node->start = start;
    node->end = end;
    node->height = 1;
    node->left = NULL;
    node->right = NULL;
    return node;
}

void avl_free_tree(AVLNode *root) {
    if (!root) return;
    avl_free_tree(root->left);
    avl_free_tree(root->right);
    free(root);
}

AVLNode *avl_insert(AVLNode *root, package_id_t start, package_id_t end) {
    if (!root) {
        return avl_create_node(start, end);
    }

    if (start < root->start) {
        root->left = avl_insert(root->left, start, end);
    } else if (start > root->start) {
        root->right = avl_insert(root->right, start, end);
    } else {
        /* Duplicate start key (should not occur in normal disjoint interval logic) */
        root->end = max_int((int)root->end, (int)end);
        return root;
    }

    return balance_node(root);
}

static AVLNode *find_min(AVLNode *node) {
    AVLNode *curr = node;
    while (curr && curr->left) {
        curr = curr->left;
    }
    return curr;
}

AVLNode *avl_delete(AVLNode *root, package_id_t start) {
    if (!root) return NULL;

    if (start < root->start) {
        root->left = avl_delete(root->left, start);
    } else if (start > root->start) {
        root->right = avl_delete(root->right, start);
    } else {
        /* Node found */
        if (!root->left || !root->right) {
            AVLNode *temp = root->left ? root->left : root->right;
            if (!temp) {
                /* No child */
                free(root);
                return NULL;
            } else {
                /* One child */
                *root = *temp;
                free(temp);
            }
        } else {
            /* Two children: get in-order successor (smallest in right subtree) */
            AVLNode *temp = find_min(root->right);
            root->start = temp->start;
            root->end = temp->end;
            root->right = avl_delete(root->right, temp->start);
        }
    }

    return balance_node(root);
}

void avl_find_pred_succ(AVLNode *root, package_id_t x,
                        AVLNode **out_containing,
                        AVLNode **out_pred,
                        AVLNode **out_succ) {
    *out_containing = NULL;
    *out_pred = NULL;
    *out_succ = NULL;

    AVLNode *curr = root;
    while (curr != NULL) {
        if (x < curr->start) {
            *out_succ = curr;
            curr = curr->left;
        } else if (x > curr->end) {
            *out_pred = curr;
            curr = curr->right;
        } else {
            *out_containing = curr;
            return;
        }
    }
}

size_t avl_collect_inorder(const AVLNode *root, Interval *arr, size_t offset) {
    if (!root) return offset;
    offset = avl_collect_inorder(root->left, arr, offset);
    arr[offset].start = root->start;
    arr[offset].end = root->end;
    offset++;
    return avl_collect_inorder(root->right, arr, offset);
}

void avl_traverse_range(const AVLNode *root, package_id_t low, package_id_t high,
                        IntervalVisitor visitor, void *user_data) {
    if (!root) return;

    /*
     * Disjoint interval property:
     * Left subtree has start < root->start.
     * If root->start > low, left subtree might have intervals with end >= low.
     */
    if (root->start > low) {
        avl_traverse_range(root->left, low, high, visitor, user_data);
    }

    /* Check if current interval intersects [low, high] */
    if (root->start <= high && root->end >= low) {
        visitor(root->start, root->end, user_data);
    }

    /*
     * Right subtree has start > root->end.
     * If root->end < high, right subtree might have intervals with start <= high.
     */
    if (root->end < high) {
        avl_traverse_range(root->right, low, high, visitor, user_data);
    }
}

size_t avl_node_count(const AVLNode *root) {
    if (!root) return 0;
    return 1 + avl_node_count(root->left) + avl_node_count(root->right);
}

static bool verify_helper(const AVLNode *node, package_id_t *min_val, package_id_t *max_val, int *height_out) {
    if (!node) {
        *height_out = 0;
        return true;
    }

    if (node->start > node->end) return false;

    int lh = 0, rh = 0;
    package_id_t left_min = 0, left_max = 0;
    package_id_t right_min = 0, right_max = 0;

    if (node->left) {
        if (!verify_helper(node->left, &left_min, &left_max, &lh)) return false;
        if (left_max >= node->start) return false;
        *min_val = left_min;
    } else {
        *min_val = node->start;
    }

    if (node->right) {
        if (!verify_helper(node->right, &right_min, &right_max, &rh)) return false;
        if (right_min <= node->end) return false;
        *max_val = right_max;
    } else {
        *max_val = node->end;
    }

    int diff = lh - rh;
    if (diff < -1 || diff > 1) return false;

    *height_out = 1 + max_int(lh, rh);
    if (*height_out != node->height) return false;

    return true;
}

bool avl_verify_invariants(const AVLNode *root) {
    if (!root) return true;
    package_id_t min_v, max_v;
    int h;
    return verify_helper(root, &min_v, &max_v, &h);
}
