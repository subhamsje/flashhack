#include <stdio.h>
#include <stdlib.h>
#include <assert.h>
#include "warehouse.h"

int main(void) {
    printf("Running warehouse tests...\n");

    /* 1. Illustrative example */
    Warehouse *w = warehouse_create();
    assert(warehouse_add(w, 1) == ARRIVAL_CREATED);
    assert(warehouse_add(w, 3) == ARRIVAL_CREATED);
    assert(warehouse_add(w, 7) == ARRIVAL_CREATED);
    assert(warehouse_add(w, 2) == ARRIVAL_BRIDGED);
    assert(warehouse_add(w, 6) == ARRIVAL_EXTENDED_LEFT);

    assert(warehouse_interval_count(w) == 2);
    assert(warehouse_total_packages(w) == 5);

    size_t count = 0;
    Interval *iv = warehouse_get_intervals(w, &count);
    assert(count == 2);
    assert(iv[0].start == 1 && iv[0].end == 3);
    assert(iv[1].start == 6 && iv[1].end == 7);
    free(iv);

    size_t gap_count = 0;
    Interval *gaps = warehouse_query_gaps(w, 1, 7, &gap_count);
    assert(gap_count == 1);
    assert(gaps[0].start == 4 && gaps[0].end == 5);
    free(gaps);

    /* 2. Duplicate handling */
    assert(warehouse_add(w, 1) == ARRIVAL_DUPLICATE);
    assert(warehouse_add(w, 2) == ARRIVAL_DUPLICATE);
    assert(warehouse_add(w, 7) == ARRIVAL_DUPLICATE);
    assert(warehouse_interval_count(w) == 2);

    /* 3. Right extension */
    assert(warehouse_add(w, 4) == ARRIVAL_EXTENDED_RIGHT);
    /* Now [1, 4] and [6, 7] */
    assert(warehouse_interval_count(w) == 2);

    /* 4. Complete bridge */
    assert(warehouse_add(w, 5) == ARRIVAL_BRIDGED);
    /* Now [1, 7] */
    assert(warehouse_interval_count(w) == 1);

    iv = warehouse_get_intervals(w, &count);
    assert(count == 1);
    assert(iv[0].start == 1 && iv[0].end == 7);
    free(iv);

    warehouse_free(w);

    /* 5. Sparse large IDs */
    Warehouse *w2 = warehouse_create();
    assert(warehouse_add(w2, 0) == ARRIVAL_CREATED);
    assert(warehouse_add(w2, 500000000) == ARRIVAL_CREATED);
    assert(warehouse_add(w2, 1000000000) == ARRIVAL_CREATED);
    assert(warehouse_contains(w2, 0));
    assert(warehouse_contains(w2, 500000000));
    assert(warehouse_contains(w2, 1000000000));
    assert(!warehouse_contains(w2, 1));

    warehouse_free(w2);

    /* 6. Random stress test (50,000 unique IDs) */
    Warehouse *w3 = warehouse_create();
    uint64_t seed = 42;
    for (int i = 0; i < 50000; i++) {
        seed = seed * 6364136223846793005ULL + 1;
        package_id_t id = (package_id_t)(seed % 1000000000ULL);
        warehouse_add(w3, id);
    }
    assert(warehouse_total_packages(w3) > 0);

    /* Verify intervals are strictly disjoint and ordered */
    iv = warehouse_get_intervals(w3, &count);
    for (size_t i = 1; i < count; i++) {
        assert(iv[i - 1].end + 1 < iv[i].start);
    }
    free(iv);
    warehouse_free(w3);

    printf("All tests passed successfully.\n");
    return 0;
}
