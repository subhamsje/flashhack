#include <stdio.h>
#include <stdlib.h>
#include <assert.h>
#include <inttypes.h>
#include <time.h>
#include "warehouse_index.h"

static void test_illustrative_example(void) {
    printf("[TEST 1] Illustrative Example [1, 3, 7, 2, 6] ... ");
    WarehouseIndex *idx = warehouse_index_create();

    assert(warehouse_index_add(idx, 1) == ARRIVAL_CREATED);
    assert(warehouse_index_add(idx, 3) == ARRIVAL_CREATED);
    assert(warehouse_index_add(idx, 7) == ARRIVAL_CREATED);
    assert(warehouse_index_add(idx, 2) == ARRIVAL_BRIDGED);
    assert(warehouse_index_add(idx, 6) == ARRIVAL_EXTENDED_LEFT);

    assert(warehouse_index_interval_count(idx) == 2);
    assert(warehouse_index_total_packages(idx) == 5);

    size_t count = 0;
    Interval *intervals = warehouse_index_get_all_intervals(idx, &count);
    assert(count == 2);
    assert(intervals[0].start == 1 && intervals[0].end == 3);
    assert(intervals[1].start == 6 && intervals[1].end == 7);
    free(intervals);

    /* Range query [1, 7] */
    size_t gap_count = 0;
    Interval *gaps = warehouse_index_query_gaps(idx, 1, 7, &gap_count);
    assert(gap_count == 1);
    assert(gaps[0].start == 4 && gaps[0].end == 5);
    free(gaps);

    warehouse_index_free(idx);
    printf("PASSED\n");
}

static void test_duplicate_arrivals(void) {
    printf("[TEST 2] Duplicate Arrivals Handling ... ");
    WarehouseIndex *idx = warehouse_index_create();

    assert(warehouse_index_add(idx, 10) == ARRIVAL_CREATED);
    assert(warehouse_index_add(idx, 11) == ARRIVAL_EXTENDED_RIGHT);
    assert(warehouse_index_add(idx, 12) == ARRIVAL_EXTENDED_RIGHT);

    /* Duplicates */
    assert(warehouse_index_add(idx, 10) == ARRIVAL_DUPLICATE);
    assert(warehouse_index_add(idx, 11) == ARRIVAL_DUPLICATE);
    assert(warehouse_index_add(idx, 12) == ARRIVAL_DUPLICATE);

    assert(warehouse_index_interval_count(idx) == 1);
    assert(warehouse_index_total_packages(idx) == 3);

    size_t count = 0;
    Interval *arr = warehouse_index_get_all_intervals(idx, &count);
    assert(count == 1);
    assert(arr[0].start == 10 && arr[0].end == 12);
    free(arr);

    warehouse_index_free(idx);
    printf("PASSED\n");
}

static void test_boundary_extensions(void) {
    printf("[TEST 3] Boundary Extensions (Left & Right) ... ");
    WarehouseIndex *idx = warehouse_index_create();

    /* Create [20, 20] */
    assert(warehouse_index_add(idx, 20) == ARRIVAL_CREATED);

    /* Extend right to [20, 21] */
    assert(warehouse_index_add(idx, 21) == ARRIVAL_EXTENDED_RIGHT);

    /* Extend left to [19, 21] */
    assert(warehouse_index_add(idx, 19) == ARRIVAL_EXTENDED_LEFT);

    /* Extend left to [18, 21] */
    assert(warehouse_index_add(idx, 18) == ARRIVAL_EXTENDED_LEFT);

    /* Extend right to [18, 22] */
    assert(warehouse_index_add(idx, 22) == ARRIVAL_EXTENDED_RIGHT);

    assert(warehouse_index_interval_count(idx) == 1);
    assert(warehouse_index_total_packages(idx) == 5);

    size_t count = 0;
    Interval *arr = warehouse_index_get_all_intervals(idx, &count);
    assert(count == 1);
    assert(arr[0].start == 18 && arr[0].end == 22);
    free(arr);

    warehouse_index_free(idx);
    printf("PASSED\n");
}

static void test_bridge_merges(void) {
    printf("[TEST 4] Bridge Merges (Connecting 2 Disjoint Intervals) ... ");
    WarehouseIndex *idx = warehouse_index_create();

    /* Intervals: [10, 15] and [17, 20] */
    for (package_id_t i = 10; i <= 15; i++) warehouse_index_add(idx, i);
    for (package_id_t i = 17; i <= 20; i++) warehouse_index_add(idx, i);

    assert(warehouse_index_interval_count(idx) == 2);

    /* Bridge ID 16 */
    ArrivalResult res = warehouse_index_add(idx, 16);
    assert(res == ARRIVAL_BRIDGED);
    assert(warehouse_index_interval_count(idx) == 1);

    size_t count = 0;
    Interval *arr = warehouse_index_get_all_intervals(idx, &count);
    assert(count == 1);
    assert(arr[0].start == 10 && arr[0].end == 20);
    free(arr);

    warehouse_index_free(idx);
    printf("PASSED\n");
}

static void test_multi_interval_bridge_cascade(void) {
    printf("[TEST 5] Multiple Interval Bridge Cascade ... ");
    WarehouseIndex *idx = warehouse_index_create();

    /* Create [2, 2], [4, 4], [6, 6] */
    warehouse_index_add(idx, 2);
    warehouse_index_add(idx, 4);
    warehouse_index_add(idx, 6);
    assert(warehouse_index_interval_count(idx) == 3);

    /* Bridge 2 and 4 with 3 */
    assert(warehouse_index_add(idx, 3) == ARRIVAL_BRIDGED);
    assert(warehouse_index_interval_count(idx) == 2); /* [2, 4], [6, 6] */

    /* Bridge [2, 4] and [6, 6] with 5 */
    assert(warehouse_index_add(idx, 5) == ARRIVAL_BRIDGED);
    assert(warehouse_index_interval_count(idx) == 1); /* [2, 6] */

    size_t count = 0;
    Interval *arr = warehouse_index_get_all_intervals(idx, &count);
    assert(count == 1);
    assert(arr[0].start == 2 && arr[0].end == 6);
    free(arr);

    warehouse_index_free(idx);
    printf("PASSED\n");
}

