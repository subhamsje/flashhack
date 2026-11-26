#include "warehouse_index.h"
#include "avl_tree.h"
#include <stdlib.h>
#include <stdio.h>
#include <inttypes.h>

struct WarehouseIndex {
    AVLNode *root;
    size_t interval_count;
    size_t total_packages;
};

WarehouseIndex *warehouse_index_create(void) {
    WarehouseIndex *index = (WarehouseIndex *)malloc(sizeof(WarehouseIndex));
    if (!index) return NULL;
    index->root = NULL;
    index->interval_count = 0;
    index->total_packages = 0;
    return index;
}

void warehouse_index_free(WarehouseIndex *index) {
    if (!index) return;
    avl_free_tree(index->root);
    free(index);
}

void warehouse_index_clear(WarehouseIndex *index) {
    if (!index) return;
    avl_free_tree(index->root);
    index->root = NULL;
    index->interval_count = 0;
    index->total_packages = 0;
}

ArrivalResult warehouse_index_add(WarehouseIndex *index, package_id_t id) {
    if (!index || id < 0) return ARRIVAL_DUPLICATE;

    AVLNode *containing = NULL;
    AVLNode *pred = NULL;
    AVLNode *succ = NULL;

    avl_find_pred_succ(index->root, id, &containing, &pred, &succ);

    /* Case 1: Duplicate */
    if (containing != NULL) {
        return ARRIVAL_DUPLICATE;
    }

    bool touches_pred = (pred != NULL && pred->end + 1 == id);
    bool touches_succ = (succ != NULL && succ->start - 1 == id);

    index->total_packages++;

    /* Case 2: Bridge merge between predecessor and successor */
    if (touches_pred && touches_succ) {
        package_id_t succ_start = succ->start;
        package_id_t succ_end = succ->end;

        /* Delete successor node from AVL tree */
        index->root = avl_delete(index->root, succ_start);

        /* Re-find predecessor to ensure valid pointer after rebalance */
        AVLNode *dummy1 = NULL, *dummy2 = NULL;
        avl_find_pred_succ(index->root, id, &dummy1, &pred, &dummy2);

        if (pred) {
            pred->end = succ_end;
        }

        index->interval_count--;
        return ARRIVAL_BRIDGED;
    }

    /* Case 3: Extends predecessor to the right */
    if (touches_pred) {
        pred->end = id;
        return ARRIVAL_EXTENDED_RIGHT;
    }

    /* Case 4: Extends successor to the left */
    if (touches_succ) {
        package_id_t old_start = succ->start;
        package_id_t old_end = succ->end;

        /* Remove old successor and re-insert with expanded [id, old_end] */
        index->root = avl_delete(index->root, old_start);
        index->root = avl_insert(index->root, id, old_end);

        return ARRIVAL_EXTENDED_LEFT;
    }

    /* Case 5: Isolated arrival, creates a new interval [id, id] */
    index->root = avl_insert(index->root, id, id);
    index->interval_count++;
    return ARRIVAL_CREATED;
}

size_t warehouse_index_add_batch(WarehouseIndex *index, const package_id_t *ids, size_t count) {
    if (!index || !ids) return 0;
    size_t added = 0;
    for (size_t i = 0; i < count; i++) {
        ArrivalResult res = warehouse_index_add(index, ids[i]);
        if (res != ARRIVAL_DUPLICATE) {
            added++;
        }
    }
    return added;
}

bool warehouse_index_contains(const WarehouseIndex *index, package_id_t id) {
    if (!index || id < 0) return false;
    AVLNode *containing = NULL, *pred = NULL, *succ = NULL;
    avl_find_pred_succ(index->root, id, &containing, &pred, &succ);
    return (containing != NULL);
}

size_t warehouse_index_interval_count(const WarehouseIndex *index) {
    return index ? index->interval_count : 0;
}

size_t warehouse_index_total_packages(const WarehouseIndex *index) {
    return index ? index->total_packages : 0;
}

Interval *warehouse_index_get_all_intervals(const WarehouseIndex *index, size_t *out_count) {
    if (!index || !out_count) return NULL;
    *out_count = index->interval_count;
    if (index->interval_count == 0) return NULL;

    Interval *arr = (Interval *)malloc(sizeof(Interval) * index->interval_count);
    if (!arr) {
        *out_count = 0;
        return NULL;
    }

    avl_collect_inorder(index->root, arr, 0);
    return arr;
}

/* Helper collector for range queries */
typedef struct {
    Interval *intervals;
    size_t count;
    size_t capacity;
    package_id_t low;
    package_id_t high;
} RangeCollector;

static void range_collector_visit(package_id_t start, package_id_t end, void *user_data) {
    RangeCollector *col = (RangeCollector *)user_data;
    if (col->count >= col->capacity) {
        size_t new_cap = (col->capacity == 0) ? 8 : (col->capacity * 2);
        Interval *new_arr = (Interval *)realloc(col->intervals, sizeof(Interval) * new_cap);
        if (!new_arr) return;
        col->intervals = new_arr;
        col->capacity = new_cap;
    }

    package_id_t clamped_start = (start < col->low) ? col->low : start;
    package_id_t clamped_end = (end > col->high) ? col->high : end;

    if (clamped_start <= clamped_end) {
        col->intervals[col->count].start = clamped_start;
        col->intervals[col->count].end = clamped_end;
        col->count++;
    }
}

