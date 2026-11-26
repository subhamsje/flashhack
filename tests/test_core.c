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

    /* Snapshot test */
    TreeSnapshot snap = warehouse_get_tree_snapshot(w);
    assert(snap.node_count == 2);
    assert(snap.nodes != NULL);
    warehouse_free_tree_snapshot(snap);

    /* Analytics test */
    WarehouseAnalytics an = warehouse_get_analytics(w);
    assert(an.total_packages == 5);
    assert(an.interval_count == 2);
    assert(an.bridge_count == 1);
    assert(an.min_id == 1 && an.max_id == 7);

    /* CSV export & import */
    char *csv = warehouse_export_csv(w);
    assert(csv != NULL);

    Warehouse *w_copy = warehouse_create();
    size_t imported = warehouse_import_csv(w_copy, csv);
    assert(imported == 5);
    assert(warehouse_interval_count(w_copy) == 2);
    free(csv);
    warehouse_free(w_copy);

    warehouse_free(w);
    printf("Core engine tests passed successfully!\n");
    return 0;
}
