#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <inttypes.h>
#include <time.h>
#include "warehouse_index.h"
#include "avl_tree.h"

static void print_intervals_array(const Interval *arr, size_t count) {
    printf("[");
    for (size_t i = 0; i < count; i++) {
        printf("[%" PRId64 ", %" PRId64 "]%s",
               arr[i].start, arr[i].end,
               (i + 1 < count) ? ", " : "");
    }
    printf("]\n");
}

static void run_illustrative_example(void) {
    printf("======================================================================\n");
    printf(" 1. ILLUSTRATIVE EXAMPLE (From Problem Statement 09)\n");
    printf("======================================================================\n");
    printf("Arrival sequence: [1, 3, 7, 2, 6]\n\n");

    WarehouseIndex *idx = warehouse_index_create();
    package_id_t sequence[] = {1, 3, 7, 2, 6};
    size_t n = sizeof(sequence) / sizeof(sequence[0]);

    for (size_t i = 0; i < n; i++) {
        package_id_t id = sequence[i];
        ArrivalResult res = warehouse_index_add(idx, id);

        size_t count = 0;
        Interval *intervals = warehouse_index_get_all_intervals(idx, &count);

        printf("  Arrival: %2" PRId64 " -> Result: %-14s | Intervals: ", id, arrival_result_to_string(res));
        print_intervals_array(intervals, count);
        free(intervals);
    }

    printf("\nQuery Window [1, 7]:\n");
    warehouse_index_print_report(idx, 1, 7);

    warehouse_index_free(idx);
}

static void run_bridge_merge_demonstration(void) {
    printf("\n======================================================================\n");
    printf(" 2. DEMONSTRATION: BRIDGE MERGE (Connecting Separate Intervals)\n");
    printf("======================================================================\n");
    printf("Demonstrating the exact behavior when an unseen ID connects two intervals.\n\n");

    WarehouseIndex *idx = warehouse_index_create();

    /* Build interval 1: [100, 105] */
    for (package_id_t id = 100; id <= 105; id++) {
        warehouse_index_add(idx, id);
    }

    /* Build interval 2: [107, 115] */
    for (package_id_t id = 107; id <= 115; id++) {
        warehouse_index_add(idx, id);
    }

    size_t count_before = 0;
    Interval *before = warehouse_index_get_all_intervals(idx, &count_before);

    printf("BEFORE BRIDGE ARRIVAL:\n");
    printf("  Intervals in index (%zu disjoint ranges): ", count_before);
    print_intervals_array(before, count_before);
    free(before);

    printf("\n  --> Incoming missing connecting ID: 106\n\n");
    ArrivalResult res = warehouse_index_add(idx, 106);

    size_t count_after = 0;
    Interval *after = warehouse_index_get_all_intervals(idx, &count_after);

    printf("AFTER BRIDGE ARRIVAL:\n");
    printf("  Operation Result : %s\n", arrival_result_to_string(res));
    printf("  Intervals in index (%zu disjoint range)  : ", count_after);
    print_intervals_array(after, count_after);
    free(after);

    printf("\nTECHNICAL EXPLANATION:\n");
    printf("  * Predecessor Interval: [100, 105] (end = 105, which is 106 - 1)\n");
    printf("  * Successor Interval  : [107, 115] (start = 107, which is 106 + 1)\n");
    printf("  * When 106 arrives, the AVL tree detects both adjacencies simultaneously.\n");
    printf("  * The predecessor's upper bound is extended: pred->end = 115.\n");
    printf("  * The redundant successor node [107, 115] is deleted from the AVL tree.\n");
    printf("  * Memory for the merged node is immediately freed; tree rebalances in O(log K) time.\n");

    warehouse_index_free(idx);
}

