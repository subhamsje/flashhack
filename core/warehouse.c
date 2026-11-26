#include "warehouse.h"
#include "avl_tree.h"
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <inttypes.h>
#include <time.h>

struct Warehouse {
    Node *root;
    size_t interval_count;
    size_t total_packages;
    size_t bridge_count;
    size_t extension_count;
    size_t creation_count;
    size_t duplicate_count;
};

Warehouse *warehouse_create(void) {
    Warehouse *w = (Warehouse *)calloc(1, sizeof(Warehouse));
    return w;
}

void warehouse_free(Warehouse *w) {
    if (!w) return;
    avl_free_tree(w->root);
    free(w);
}

void warehouse_clear(Warehouse *w) {
    if (!w) return;
    avl_free_tree(w->root);
    w->root = NULL;
    w->interval_count = 0;
    w->total_packages = 0;
    w->bridge_count = 0;
    w->extension_count = 0;
    w->creation_count = 0;
    w->duplicate_count = 0;
}

ArrivalEvent warehouse_add_detailed(Warehouse *w, package_id_t id) {
    ArrivalEvent ev;
    memset(&ev, 0, sizeof(ArrivalEvent));
    ev.package_id = id;

    if (!w || id < 0) {
        ev.result = ARRIVAL_DUPLICATE;
        return ev;
    }

    struct timespec ts_start, ts_end;
    clock_gettime(CLOCK_MONOTONIC, &ts_start);

    ev.prev_interval_count = w->interval_count;

    Node *containing = NULL, *pred = NULL, *succ = NULL;
    avl_find_pred_succ(w->root, id, &containing, &pred, &succ);

    if (containing) {
        w->duplicate_count++;
        ev.result = ARRIVAL_DUPLICATE;
        ev.new_interval_count = w->interval_count;
        ev.touched_prev[0].start = containing->start;
        ev.touched_prev[0].end = containing->end;
        ev.touched_prev_count = 1;
        ev.touched_new = ev.touched_prev[0];

        clock_gettime(CLOCK_MONOTONIC, &ts_end);
        ev.execution_time_ns = (ts_end.tv_sec - ts_start.tv_sec) * 1000000000LL + (ts_end.tv_nsec - ts_start.tv_nsec);
        return ev;
    }

    bool touches_pred = (pred && pred->end + 1 == id);
    bool touches_succ = (succ && succ->start - 1 == id);

    w->total_packages++;

    /* Bridge merge */
    if (touches_pred && touches_succ) {
        w->bridge_count++;
        ev.result = ARRIVAL_BRIDGED;
        ev.touched_prev[0].start = pred->start;
        ev.touched_prev[0].end = pred->end;
        ev.touched_prev[1].start = succ->start;
        ev.touched_prev[1].end = succ->end;
        ev.touched_prev_count = 2;

        package_id_t final_start = pred->start;
        package_id_t final_end = succ->end;
        package_id_t succ_start = succ->start;

        w->root = avl_delete(w->root, succ_start);

        Node *d1 = NULL, *d2 = NULL;
        avl_find_pred_succ(w->root, id, &d1, &pred, &d2);
        if (pred) {
            pred->end = final_end;
        }

        w->interval_count--;
        ev.touched_new.start = final_start;
        ev.touched_new.end = final_end;
    }
    /* Extend predecessor right */
    else if (touches_pred) {
        w->extension_count++;
        ev.result = ARRIVAL_EXTENDED_RIGHT;
        ev.touched_prev[0].start = pred->start;
        ev.touched_prev[0].end = pred->end;
        ev.touched_prev_count = 1;

        pred->end = id;
        ev.touched_new.start = pred->start;
        ev.touched_new.end = id;
    }
    /* Extend successor left */
    else if (touches_succ) {
        w->extension_count++;
        ev.result = ARRIVAL_EXTENDED_LEFT;
        ev.touched_prev[0].start = succ->start;
        ev.touched_prev[0].end = succ->end;
        ev.touched_prev_count = 1;

        package_id_t old_start = succ->start;
        package_id_t old_end = succ->end;
        w->root = avl_delete(w->root, old_start);
        w->root = avl_insert(w->root, id, old_end);

        ev.touched_new.start = id;
        ev.touched_new.end = old_end;
    }
    /* Isolated creation */
    else {
        w->creation_count++;
        ev.result = ARRIVAL_CREATED;
        ev.touched_prev_count = 0;

        w->root = avl_insert(w->root, id, id);
        w->interval_count++;

        ev.touched_new.start = id;
        ev.touched_new.end = id;
    }

    ev.new_interval_count = w->interval_count;

    clock_gettime(CLOCK_MONOTONIC, &ts_end);
    ev.execution_time_ns = (ts_end.tv_sec - ts_start.tv_sec) * 1000000000LL + (ts_end.tv_nsec - ts_start.tv_nsec);
    return ev;
}

