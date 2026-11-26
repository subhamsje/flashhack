#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <inttypes.h>
#include "warehouse.h"

static void demo(void) {
    printf("=== 1. Illustrative Example [1, 3, 7, 2, 6] ===\n");
    Warehouse *w = warehouse_create();
    package_id_t arrivals[] = {1, 3, 7, 2, 6};

    for (size_t i = 0; i < 5; i++) {
        ArrivalResult res = warehouse_add(w, arrivals[i]);
        printf("Arrival %2" PRId64 " -> %-14s | Intervals: ", arrivals[i], arrival_result_str(res));
        warehouse_print_intervals(w);
    }
    printf("\n");
    warehouse_print_report(w, 1, 7);

    printf("\n=== 2. Bridge Merge Demo ===\n");
    Warehouse *w2 = warehouse_create();
    for (package_id_t i = 100; i <= 105; i++) warehouse_add(w2, i);
    for (package_id_t i = 107; i <= 115; i++) warehouse_add(w2, i);

    printf("Before 106 arrives: ");
    warehouse_print_intervals(w2);

    ArrivalResult bridge_res = warehouse_add(w2, 106);
    printf("After 106 arrives  (%s): ", arrival_result_str(bridge_res));
    warehouse_print_intervals(w2);
    printf("-> Intervals [100, 105] and [107, 115] fused into single interval [100, 115].\n");

    printf("\n=== 3. Sparse Large IDs (0 to 10^9) ===\n");
    Warehouse *w3 = warehouse_create();
    package_id_t sparse[] = {0, 42, 1000000, 500000000, 999999999, 1000000000};
    for (size_t i = 0; i < 6; i++) warehouse_add(w3, sparse[i]);

    printf("Sparse intervals: ");
    warehouse_print_intervals(w3);
    printf("Memory: uses %zu nodes (%zu bytes) instead of gigabytes.\n",
           warehouse_interval_count(w3), warehouse_interval_count(w3) * 40);

    warehouse_print_report(w3, 0, 50);

    warehouse_free(w);
    warehouse_free(w2);
    warehouse_free(w3);
}

static void interactive(void) {
    Warehouse *w = warehouse_create();
    char line[256];
    printf("Live Arrival Index REPL (type 'help' for commands)\n");

    while (1) {
        printf("> ");
        if (!fgets(line, sizeof(line), stdin)) break;

        char cmd[32];
        long long a = 0, b = 0;
        int n = sscanf(line, "%31s %lld %lld", cmd, &a, &b);
        if (n <= 0) continue;

        if (strcmp(cmd, "quit") == 0 || strcmp(cmd, "exit") == 0) {
            break;
        } else if (strcmp(cmd, "add") == 0) {
            if (n < 2) {
                printf("usage: add <id>\n");
            } else {
                ArrivalResult r = warehouse_add(w, (package_id_t)a);
                printf("%lld -> %s\n", a, arrival_result_str(r));
            }
        } else if (strcmp(cmd, "list") == 0 || strcmp(cmd, "intervals") == 0) {
            warehouse_print_intervals(w);
        } else if (strcmp(cmd, "report") == 0) {
            if (n < 3) {
                printf("usage: report <low> <high>\n");
            } else {
                warehouse_print_report(w, (package_id_t)a, (package_id_t)b);
            }
        } else if (strcmp(cmd, "contains") == 0) {
            if (n < 2) {
                printf("usage: contains <id>\n");
            } else {
                printf("%lld %s\n", a, warehouse_contains(w, (package_id_t)a) ? "exists" : "missing");
            }
        } else if (strcmp(cmd, "clear") == 0) {
            warehouse_clear(w);
            printf("cleared\n");
        } else if (strcmp(cmd, "help") == 0) {
            printf("Commands: add <id>, intervals, report <low> <high>, contains <id>, clear, exit\n");
        } else {
            printf("Unknown command '%s'\n", cmd);
        }
    }

    warehouse_free(w);
}

int main(int argc, char **argv) {
    if (argc > 1 && strcmp(argv[1], "interactive") == 0) {
        interactive();
        return 0;
    }

    if (argc > 2 && strcmp(argv[1], "add") == 0) {
        Warehouse *w = warehouse_create();
        for (int i = 2; i < argc; i++) {
            package_id_t id = (package_id_t)atoll(argv[i]);
            warehouse_add(w, id);
        }
        warehouse_print_intervals(w);
        warehouse_free(w);
        return 0;
    }

    demo();
    return 0;
}
