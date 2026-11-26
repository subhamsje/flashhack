#include "warehouse.h"
#include <stdlib.h>
#include <stdio.h>
#include <inttypes.h>

typedef struct Node {
    package_id_t start;
    package_id_t end;
    int height;
    struct Node *left;
    struct Node *right;
} Node;

struct Warehouse {
    Node *root;
    size_t interval_count;
    size_t total_packages;
};

static inline int max(int a, int b) {
    return (a > b) ? a : b;
}

static inline int height(Node *n) {
    return n ? n->height : 0;
}

static inline void update_height(Node *n) {
    if (n) {
        n->height = 1 + max(height(n->left), height(n->right));
    }
}

static inline int balance_factor(Node *n) {
    return n ? (height(n->left) - height(n->right)) : 0;
}

static Node *rotate_right(Node *y) {
    Node *x = y->left;
    Node *t2 = x->right;
    x->right = y;
    y->left = t2;
    update_height(y);
    update_height(x);
    return x;
}

static Node *rotate_left(Node *x) {
    Node *y = x->right;
    Node *t2 = y->left;
    y->left = x;
    x->right = t2;
    update_height(x);
    update_height(y);
    return y;
}

static Node *rebalance(Node *node) {
    if (!node) return NULL;
    update_height(node);
    int bf = balance_factor(node);

    if (bf > 1) {
        if (balance_factor(node->left) < 0) {
            node->left = rotate_left(node->left);
        }
        return rotate_right(node);
    }
    if (bf < -1) {
        if (balance_factor(node->right) > 0) {
            node->right = rotate_right(node->right);
        }
        return rotate_left(node);
    }
    return node;
}

static Node *create_node(package_id_t start, package_id_t end) {
    Node *n = (Node *)malloc(sizeof(Node));
    if (!n) return NULL;
    n->start = start;
    n->end = end;
    n->height = 1;
    n->left = NULL;
    n->right = NULL;
    return n;
}

static void free_tree(Node *root) {
    if (!root) return;
    free_tree(root->left);
    free_tree(root->right);
    free(root);
}

static Node *insert_node(Node *root, package_id_t start, package_id_t end) {
    if (!root) return create_node(start, end);

    if (start < root->start) {
        root->left = insert_node(root->left, start, end);
    } else if (start > root->start) {
        root->right = insert_node(root->right, start, end);
    } else {
        root->end = max((int)root->end, (int)end);
        return root;
    }
    return rebalance(root);
}

static Node *find_min(Node *node) {
    while (node && node->left) {
        node = node->left;
    }
    return node;
}

static Node *delete_node(Node *root, package_id_t start) {
    if (!root) return NULL;

    if (start < root->start) {
        root->left = delete_node(root->left, start);
    } else if (start > root->start) {
        root->right = delete_node(root->right, start);
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
            Node *temp = find_min(root->right);
            root->start = temp->start;
            root->end = temp->end;
            root->right = delete_node(root->right, temp->start);
        }
    }
    return rebalance(root);
}