ArrivalResult warehouse_add(Warehouse *w, package_id_t id) {
    ArrivalEvent ev = warehouse_add_detailed(w, id);
    return ev.result;
}

size_t warehouse_add_batch(Warehouse *w, const package_id_t *ids, size_t count) {
    if (!w || !ids) return 0;
    size_t added = 0;
    for (size_t i = 0; i < count; i++) {
        ArrivalResult r = warehouse_add(w, ids[i]);
        if (r != ARRIVAL_DUPLICATE) added++;
    }
    return added;
}

bool warehouse_contains(const Warehouse *w, package_id_t id) {
    if (!w || id < 0) return false;
    Node *c = NULL, *p = NULL, *s = NULL;
    avl_find_pred_succ(w->root, id, &c, &p, &s);
    return (c != NULL);
}

size_t warehouse_interval_count(const Warehouse *w) {
    return w ? w->interval_count : 0;
}

size_t warehouse_total_packages(const Warehouse *w) {
    return w ? w->total_packages : 0;
}

bool warehouse_find_neighbors(const Warehouse *w, package_id_t id,
                              Interval *out_containing,
                              Interval *out_pred,
                              Interval *out_succ) {
    if (!w) return false;
    Node *c = NULL, *p = NULL, *s = NULL;
    avl_find_pred_succ(w->root, id, &c, &p, &s);

    if (out_containing) {
        if (c) {
            out_containing->start = c->start;
            out_containing->end = c->end;
        } else {
            out_containing->start = -1;
            out_containing->end = -1;
        }
    }
    if (out_pred) {
        if (p) {
            out_pred->start = p->start;
            out_pred->end = p->end;
        } else {
            out_pred->start = -1;
            out_pred->end = -1;
        }
    }
    if (out_succ) {
        if (s) {
            out_succ->start = s->start;
            out_succ->end = s->end;
        } else {
            out_succ->start = -1;
            out_succ->end = -1;
        }
    }
    return (c != NULL);
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
    avl_collect_inorder(w->root, arr, 0);
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

/* Tree snapshot builder */
typedef struct {
    AVLNodeSnapshot *nodes;
    size_t count;
    size_t cap;
    int max_depth;
    int64_t next_id;
} SnapshotBuilder;

static int64_t build_snapshot_recursive(Node *n, int depth, int64_t parent_id, SnapshotBuilder *sb) {
    if (!n) return -1;
    if (depth > sb->max_depth) sb->max_depth = depth;

    if (sb->count >= sb->cap) {
        size_t ncap = sb->cap ? sb->cap * 2 : 16;
        AVLNodeSnapshot *nnodes = (AVLNodeSnapshot *)realloc(sb->nodes, sizeof(AVLNodeSnapshot) * ncap);
        if (!nnodes) return -1;
        sb->nodes = nnodes;
        sb->cap = ncap;
    }

    int64_t my_id = sb->next_id++;
    size_t my_idx = sb->count++;

    sb->nodes[my_idx].start = n->start;
    sb->nodes[my_idx].end = n->end;
    sb->nodes[my_idx].height = n->height;
    sb->nodes[my_idx].balance_factor = avl_balance_factor(n);
    sb->nodes[my_idx].depth = depth;
    sb->nodes[my_idx].node_id = my_id;
    sb->nodes[my_idx].parent_id = parent_id;

    int64_t lid = build_snapshot_recursive(n->left, depth + 1, my_id, sb);
    int64_t rid = build_snapshot_recursive(n->right, depth + 1, my_id, sb);

    sb->nodes[my_idx].left_id = lid;
    sb->nodes[my_idx].right_id = rid;

    return my_id;
}

TreeSnapshot warehouse_get_tree_snapshot(const Warehouse *w) {
    TreeSnapshot ts;
    ts.node_count = 0;
    ts.max_depth = 0;
    ts.nodes = NULL;

    if (!w || !w->root) return ts;

    SnapshotBuilder sb;
    sb.nodes = NULL;
    sb.count = 0;
    sb.cap = 0;
    sb.max_depth = 0;
    sb.next_id = 1;

    build_snapshot_recursive(w->root, 0, -1, &sb);

    ts.node_count = sb.count;
    ts.max_depth = sb.max_depth;
    ts.nodes = sb.nodes;
    return ts;
}

void warehouse_free_tree_snapshot(TreeSnapshot snapshot) {
    if (snapshot.nodes) {
        free(snapshot.nodes);
    }
}

WarehouseAnalytics warehouse_get_analytics(const Warehouse *w) {
    WarehouseAnalytics a;
    memset(&a, 0, sizeof(a));
    if (!w) return a;

    a.total_packages = w->total_packages;
    a.interval_count = w->interval_count;
    a.bridge_count = w->bridge_count;
    a.extension_count = w->extension_count;
    a.creation_count = w->creation_count;
    a.duplicate_count = w->duplicate_count;

    size_t count = 0;
    Interval *ivs = warehouse_get_intervals(w, &count);
    if (count > 0 && ivs) {
        a.min_id = ivs[0].start;
        a.max_id = ivs[count - 1].end;
        package_id_t total_covered = 0;
        package_id_t largest = 0;

        for (size_t i = 0; i < count; i++) {
            package_id_t sz = ivs[i].end - ivs[i].start + 1;
            if (sz > largest) largest = sz;
            total_covered += sz;
        }

        a.largest_interval_size = largest;
        a.avg_interval_size = (double)total_covered / (double)count;
        package_id_t span = a.max_id - a.min_id + 1;
        a.coverage_ratio = (span > 0) ? ((double)total_covered / (double)span) : 1.0;
        free(ivs);
    }
    return a;
}

char *warehouse_export_csv(const Warehouse *w) {
    if (!w) return strdup("");
    size_t count = 0;
    Interval *ivs = warehouse_get_intervals(w, &count);
    if (!ivs || count == 0) return strdup("start,end,size\n");

    size_t est_size = 32 + count * 40;
    char *buf = (char *)malloc(est_size);
    if (!buf) {
        free(ivs);
        return NULL;
    }

    int pos = snprintf(buf, est_size, "start,end,size\n");
    for (size_t i = 0; i < count; i++) {
        package_id_t sz = ivs[i].end - ivs[i].start + 1;
        pos += snprintf(buf + pos, est_size - pos, "%" PRId64 ",%" PRId64 ",%" PRId64 "\n",
                        ivs[i].start, ivs[i].end, sz);
    }
    free(ivs);
    return buf;
}

size_t warehouse_import_csv(Warehouse *w, const char *csv_data) {
    if (!w || !csv_data) return 0;
    size_t imported = 0;
    const char *line = csv_data;

    /* Skip header if present */
    if (strncmp(line, "start", 5) == 0) {
        const char *next = strchr(line, '\n');
        if (next) line = next + 1;
        else return 0;
    }

    while (*line) {
        long long s = 0, e = 0;
        if (sscanf(line, "%lld,%lld", &s, &e) >= 1) {
            if (e < s) e = s;
            for (long long id = s; id <= e; id++) {
                if (warehouse_add(w, (package_id_t)id) != ARRIVAL_DUPLICATE) {
                    imported++;
                }
            }
        }
        const char *next = strchr(line, '\n');
        if (!next) break;
        line = next + 1;
    }
    return imported;
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
