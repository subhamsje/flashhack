#include "avl_tree.h"
#include <stdlib.h>

int avl_max(int a, int b) {
    return (a > b) ? a : b;
}

int avl_height(Node *n) {
    return n ? n->height : 0;
}

void avl_update_height(Node *n) {
    if (n) {
        n->height = 1 + avl_max(avl_height(n->left), avl_height(n->right));
    }
}

int avl_balance_factor(Node *n) {
    return n ? (avl_height(n->left) - avl_height(n->right)) : 0;
}

Node *avl_rotate_right(Node *y) {
    Node *x = y->left;
    Node *t2 = x->right;
    x->right = y;
    y->left = t2;
    avl_update_height(y);
    avl_update_height(x);
    return x;
}

Node *avl_rotate_left(Node *x) {
    Node *y = x->right;
    Node *t2 = y->left;
    y->left = x;
    x->right = t2;
    avl_update_height(x);
    avl_update_height(y);
    return y;
}

Node *avl_rebalance(Node *node) {
    if (!node) return NULL;
    avl_update_height(node);
    int bf = avl_balance_factor(node);

    if (bf > 1) {
        if (avl_balance_factor(node->left) < 0) {
            node->left = avl_rotate_left(node->left);
        }
        return avl_rotate_right(node);
    }
    if (bf < -1) {
        if (avl_balance_factor(node->right) > 0) {
            node->right = avl_rotate_right(node->right);
        }
        return avl_rotate_left(node);
    }
    return node;
}

Node *avl_create_node(package_id_t start, package_id_t end) {
    Node *n = (Node *)malloc(sizeof(Node));
    if (!n) return NULL;
    n->start = start;
    n->end = end;
    n->height = 1;
    n->left = NULL;
    n->right = NULL;
    return n;
}

void avl_free_tree(Node *root) {
    if (!root) return;
    avl_free_tree(root->left);
    avl_free_tree(root->right);
    free(root);
}

Node *avl_insert(Node *root, package_id_t start, package_id_t end) {
    if (!root) return avl_create_node(start, end);

    if (start < root->start) {
        root->left = avl_insert(root->left, start, end);
    } else if (start > root->start) {
        root->right = avl_insert(root->right, start, end);
    } else {
        root->end = avl_max((int)root->end, (int)end);
        return root;
    }
    return avl_rebalance(root);
}

Node *avl_find_min(Node *node) {
    while (node && node->left) {
        node = node->left;
    }
    return node;
}

Node *avl_delete(Node *root, package_id_t start) {
    if (!root) return NULL;

    if (start < root->start) {
        root->left = avl_delete(root->left, start);
    } else if (start > root->start) {
        root->right = avl_delete(root->right, start);
    } else {
        if (!root->left || !root->right) {
            Node *temp = root->left ? root->left : root->right;
            if (!temp) {
                free(root);
                return NULL;
            } else {
                *root = *temp;
                free(temp);
            }
        } else {
            Node *temp = avl_find_min(root->right);
            root->start = temp->start;
            root->end = temp->end;
            root->right = avl_delete(root->right, temp->start);
        }
    }
    return avl_rebalance(root);
}

void avl_find_pred_succ(Node *root, package_id_t x,
                        Node **out_containing,
                        Node **out_pred,
                        Node **out_succ) {
    *out_containing = NULL;
    *out_pred = NULL;
    *out_succ = NULL;

    Node *curr = root;
    while (curr) {
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

size_t avl_collect_inorder(Node *root, Interval *arr, size_t idx) {
    if (!root) return idx;
    idx = avl_collect_inorder(root->left, arr, idx);
    arr[idx].start = root->start;
    arr[idx].end = root->end;
    idx++;
    return avl_collect_inorder(root->right, arr, idx);
}
