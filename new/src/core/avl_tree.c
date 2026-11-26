#include "avl_tree.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static inline int max_int(int a, int b) {
    return (a > b) ? a : b;
}

static inline int64_t max_int64(int64_t a, int64_t b) {
    return (a > b) ? a : b;
}

int avl_node_height(const AVLNode *node) {
    return node ? node->height : 0;
}

int avl_node_balance(const AVLNode *node) {
    return node ? (avl_node_height(node->left) - avl_node_height(node->right)) : 0;
}

int64_t avl_node_subtree_count(const AVLNode *node) {
    return node ? node->subtree_count : 0;
}

int avl_node_subtree_nodes(const AVLNode *node) {
    return node ? node->subtree_nodes : 0;
}

int64_t avl_node_max_id(const AVLNode *node) {
    return node ? node->max_id : -1;
}

static void update_node_metadata(AVLNode *node) {
    if (!node) return;
    int lh = avl_node_height(node->left);
    int rh = avl_node_height(node->right);
    node->height = 1 + max_int(lh, rh);

    int64_t node_count = node->end_id - node->start_id + 1;
    node->subtree_count = node_count + avl_node_subtree_count(node->left) + avl_node_subtree_count(node->right);
    node->subtree_nodes = 1 + avl_node_subtree_nodes(node->left) + avl_node_subtree_nodes(node->right);

    int64_t mx = node->end_id;
    if (node->left && node->left->max_id > mx) mx = node->left->max_id;
    if (node->right && node->right->max_id > mx) mx = node->right->max_id;
    node->max_id = mx;
}

static AVLNode* create_node(int64_t start_id, int64_t end_id) {
    AVLNode *node = (AVLNode*)malloc(sizeof(AVLNode));
    if (!node) return NULL;
    node->start_id = start_id;
    node->end_id = end_id;
    node->height = 1;
    node->subtree_count = end_id - start_id + 1;
    node->subtree_nodes = 1;
    node->max_id = end_id;
    node->left = NULL;
    node->right = NULL;
    return node;
}

AVLTree* avl_create(void) {
    AVLTree *tree = (AVLTree*)calloc(1, sizeof(AVLTree));
    return tree;
}

static void free_subtree(AVLNode *node) {
    if (!node) return;
    free_subtree(node->left);
    free_subtree(node->right);
    free(node);
}

void avl_clear(AVLTree *tree) {
    if (!tree) return;
    free_subtree(tree->root);
    tree->root = NULL;
    tree->total_unique_packages = 0;
    tree->total_intervals = 0;
    tree->last_rotation_count = 0;
}

void avl_destroy(AVLTree *tree) {
    if (!tree) return;
    avl_clear(tree);
    free(tree);
}

static void record_rotation(AVLTree *tree, RotationType type, AVLNode *pivot, AVLNode *parent) {
    if (!tree) return;
    tree->total_rotations++;
    switch (type) {
        case ROT_LL: tree->count_ll++; break;
        case ROT_RR: tree->count_rr++; break;
        case ROT_LR: tree->count_lr++; break;
        case ROT_RL: tree->count_rl++; break;
        default: break;
    }
    if (tree->last_rotation_count < 16) {
        RotationEvent *ev = &tree->last_rotations[tree->last_rotation_count++];
        ev->type = type;
        if (pivot) ev->pivot = interval_create(pivot->start_id, pivot->end_id);
        if (parent) ev->parent = interval_create(parent->start_id, parent->end_id);
    }
}

AVLNode* avl_rotate_right(AVLTree *tree, AVLNode *y) {
    (void)tree;
    if (!y || !y->left) return y;
    AVLNode *x = y->left;
    AVLNode *T2 = x->right;

    x->right = y;
    y->left = T2;

    update_node_metadata(y);
    update_node_metadata(x);

    return x;
}

AVLNode* avl_rotate_left(AVLTree *tree, AVLNode *x) {
    (void)tree;
    if (!x || !x->right) return x;
    AVLNode *y = x->right;
    AVLNode *T2 = y->left;

    y->left = x;
    x->right = T2;

    update_node_metadata(x);
    update_node_metadata(y);

    return y;
}

