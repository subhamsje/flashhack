#include "warehouse.h"
#include <stdio.h>
#include <stdlib.h>
#include <assert.h>
#include <inttypes.h>

int main(void) {
    printf("Testing refactored core engine...\n");
    Warehouse *w = warehouse_create();

    /* 1. Illustrative sequence: [1, 3, 7, 2, 6] */
    ArrivalEvent ev1 = warehouse_add_detailed(w, 1);
    assert(ev1.result == ARRIVAL_CREATED);
    assert(ev1.touched_new.start == 1 && ev1.touched_new.end == 1);

    ArrivalEvent ev2 = warehouse_add_detailed(w, 3);
    assert(ev2.result == ARRIVAL_CREATED);

    ArrivalEvent ev3 = warehouse_add_detailed(w, 7);
    assert(ev3.result == ARRIVAL_CREATED);

    /* Bridge merge with 2 */
    ArrivalEvent ev4 = warehouse_add_detailed(w, 2);
    assert(ev4.result == ARRIVAL_BRIDGED);
    assert(ev4.touched_prev_count == 2);
    assert(ev4.touched_new.start == 1 && ev4.touched_new.end == 3);
    assert(ev4.prev_interval_count == 3);
    assert(ev4.new_interval_count == 2);

    /* Left extension with 6 */
    ArrivalEvent ev5 = warehouse_add_detailed(w, 6);
    assert(ev5.result == ARRIVAL_EXTENDED_LEFT);
    assert(ev5.touched_new.start == 6 && ev5.touched_new.end == 7);

    /* Duplicate check */
    ArrivalEvent ev6 = warehouse_add_detailed(w, 2);
    assert(ev6.result == ARRIVAL_DUPLICATE);

    /* Neighbor lookup */
    Interval containing, pred, succ;
    bool found = warehouse_find_neighbors(w, 4, &containing, &pred, &succ);
    assert(!found);
    assert(pred.start == 1 && pred.end == 3);
    assert(succ.start == 6 && succ.end == 7);

    found = warehouse_find_neighbors(w, 2, &containing, &pred, &succ);
    assert(found);
    assert(containing.start == 1 && containing.end == 3);

    /* Removal tests covering all cases:
     * Current intervals: [1, 3] and [6, 7]
     */
    /* Case 1: Middle element removal: split [1, 7] */
    warehouse_add(w, 4);
    warehouse_add(w, 5);
    /* Now [1, 7] is a single interval */
    assert(warehouse_interval_count(w) == 1);
    assert(warehouse_total_packages(w) == 7);

    /* Remove 4 -> split into [1, 3] and [5, 7] */
    RemovalResult rem_split = warehouse_remove(w, 4);
    assert(rem_split == REMOVAL_SPLIT);
    assert(warehouse_interval_count(w) == 2);
    assert(warehouse_total_packages(w) == 6);
    assert(!warehouse_contains(w, 4));
    assert(warehouse_contains(w, 3));
    assert(warehouse_contains(w, 5));

    /* Case 2: Left boundary removal: [5, 7] - 5 -> [6, 7] */
    RemovalResult rem_left = warehouse_remove(w, 5);
    assert(rem_left == REMOVAL_SHRUNK_LEFT);
    assert(warehouse_interval_count(w) == 2);
    assert(warehouse_total_packages(w) == 5);
    assert(!warehouse_contains(w, 5));

    /* Case 3: Right boundary removal: [6, 7] - 7 -> [6, 6] */
    RemovalResult rem_right = warehouse_remove(w, 7);
    assert(rem_right == REMOVAL_SHRUNK_RIGHT);
    assert(warehouse_interval_count(w) == 2);
    assert(warehouse_total_packages(w) == 4);
    assert(!warehouse_contains(w, 7));

    /* Case 4: Isolated node deletion: [6, 6] - 6 -> node deleted */
    RemovalResult rem_del = warehouse_remove(w, 6);
    assert(rem_del == REMOVAL_NODE_DELETED);
    assert(warehouse_interval_count(w) == 1);
    assert(warehouse_total_packages(w) == 3); /* [1, 3] remains */

    /* Case 5: Remove non-existent ID */
    RemovalResult rem_none = warehouse_remove(w, 9999);
    assert(rem_none == REMOVAL_NOT_FOUND);

    /* Snapshot test */
    TreeSnapshot snap = warehouse_get_tree_snapshot(w);
    assert(snap.node_count == 1);
    assert(snap.nodes != NULL);
    warehouse_free_tree_snapshot(snap);

    /* Analytics test */
    WarehouseAnalytics an = warehouse_get_analytics(w);
    assert(an.total_packages == 3);
    assert(an.interval_count == 1);
    assert(an.min_id == 1 && an.max_id == 3);

    /* CSV export & import */
    char *csv = warehouse_export_csv(w);
    assert(csv != NULL);

    Warehouse *w_copy = warehouse_create();
    size_t imported = warehouse_import_csv(w_copy, csv);
    assert(imported == 3);
    assert(warehouse_interval_count(w_copy) == 1);
    free(csv);
    warehouse_free(w_copy);

    warehouse_free(w);
    printf("Core engine tests passed successfully!\n");
    return 0;
}