static void test_bounded_range_and_gap_queries(void) {
    printf("[TEST 6] Bounded Range and Gap Window Queries ... ");
    WarehouseIndex *idx = warehouse_index_create();

    /* Intervals: [10, 20], [30, 40], [50, 60] */
    for (package_id_t i = 10; i <= 20; i++) warehouse_index_add(idx, i);
    for (package_id_t i = 30; i <= 40; i++) warehouse_index_add(idx, i);
    for (package_id_t i = 50; i <= 60; i++) warehouse_index_add(idx, i);

    /* Query [0, 100] */
    size_t g_count = 0;
    Interval *gaps = warehouse_index_query_gaps(idx, 0, 100, &g_count);
    assert(g_count == 4);
    assert(gaps[0].start == 0 && gaps[0].end == 9);
    assert(gaps[1].start == 21 && gaps[1].end == 29);
    assert(gaps[2].start == 41 && gaps[2].end == 49);
    assert(gaps[3].start == 61 && gaps[3].end == 100);
    free(gaps);

    /* Query inside an interval [12, 18] -> no gaps */
    gaps = warehouse_index_query_gaps(idx, 12, 18, &g_count);
    assert(g_count == 0 && gaps == NULL);

    /* Query entirely in a gap [22, 28] -> 1 gap */
    gaps = warehouse_index_query_gaps(idx, 22, 28, &g_count);
    assert(g_count == 1);
    assert(gaps[0].start == 22 && gaps[0].end == 28);
    free(gaps);

    /* Clamped intervals query [15, 35] */
    size_t r_count = 0;
    Interval *recv = warehouse_index_query_intervals_in_range(idx, 15, 35, &r_count);
    assert(r_count == 2);
    assert(recv[0].start == 15 && recv[0].end == 20);
    assert(recv[1].start == 30 && recv[1].end == 35);
    free(recv);

    warehouse_index_free(idx);
    printf("PASSED\n");
}

static void test_sparse_and_large_ids(void) {
    printf("[TEST 7] Sparse and Large IDs (0 to 10^9) ... ");
    WarehouseIndex *idx = warehouse_index_create();

    assert(warehouse_index_add(idx, 0) == ARRIVAL_CREATED);
    assert(warehouse_index_add(idx, 500000000) == ARRIVAL_CREATED);
    assert(warehouse_index_add(idx, 1000000000) == ARRIVAL_CREATED);

    assert(warehouse_index_interval_count(idx) == 3);
    assert(warehouse_index_contains(idx, 0));
    assert(warehouse_index_contains(idx, 500000000));
    assert(warehouse_index_contains(idx, 1000000000));
    assert(!warehouse_index_contains(idx, 1));
    assert(!warehouse_index_contains(idx, 499999999));

    /* Bridge test at large IDs */
    assert(warehouse_index_add(idx, 999999999) == ARRIVAL_EXTENDED_LEFT);
    assert(warehouse_index_interval_count(idx) == 3);

    size_t count = 0;
    Interval *arr = warehouse_index_get_all_intervals(idx, &count);
    assert(count == 3);
    assert(arr[0].start == 0 && arr[0].end == 0);
    assert(arr[1].start == 500000000 && arr[1].end == 500000000);
    assert(arr[2].start == 999999999 && arr[2].end == 1000000000);
    free(arr);

    warehouse_index_free(idx);
    printf("PASSED\n");
}

static void test_high_volume_random_stress(void) {
    printf("[TEST 8] Stress Test (50,000 Unique IDs & Invariants) ... ");
    WarehouseIndex *idx = warehouse_index_create();

    const size_t TOTAL = 50000;
    uint64_t seed = 987654321ULL;
    #define RNG() (seed = seed * 6364136223846793005ULL + 1442695040888963407ULL)

    while (warehouse_index_total_packages(idx) < TOTAL) {
        package_id_t id = (package_id_t)(RNG() % 1000000000ULL);
        warehouse_index_add(idx, id);
    }

    assert(warehouse_index_total_packages(idx) == TOTAL);

    /* Verify intervals are strictly sorted and disjoint */
    size_t count = 0;
    Interval *arr = warehouse_index_get_all_intervals(idx, &count);
    assert(count == warehouse_index_interval_count(idx));

    for (size_t i = 0; i < count; i++) {
        assert(arr[i].start <= arr[i].end);
        if (i > 0) {
            /* Must be strictly separated by at least 1 gap */
            assert(arr[i - 1].end + 1 < arr[i].start);
        }
    }
    free(arr);

    warehouse_index_free(idx);
    printf("PASSED\n");
}

int main(void) {
    printf("============================================================\n");
    printf(" RUNNING WAREHOUSE LIVE ARRIVAL INDEX TEST SUITE\n");
    printf("============================================================\n");

    test_illustrative_example();
    test_duplicate_arrivals();
    test_boundary_extensions();
    test_bridge_merges();
    test_multi_interval_bridge_cascade();
    test_bounded_range_and_gap_queries();
    test_sparse_and_large_ids();
    test_high_volume_random_stress();

    printf("============================================================\n");
    printf(" ALL 8 TEST SUITES PASSED SUCCESSFULLY!\n");
    printf("============================================================\n");
    return 0;
}