static void find_pred_succ(Node *root, package_id_t x,
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

Warehouse *warehouse_create(void) {
    Warehouse *w = (Warehouse *)calloc(1, sizeof(Warehouse));
    return w;
}

void warehouse_free(Warehouse *w) {
    if (!w) return;
    free_tree(w->root);
    free(w);
}

void warehouse_clear(Warehouse *w) {
    if (!w) return;
    free_tree(w->root);
    w->root = NULL;
    w->interval_count = 0;
    w->total_packages = 0;
}

ArrivalResult warehouse_add(Warehouse *w, package_id_t id) {
    if (!w || id < 0) return ARRIVAL_DUPLICATE;

    Node *containing = NULL, *pred = NULL, *succ = NULL;
    find_pred_succ(w->root, id, &containing, &pred, &succ);

    /* Already in index */
    if (containing) {
        return ARRIVAL_DUPLICATE;
    }

    bool touches_pred = (pred && pred->end + 1 == id);
    bool touches_succ = (succ && succ->start - 1 == id);

    w->total_packages++;

    /* Case: Connects two intervals together */
    if (touches_pred && touches_succ) {
        package_id_t succ_start = succ->start;
        package_id_t succ_end = succ->end;

        w->root = delete_node(w->root, succ_start);

        /* Re-locate predecessor pointer safely */
        Node *d1 = NULL, *d2 = NULL;
        find_pred_succ(w->root, id, &d1, &pred, &d2);
        if (pred) {
            pred->end = succ_end;
        }

        w->interval_count--;
        return ARRIVAL_BRIDGED;
    }

    /* Case: Extends right boundary of predecessor */
    if (touches_pred) {
        pred->end = id;
        return ARRIVAL_EXTENDED_RIGHT;
    }

    /* Case: Extends left boundary of successor */
    if (touches_succ) {
        package_id_t old_start = succ->start;
        package_id_t old_end = succ->end;
        w->root = delete_node(w->root, old_start);
        w->root = insert_node(w->root, id, old_end);
        return ARRIVAL_EXTENDED_LEFT;
    }

    /* Case: Brand new isolated interval [id, id] */
    w->root = insert_node(w->root, id, id);
    w->interval_count++;
    return ARRIVAL_CREATED;
}

bool warehouse_contains(const Warehouse *w, package_id_t id) {
    if (!w || id < 0) return false;
    Node *c = NULL, *p = NULL, *s = NULL;
    find_pred_succ(w->root, id, &c, &p, &s);
    return (c != NULL);
}

size_t warehouse_interval_count(const Warehouse *w) {
    return w ? w->interval_count : 0;
}

size_t warehouse_total_packages(const Warehouse *w) {
    return w ? w->total_packages : 0;
}

static size_t collect_inorder(Node *root, Interval *arr, size_t idx) {
    if (!root) return idx;
    idx = collect_inorder(root->left, arr, idx);
    arr[idx].start = root->start;
    arr[idx].end = root->end;
    idx++;
    return collect_inorder(root->right, arr, idx);
}

Interval *warehouse_get_intervals(const Warehouse *w, size_t *count) {
    if (!w || !count) return NULL;
    *count = w->interval_count;
    if (w->interval_count == 0) return NULL;

    Interval *arr = (Interval *)malloc(sizeof(Interval) * w->interval_count);
    if (!arr) {
        *count = 0;
        return NULL;
    }
    collect_inorder(w->root, arr, 0);
    return arr;
}

typedef struct {
    Interval *items;
    size_t count;
    size_t cap;
    package_id_t low;
    package_id_t high;
} RangeCollector;

static void collect_range(Node *node, RangeCollector *rc) {
    if (!node) return;

    if (node->start > rc->low) {
        collect_range(node->left, rc);
    }

    if (node->start <= rc->high && node->end >= rc->low) {
        if (rc->count >= rc->cap) {
            size_t ncap = rc->cap ? rc->cap * 2 : 8;
            Interval *nitems = (Interval *)realloc(rc->items, sizeof(Interval) * ncap);
            if (!nitems) return;
            rc->items = nitems;
            rc->cap = ncap;
        }
        package_id_t s = (node->start < rc->low) ? rc->low : node->start;
        package_id_t e = (node->end > rc->high) ? rc->high : node->end;
        if (s <= e) {
            rc->items[rc->count].start = s;
            rc->items[rc->count].end = e;
            rc->count++;
        }
    }

    if (node->end < rc->high) {
        collect_range(node->right, rc);
    }
}

Interval *warehouse_query_range(const Warehouse *w, package_id_t low, package_id_t high, size_t *count) {
    if (!count) return NULL;
    *count = 0;
    if (!w || low > high || low < 0) return NULL;

    RangeCollector rc = { NULL, 0, 0, low, high };
    collect_range(w->root, &rc);
    *count = rc.count;
    return rc.items;
}

Interval *warehouse_query_gaps(const Warehouse *w, package_id_t low, package_id_t high, size_t *count) {
    if (!count) return NULL;
    *count = 0;
    if (!w || low > high || low < 0) return NULL;

    size_t rcount = 0;
    Interval *recv = warehouse_query_range(w, low, high, &rcount);

    if (rcount == 0) {
        Interval *gaps = (Interval *)malloc(sizeof(Interval));
        if (!gaps) return NULL;
        gaps[0].start = low;
        gaps[0].end = high;
        *count = 1;
        free(recv);
        return gaps;
    }

    Interval *gaps = (Interval *)malloc(sizeof(Interval) * (rcount + 1));
    if (!gaps) {
        free(recv);
        return NULL;
    }

    size_t gcount = 0;
    package_id_t curr = low;

    for (size_t i = 0; i < rcount; i++) {
        if (curr < recv[i].start) {
            gaps[gcount].start = curr;
            gaps[gcount].end = recv[i].start - 1;
            gcount++;
        }
        curr = recv[i].end + 1;
    }

    if (curr <= high) {
        gaps[gcount].start = curr;
        gaps[gcount].end = high;
        gcount++;
    }

    free(recv);

    if (gcount == 0) {
        free(gaps);
        *count = 0;
        return NULL;
    }

    *count = gcount;
    return gaps;
}

const char *arrival_result_str(ArrivalResult res) {
    switch (res) {
        case ARRIVAL_CREATED:        return "CREATED";
        case ARRIVAL_EXTENDED_LEFT:  return "EXTENDED_LEFT";
        case ARRIVAL_EXTENDED_RIGHT: return "EXTENDED_RIGHT";
        case ARRIVAL_BRIDGED:        return "BRIDGED";
        case ARRIVAL_DUPLICATE:      return "DUPLICATE";
        default:                     return "UNKNOWN";
    }
}

void warehouse_print_intervals(const Warehouse *w) {
    size_t count = 0;
    Interval *arr = warehouse_get_intervals(w, &count);
    printf("[");
    for (size_t i = 0; i < count; i++) {
        printf("[%" PRId64 ", %" PRId64 "]%s", arr[i].start, arr[i].end, (i + 1 < count) ? ", " : "");
    }
    printf("]\n");
    free(arr);
}

void warehouse_print_report(const Warehouse *w, package_id_t low, package_id_t high) {
    size_t rcount = 0, gcount = 0;
    Interval *recv = warehouse_query_range(w, low, high, &rcount);
    Interval *gaps = warehouse_query_gaps(w, low, high, &gcount);

    printf("Window [%" PRId64 ", %" PRId64 "]:\n", low, high);
    printf("  Received : [");
    for (size_t i = 0; i < rcount; i++) {
        printf("[%" PRId64 ", %" PRId64 "]%s", recv[i].start, recv[i].end, (i + 1 < rcount) ? ", " : "");
    }
    printf("]\n");

    printf("  Missing  : [");
    for (size_t i = 0; i < gcount; i++) {
        printf("[%" PRId64 ", %" PRId64 "]%s", gaps[i].start, gaps[i].end, (i + 1 < gcount) ? ", " : "");
    }
    printf("]\n");

    free(recv);
    free(gaps);
}