AVLNode* avl_rebalance(AVLTree *tree, AVLNode *node) {
    if (!node) return NULL;
    update_node_metadata(node);

    int balance = avl_node_balance(node);

    // Left heavy
    if (balance > 1) {
        if (avl_node_balance(node->left) < 0) {
            // LR rotation
            AVLNode *left_child = node->left;
            node->left = avl_rotate_left(tree, left_child);
            record_rotation(tree, ROT_LR, node->left, node);
            return avl_rotate_right(tree, node);
        } else {
            // LL rotation
            record_rotation(tree, ROT_LL, node->left, node);
            return avl_rotate_right(tree, node);
        }
    }

    // Right heavy
    if (balance < -1) {
        if (avl_node_balance(node->right) > 0) {
            // RL rotation
            AVLNode *right_child = node->right;
            node->right = avl_rotate_right(tree, right_child);
            record_rotation(tree, ROT_RL, node->right, node);
            return avl_rotate_left(tree, node);
        } else {
            // RR rotation
            record_rotation(tree, ROT_RR, node->right, node);
            return avl_rotate_left(tree, node);
        }
    }

    return node;
}

AVLNode* avl_find_containing(const AVLTree *tree, int64_t package_id) {
    if (!tree) return NULL;
    AVLNode *curr = tree->root;
    while (curr) {
        if (package_id >= curr->start_id && package_id <= curr->end_id) {
            return curr;
        } else if (package_id < curr->start_id) {
            curr = curr->left;
        } else {
            curr = curr->right;
        }
    }
    return NULL;
}

AVLNode* avl_find_exact(const AVLTree *tree, int64_t start_id) {
    if (!tree) return NULL;
    AVLNode *curr = tree->root;
    while (curr) {
        if (start_id == curr->start_id) {
            return curr;
        } else if (start_id < curr->start_id) {
            curr = curr->left;
        } else {
            curr = curr->right;
        }
    }
    return NULL;
}

AVLNode* avl_min_node(AVLNode *node) {
    AVLNode *curr = node;
    while (curr && curr->left) {
        curr = curr->left;
    }
    return curr;
}

AVLNode* avl_max_node(AVLNode *node) {
    AVLNode *curr = node;
    while (curr && curr->right) {
        curr = curr->right;
    }
    return curr;
}

AVLNode* avl_predecessor_of_id(const AVLTree *tree, int64_t package_id) {
    if (!tree) return NULL;
    AVLNode *curr = tree->root;
    AVLNode *pred = NULL;
    while (curr) {
        if (curr->end_id < package_id) {
            pred = curr;
            curr = curr->right;
        } else {
            curr = curr->left;
        }
    }
    return pred;
}

AVLNode* avl_successor_of_id(const AVLTree *tree, int64_t package_id) {
    if (!tree) return NULL;
    AVLNode *curr = tree->root;
    AVLNode *succ = NULL;
    while (curr) {
        if (curr->start_id > package_id) {
            succ = curr;
            curr = curr->left;
        } else {
            curr = curr->right;
        }
    }
    return succ;
}

AVLNode* avl_predecessor_node(const AVLTree *tree, const AVLNode *node) {
    if (!tree || !node) return NULL;
    if (node->left) {
        return avl_max_node(node->left);
    }
    AVLNode *pred = NULL;
    AVLNode *curr = tree->root;
    while (curr) {
        if (node->start_id > curr->start_id) {
            pred = curr;
            curr = curr->right;
        } else if (node->start_id < curr->start_id) {
            curr = curr->left;
        } else {
            break;
        }
    }
    return pred;
}

AVLNode* avl_successor_node(const AVLTree *tree, const AVLNode *node) {
    if (!tree || !node) return NULL;
    if (node->right) {
        return avl_min_node(node->right);
    }
    AVLNode *succ = NULL;
    AVLNode *curr = tree->root;
    while (curr) {
        if (node->start_id < curr->start_id) {
            succ = curr;
            curr = curr->left;
        } else if (node->start_id > curr->start_id) {
            curr = curr->right;
        } else {
            break;
        }
    }
    return succ;
}

AVLNode* avl_insert_interval_node(AVLTree *tree, AVLNode *node, int64_t start_id, int64_t end_id) {
    if (!node) {
        return create_node(start_id, end_id);
    }

    if (start_id < node->start_id) {
        node->left = avl_insert_interval_node(tree, node->left, start_id, end_id);
    } else if (start_id > node->start_id) {
        node->right = avl_insert_interval_node(tree, node->right, start_id, end_id);
    } else {
        // Node with same start_id already exists; update end if extended
        if (end_id > node->end_id) {
            node->end_id = end_id;
        }
        update_node_metadata(node);
        return node;
    }

    return avl_rebalance(tree, node);
}

