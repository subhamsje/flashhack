#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <inttypes.h>
#include "../core/warehouse.h"

int main(int argc, char **argv) {
    if (argc < 2) {
        printf("FLASHHACK Warehouse CLI Core Engine\n");
        printf("Usage:\n");
        printf("  %s add <id1> [id2...]\n", argv[0]);
        printf("  %s demo\n", argv[0]);
        return 0;
    }

    Warehouse *w = warehouse_create();

    if (strcmp(argv[1], "demo") == 0) {
        package_id_t seq[] = {1, 3, 7, 2, 6};
        printf("=== Illustrative Problem 09 Sequence: [1, 3, 7, 2, 6] ===\n");
        for (int i = 0; i < 5; i++) {
            ArrivalEvent ev = warehouse_add_detailed(w, seq[i]);
            printf("Arrival %2" PRId64 " -> %-14s | Latency: %" PRId64 " ns\n",
                   ev.package_id, arrival_result_str(ev.result), ev.execution_time_ns);
        }

        size_t count = 0;
        Interval *ivs = warehouse_get_intervals(w, &count);
        printf("\nResulting Disjoint Ranges (%zu): [", count);
        for (size_t i = 0; i < count; i++) {
            printf("[%" PRId64 ", %" PRId64 "]%s", ivs[i].start, ivs[i].end, (i + 1 < count) ? ", " : "");
        }
        printf("]\n");
        free(ivs);

        size_t gcount = 0;
        Interval *gaps = warehouse_query_gaps(w, 1, 7, &gcount);
        printf("Missing Ranges in [1, 7]: [");
        for (size_t i = 0; i < gcount; i++) {
            printf("[%" PRId64 ", %" PRId64 "]%s", gaps[i].start, gaps[i].end, (i + 1 < gcount) ? ", " : "");
        }
        printf("]\n");
        free(gaps);

        warehouse_free(w);
        return 0;
    }

    if (strcmp(argv[1], "add") == 0) {
        for (int i = 2; i < argc; i++) {
            package_id_t id = (package_id_t)atoll(argv[i]);
            ArrivalEvent ev = warehouse_add_detailed(w, id);
            printf("Package %" PRId64 " -> %s\n", id, arrival_result_str(ev.result));
        }
        size_t count = 0;
        Interval *ivs = warehouse_get_intervals(w, &count);
        printf("Intervals: [");
        for (size_t i = 0; i < count; i++) {
            printf("[%" PRId64 ", %" PRId64 "]%s", ivs[i].start, ivs[i].end, (i + 1 < count) ? ", " : "");
        }
        printf("]\n");
        free(ivs);
        warehouse_free(w);
        return 0;
    }

    warehouse_free(w);
    return 0;
}