Interval *warehouse_index_query_intervals_in_range(const WarehouseIndex *index,
                                                   package_id_t low,
                                                   package_id_t high,
                                                   size_t *out_count) {
    if (!out_count) return NULL;
    *out_count = 0;
    if (!index || low > high || low < 0) return NULL;

    RangeCollector col = { NULL, 0, 0, low, high };
    avl_traverse_range(index->root, low, high, range_collector_visit, &col);

    *out_count = col.count;
    return col.intervals;
}

Interval *warehouse_index_query_gaps(const WarehouseIndex *index,
                                     package_id_t low,
                                     package_id_t high,
                                     size_t *out_count) {
    if (!out_count) return NULL;
    *out_count = 0;
    if (!index || low > high || low < 0) return NULL;

    size_t interval_count = 0;
    Interval *intervals = warehouse_index_query_intervals_in_range(index, low, high, &interval_count);

    /* If no intervals overlap, the entire [low, high] is a gap */
    if (interval_count == 0) {
        Interval *gaps = (Interval *)malloc(sizeof(Interval));
        if (!gaps) return NULL;
        gaps[0].start = low;
        gaps[0].end = high;
        *out_count = 1;
        free(intervals);
        return gaps;
    }

    size_t gap_capacity = interval_count + 1;
    Interval *gaps = (Interval *)malloc(sizeof(Interval) * gap_capacity);
    if (!gaps) {
        free(intervals);
        return NULL;
    }

    size_t gap_count = 0;
    package_id_t current = low;

    for (size_t i = 0; i < interval_count; i++) {
        if (current < intervals[i].start) {
            gaps[gap_count].start = current;
            gaps[gap_count].end = intervals[i].start - 1;
            gap_count++;
        }
        current = intervals[i].end + 1;
    }

    if (current <= high) {
        gaps[gap_count].start = current;
        gaps[gap_count].end = high;
        gap_count++;
    }

    free(intervals);

    if (gap_count == 0) {
        free(gaps);
        *out_count = 0;
        return NULL;
    }

    *out_count = gap_count;
    return gaps;
}

const char *arrival_result_to_string(ArrivalResult res) {
    switch (res) {
        case ARRIVAL_CREATED:        return "CREATED";
        case ARRIVAL_EXTENDED_LEFT:  return "EXTENDED_LEFT";
        case ARRIVAL_EXTENDED_RIGHT: return "EXTENDED_RIGHT";
        case ARRIVAL_BRIDGED:        return "BRIDGED";
        case ARRIVAL_DUPLICATE:      return "DUPLICATE_IGNORED";
        default:                     return "UNKNOWN";
    }
}

void warehouse_index_print_summary(const WarehouseIndex *index) {
    if (!index) {
        printf("Index is NULL.\n");
        return;
    }

    printf("=== Warehouse Live Arrival Index Summary ===\n");
    printf("Total Received Packages : %zu\n", index->total_packages);
    printf("Active Disjoint Ranges  : %zu\n", index->interval_count);

    size_t count = 0;
    Interval *intervals = warehouse_index_get_all_intervals(index, &count);

    printf("Current Intervals: [");
    for (size_t i = 0; i < count; i++) {
        printf("[%" PRId64 ", %" PRId64 "]%s",
               intervals[i].start, intervals[i].end,
               (i + 1 < count) ? ", " : "");
    }
    printf("]\n");

    free(intervals);
}

void warehouse_index_print_report(const WarehouseIndex *index, package_id_t low, package_id_t high) {
    if (!index) return;

    printf("\n------------------------------------------------------------\n");
    printf(" Warehouse Window Report for Bounded Range [%" PRId64 ", %" PRId64 "]\n", low, high);
    printf("------------------------------------------------------------\n");

    size_t recv_count = 0;
    Interval *recv = warehouse_index_query_intervals_in_range(index, low, high, &recv_count);

    size_t gap_count = 0;
    Interval *gaps = warehouse_index_query_gaps(index, low, high, &gap_count);

    printf("Received Intervals within [%" PRId64 ", %" PRId64 "]: ", low, high);
    if (recv_count == 0) {
        printf("None\n");
    } else {
        printf("[");
        for (size_t i = 0; i < recv_count; i++) {
            printf("[%" PRId64 ", %" PRId64 "]%s",
                   recv[i].start, recv[i].end,
                   (i + 1 < recv_count) ? ", " : "");
        }
        printf("]\n");
    }

    printf("Missing Intervals (Gaps) within [%" PRId64 ", %" PRId64 "]: ", low, high);
    if (gap_count == 0) {
        printf("None (100%% complete!)\n");
    } else {
        printf("[");
        for (size_t i = 0; i < gap_count; i++) {
            printf("[%" PRId64 ", %" PRId64 "]%s",
                   gaps[i].start, gaps[i].end,
                   (i + 1 < gap_count) ? ", " : "");
        }
        printf("]\n");
    }

    free(recv);
    free(gaps);
    printf("------------------------------------------------------------\n");
}