AVLNode* avl_delete_interval_node(AVLTree *tree, AVLNode *node, int64_t start_id) {
    if (!node) return NULL;

    if (start_id < node->start_id) {
        node->left = avl_delete_interval_node(tree, node->left, start_id);
    } else if (start_id > node->start_id) {
        node->right = avl_delete_interval_node(tree, node->right, start_id);
    } else {
        // Node found
        if (!node->left || !node->right) {
            AVLNode *temp = node->left ? node->left : node->right;
            if (!temp) {
                // No children
                free(node);
                return NULL;
            } else {
                // One child
                *node = *temp;
                free(temp);
            }
        } else {
            // Two children: successor in right subtree
            AVLNode *succ = avl_min_node(node->right);
            node->start_id = succ->start_id;
            node->end_id = succ->end_id;
            node->right = avl_delete_interval_node(tree, node->right, succ->start_id);
        }
    }

    return avl_rebalance(tree, node);
}

static void inorder_collect(const AVLNode *node, Interval *out_array, int *count, int max_capacity) {
    if (!node || *count >= max_capacity) return;
    inorder_collect(node->left, out_array, count, max_capacity);
    if (*count < max_capacity) {
        out_array[*count] = interval_create(node->start_id, node->end_id);
        (*count)++;
    }
    inorder_collect(node->right, out_array, count, max_capacity);
}

int avl_inorder_intervals(const AVLTree *tree, Interval *out_array, int max_capacity) {
    if (!tree || !out_array || max_capacity <= 0) return 0;
    int count = 0;
    inorder_collect(tree->root, out_array, &count, max_capacity);
    return count;
}

int avl_get_all_intervals(const AVLTree *tree, Interval **out_array) {
    if (!tree || !out_array) return 0;
    int total = tree->total_intervals;
    if (total <= 0) {
        *out_array = NULL;
        return 0;
    }
    Interval *arr = (Interval*)malloc(sizeof(Interval) * total);
    if (!arr) {
        *out_array = NULL;
        return 0;
    }
    int count = avl_inorder_intervals(tree, arr, total);
    *out_array = arr;
    return count;
}

static bool check_node_invariants(const AVLNode *node, TreeValidationResult *res, 
                                  const AVLNode **prev_inorder, int64_t *sum_packages, int *node_count) {
    if (!node) return true;

    // Validate left subtree
    if (!check_node_invariants(node->left, res, prev_inorder, sum_packages, node_count)) {
        return false;
    }

    // Check height correctness
    int lh = avl_node_height(node->left);
    int rh = avl_node_height(node->right);
    if (node->height != 1 + max_int(lh, rh)) {
        res->avl_heights_valid = false;
        snprintf(res->error_message, sizeof(res->error_message),
                 "Height mismatch at interval [%lld, %lld]: stored %d, calculated %d",
                 (long long)node->start_id, (long long)node->end_id, node->height, 1 + max_int(lh, rh));
        return false;
    }

    // Check balance factor
    int bf = lh - rh;
    if (bf < -1 || bf > 1) {
        res->balance_factors_valid = false;
        snprintf(res->error_message, sizeof(res->error_message),
                 "Balance factor out of bounds at [%lld, %lld]: bf=%d",
                 (long long)node->start_id, (long long)node->end_id, bf);
        return false;
    }

    // Check BST ordering and non-overlap / non-adjacency
    if (*prev_inorder) {
        if ((*prev_inorder)->start_id >= node->start_id) {
            res->bst_property = false;
            snprintf(res->error_message, sizeof(res->error_message),
                     "BST violation: prev [%lld, %lld] >= curr [%lld, %lld]",
                     (long long)(*prev_inorder)->start_id, (long long)(*prev_inorder)->end_id,
                     (long long)node->start_id, (long long)node->end_id);
            return false;
        }
        if ((*prev_inorder)->end_id >= node->start_id) {
            res->intervals_disjoint = false;
            snprintf(res->error_message, sizeof(res->error_message),
                     "Interval overlap: prev [%lld, %lld] overlaps curr [%lld, %lld]",
                     (long long)(*prev_inorder)->start_id, (long long)(*prev_inorder)->end_id,
                     (long long)node->start_id, (long long)node->end_id);
            return false;
        }
        if ((*prev_inorder)->end_id + 1 == node->start_id) {
            res->intervals_non_adjacent = false;
            snprintf(res->error_message, sizeof(res->error_message),
                     "Unmerged adjacent intervals: prev [%lld, %lld] and curr [%lld, %lld]",
                     (long long)(*prev_inorder)->start_id, (long long)(*prev_inorder)->end_id,
                     (long long)node->start_id, (long long)node->end_id);
            return false;
        }
    }
    *prev_inorder = node;

    // Track counts
    *sum_packages += (node->end_id - node->start_id + 1);
    (*node_count)++;

    // Validate right subtree
    return check_node_invariants(node->right, res, prev_inorder, sum_packages, node_count);
}