static void run_sparse_scale_demonstration(void) {
    printf("\n======================================================================\n");
    printf(" 3. EFFICIENCY WITH WIDELY SPACED LARGE IDs (0 to 10^9)\n");
    printf("======================================================================\n");
    printf("Evaluating memory efficiency when package IDs are sparse across 1,000,000,000.\n\n");

    WarehouseIndex *idx = warehouse_index_create();

    package_id_t sparse_ids[] = {
        0,
        42,
        1000000,
        500000000,
        999999998,
        1000000000
    };
    size_t n = sizeof(sparse_ids) / sizeof(sparse_ids[0]);

    for (size_t i = 0; i < n; i++) {
        warehouse_index_add(idx, sparse_ids[i]);
    }

    size_t count = 0;
    Interval *intervals = warehouse_index_get_all_intervals(idx, &count);

    printf("Received %zu sparse IDs across range [0, 10^9]:\n  Intervals: ", n);
    print_intervals_array(intervals, count);
    free(intervals);

    printf("\nWHY THE METHOD REMAINS EFFICIENT:\n");
    printf("  * A naive flat array of size 10^9 would require 4.0 GB of RAM.\n");
    printf("  * A bitset array for 10^9 bits would require ~125 MB of RAM.\n");
    printf("  * The Live Arrival AVL Index stores only active intervals.\n");
    printf("  * Space Used: %zu nodes * %zu bytes = %zu bytes (~%.2f KB)!\n",
           count, sizeof(AVLNode), count * sizeof(AVLNode), (count * sizeof(AVLNode)) / 1024.0);
    printf("  * Insertion, lookup, and deletion scale strictly with O(log K), NOT O(MAX_ID).\n");

    warehouse_index_print_report(idx, 0, 50);

    warehouse_index_free(idx);
}

static void run_50k_stress_benchmark(void) {
    printf("\n======================================================================\n");
    printf(" 4. HIGH-SCALE BENCHMARK (50,000 Unique IDs Up to 10^9)\n");
    printf("======================================================================\n");

    WarehouseIndex *idx = warehouse_index_create();
    const size_t TARGET = 50000;
    printf("Inserting %zu package IDs in random order with clusters and gaps...\n", TARGET);

    clock_t start = clock();

    /* Deterministic pseudo-random seed */
    uint64_t seed = 123456789ULL;
    #define NEXT_RAND() (seed = seed * 6364136223846793005ULL + 1442695040888963407ULL)

    size_t inserts = 0;
    while (warehouse_index_total_packages(idx) < TARGET) {
        /* Generate IDs up to 10^9 with clustering */
        package_id_t base = (package_id_t)(NEXT_RAND() % 1000000000ULL);
        int cluster_len = (int)(NEXT_RAND() % 5) + 1;
        for (int c = 0; c < cluster_len && warehouse_index_total_packages(idx) < TARGET; c++) {
            package_id_t id = base + c;
            warehouse_index_add(idx, id);
            inserts++;
        }
    }

    clock_t end = clock();
    double time_sec = (double)(end - start) / CLOCKS_PER_SEC;

    printf("Completed %zu insertions (%zu unique packages) in %.4f seconds.\n",
           inserts, warehouse_index_total_packages(idx), time_sec);
    printf("Throughput: %.0f ops/sec (Average %.2f microseconds per arrival).\n",
           (double)inserts / time_sec, (time_sec * 1000000.0) / (double)inserts);
    printf("Current disjoint interval count: %zu\n", warehouse_index_interval_count(idx));

    /* Query benchmark */
    clock_t q_start = clock();
    size_t q_count = 0;
    Interval *q_intervals = warehouse_index_query_intervals_in_range(idx, 100000000, 200000000, &q_count);
    size_t g_count = 0;
    Interval *q_gaps = warehouse_index_query_gaps(idx, 100000000, 200000000, &g_count);
    clock_t q_end = clock();

    double q_time_ms = ((double)(q_end - q_start) / CLOCKS_PER_SEC) * 1000.0;
    printf("Window Query [10^8, 2*10^8]: found %zu intervals, %zu gaps in %.3f ms.\n",
           q_count, g_count, q_time_ms);

    free(q_intervals);
    free(q_gaps);
    warehouse_index_free(idx);
    printf("======================================================================\n");
}