TreeValidationResult avl_validate_invariants(const AVLTree *tree) {
    TreeValidationResult res;
    memset(&res, 0, sizeof(res));
    res.is_valid = true;
    res.bst_property = true;
    res.avl_heights_valid = true;
    res.balance_factors_valid = true;
    res.intervals_disjoint = true;
    res.intervals_non_adjacent = true;
    res.package_counts_consistent = true;

    if (!tree) return res;

    const AVLNode *prev = NULL;
    int64_t sum_packages = 0;
    int node_count = 0;

    if (!check_node_invariants(tree->root, &res, &prev, &sum_packages, &node_count)) {
        res.is_valid = false;
        return res;
    }

    if (node_count != tree->total_intervals) {
        res.package_counts_consistent = false;
        res.is_valid = false;
        snprintf(res.error_message, sizeof(res.error_message),
                 "Interval count mismatch: tree header says %d, traversed %d",
                 tree->total_intervals, node_count);
        return res;
    }

    if (sum_packages != tree->total_unique_packages) {
        res.package_counts_consistent = false;
        res.is_valid = false;
        snprintf(res.error_message, sizeof(res.error_message),
                 "Unique package count mismatch: header says %lld, calculated %lld",
                 (long long)tree->total_unique_packages, (long long)sum_packages);
        return res;
    }

    return res;
}

static void serialize_node_json(const AVLNode *node, char **buf, size_t *size, size_t *cap) {
    if (!node) {
        const char *null_str = "null";
        size_t len = strlen(null_str);
        while (*size + len + 1 >= *cap) {
            *cap *= 2;
            *buf = (char*)realloc(*buf, *cap);
        }
        strcat(*buf, null_str);
        *size += len;
        return;
    }

    char chunk[512];
    int len = snprintf(chunk, sizeof(chunk),
        "{\"start\":%lld,\"end\":%lld,\"height\":%d,\"balance\":%d,\"count\":%lld,\"left\":",
        (long long)node->start_id, (long long)node->end_id,
        node->height, avl_node_balance(node),
        (long long)node->subtree_count);

    while (*size + len + 1 >= *cap) {
        *cap *= 2;
        *buf = (char*)realloc(*buf, *cap);
    }
    strcat(*buf, chunk);
    *size += len;

    serialize_node_json(node->left, buf, size, cap);

    const char *mid = ",\"right\":";
    len = strlen(mid);
    while (*size + len + 1 >= *cap) {
        *cap *= 2;
        *buf = (char*)realloc(*buf, *cap);
    }
    strcat(*buf, mid);
    *size += len;

    serialize_node_json(node->right, buf, size, cap);

    const char *end = "}";
    len = strlen(end);
    while (*size + len + 1 >= *cap) {
        *cap *= 2;
        *buf = (char*)realloc(*buf, *cap);
    }
    strcat(*buf, end);
    *size += len;
}

char* avl_to_json(const AVLTree *tree) {
    if (!tree) {
        char *empty = (char*)malloc(32);
        strcpy(empty, "{\"root\":null,\"intervals\":0}");
        return empty;
    }

    size_t cap = 4096;
    size_t size = 0;
    char *buf = (char*)malloc(cap);
    buf[0] = '\0';

    char header[256];
    int len = snprintf(header, sizeof(header),
        "{\"total_unique\":%lld,\"total_intervals\":%d,\"height\":%d,\"rotations\":%llu,\"root\":",
        (long long)tree->total_unique_packages, tree->total_intervals,
        avl_node_height(tree->root), (unsigned long long)tree->total_rotations);
    strcat(buf, header);
    size = strlen(buf);

    serialize_node_json(tree->root, &buf, &size, &cap);

    const char *tail = "}";
    len = strlen(tail);
    while (size + len + 1 >= cap) {
        cap *= 2;
        buf = (char*)realloc(buf, cap);
    }
    strcat(buf, tail);

    return buf;
}