static void print_help(const char *prog_name) {
    printf("Warehouse Live Arrival Index CLI\n");
    printf("Usage:\n");
    printf("  %s demo                 Run complete demonstration suite\n", prog_name);
    printf("  %s interactive          Start interactive REPL\n", prog_name);
    printf("  %s add <id> [id2 ...]   Add IDs and show resulting intervals\n", prog_name);
    printf("  %s test                 Run tests\n", prog_name);
}

int main(int argc, char **argv) {
    if (argc < 2 || strcmp(argv[1], "demo") == 0) {
        run_illustrative_example();
        run_bridge_merge_demonstration();
        run_sparse_scale_demonstration();
        run_50k_stress_benchmark();
        return 0;
    }

    if (strcmp(argv[1], "help") == 0 || strcmp(argv[1], "--help") == 0) {
        print_help(argv[0]);
        return 0;
    }

    if (strcmp(argv[1], "add") == 0) {
        if (argc < 3) {
            printf("Error: Missing IDs to add.\n");
            return 1;
        }
        WarehouseIndex *idx = warehouse_index_create();
        for (int i = 2; i < argc; i++) {
            package_id_t id = (package_id_t)atoll(argv[i]);
            ArrivalResult res = warehouse_index_add(idx, id);
            printf("Add %" PRId64 " -> %s\n", id, arrival_result_to_string(res));
        }
        warehouse_index_print_summary(idx);
        warehouse_index_free(idx);
        return 0;
    }

    if (strcmp(argv[1], "interactive") == 0) {
        WarehouseIndex *idx = warehouse_index_create();
        printf("Interactive Warehouse Live Arrival Index. Type 'help' for commands.\n");
        char line[256];
        while (1) {
            printf("warehouse> ");
            if (!fgets(line, sizeof(line), stdin)) break;

            char cmd[32];
            long long a = 0, b = 0;
            int scanned = sscanf(line, "%31s %lld %lld", cmd, &a, &b);
            if (scanned <= 0) continue;

            if (strcmp(cmd, "quit") == 0 || strcmp(cmd, "exit") == 0) {
                break;
            } else if (strcmp(cmd, "add") == 0) {
                if (scanned < 2) {
                    printf("Usage: add <id>\n");
                } else {
                    ArrivalResult res = warehouse_index_add(idx, (package_id_t)a);
                    printf("Package %lld -> %s\n", a, arrival_result_to_string(res));
                }
            } else if (strcmp(cmd, "list") == 0 || strcmp(cmd, "intervals") == 0) {
                warehouse_index_print_summary(idx);
            } else if (strcmp(cmd, "report") == 0 || strcmp(cmd, "window") == 0) {
                if (scanned < 3) {
                    printf("Usage: report <low> <high>\n");
                } else {
                    warehouse_index_print_report(idx, (package_id_t)a, (package_id_t)b);
                }
            } else if (strcmp(cmd, "contains") == 0) {
                if (scanned < 2) {
                    printf("Usage: contains <id>\n");
                } else {
                    bool has = warehouse_index_contains(idx, (package_id_t)a);
                    printf("Package %lld is %s\n", a, has ? "PRESENT" : "ABSENT");
                }
            } else if (strcmp(cmd, "clear") == 0) {
                warehouse_index_clear(idx);
                printf("Index cleared.\n");
            } else if (strcmp(cmd, "help") == 0) {
                printf("Commands:\n");
                printf("  add <id>            - Add package ID\n");
                printf("  contains <id>       - Check if package ID has arrived\n");
                printf("  intervals           - Display all current intervals\n");
                printf("  report <low> <high> - Report received ranges and missing gaps\n");
                printf("  clear               - Reset index\n");
                printf("  quit                - Exit\n");
            } else {
                printf("Unknown command '%s'. Type 'help' for instructions.\n", cmd);
            }
        }
        warehouse_index_free(idx);
        return 0;
    }

    print_help(argv[0]);
    return 1;
}
