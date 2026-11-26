#include "avl_tree.h"
#include "insertion.h"
#include "search.h"
#include "gap_analysis.h"
#include "analytics.h"
#include "history.h"
#include "storage.h"
#include "benchmark.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

static void print_ascii_tree(const AVLNode *node, const char *prefix, bool is_left) {
    if (!node) return;

    printf("%s", prefix);
    printf("%s", is_left ? "├── " : "└── ");
    printf("[%lld, %lld] (h=%d, bf=%d, count=%lld)\n",
           (long long)node->start_id, (long long)node->end_id,
           node->height, avl_node_balance(node), (long long)node->subtree_count);

    char next_prefix[512];
    snprintf(next_prefix, sizeof(next_prefix), "%s%s", prefix, is_left ? "│   " : "    ");

    if (node->left || node->right) {
        if (node->left) {
            print_ascii_tree(node->left, next_prefix, true);
        } else {
            printf("%s├── (null)\n", next_prefix);
        }
        if (node->right) {
            print_ascii_tree(node->right, next_prefix, false);
        } else {
            printf("%s└── (null)\n", next_prefix);
        }
    }
}

static void print_help(void) {
    printf("\n=== LIVE ARRIVAL INDEX - COMMAND REFERENCE ===\n");
    printf("  add <id1> [id2 ...]     Register package ID(s)\n");
    printf("  show                    Display all current intervals\n");
    printf("  tree                    Display AVL tree structure (ASCII)\n");
    printf("  search <id>             Search for package ID and closest neighbours\n");
    printf("  range <min> <max>       Query intervals clipped to [min, max]\n");
    printf("  gaps <min> <max>        Run gap analysis on [min, max]\n");
    printf("  stats                   Display complete warehouse analytics\n");
    printf("  history [limit]         Display recent arrival events\n");
    printf("  import <filepath>       Import package IDs from CSV\n");
    printf("  export <type> <file>    Export (type: intervals|gaps|history|stats)\n");
    printf("  save <filepath>         Save warehouse state to file\n");
    printf("  restore <filepath>      Restore warehouse state from file\n");
    printf("  bench [pattern] [n]     Run benchmark (0:seq, 1:rev, 2:rand, 3:sparse, 5:alt)\n");
    printf("  reset                   Reset index\n");
    printf("  help                    Show this help message\n");
    printf("  exit / quit             Exit CLI\n\n");
}

int main(int argc, char *argv[]) {
    AVLTree *tree = avl_create();
    ArrivalHistory *hist = history_create(256);
    int64_t arrival_attempts = 0;
    int64_t duplicates = 0;
    int64_t new_intervals = 0;
    int64_t extensions = 0;
    int64_t merges = 0;

    // Direct command execution from args
    if (argc > 1) {
        if (strcmp(argv[1], "--help") == 0 || strcmp(argv[1], "-h") == 0) {
            print_help();
            avl_destroy(tree);
            history_destroy(hist);
            return 0;
        } else if (strcmp(argv[1], "--bench") == 0) {
            int count = (argc > 2) ? atoi(argv[2]) : 10000;
            printf("Running benchmark for %d packages...\n", count);
            BenchmarkResult res = benchmark_run(PATTERN_RANDOM, count, true);
            printf("Pattern           : %s\n", benchmark_pattern_name(res.pattern));
            printf("Total Insertion   : %.2f us (avg: %.2f ns/pkg)\n", res.total_insertion_us, res.avg_insertion_ns);
            printf("Tree Height       : %d\n", res.tree_height);
            printf("Total Rotations   : %llu\n", (unsigned long long)res.total_rotations);
            printf("Resulting Intervals: %d\n", res.resulting_intervals);
            if (res.has_baseline) {
                printf("Baseline (Array)  : %.2f us\n", res.baseline_insertion_us);
                printf("AVL Speedup       : %.2fx faster\n", res.speedup_factor);
            }
            avl_destroy(tree);
            history_destroy(hist);
            return 0;
        } else if (strcmp(argv[1], "--import") == 0 && argc > 2) {
            CSVImportStats stats = storage_import_csv(tree, hist, argv[2]);
            printf("Imported from %s: %d valid, %d duplicates, %d merges (lines: %d)\n",
                   argv[2], stats.valid_packages_read, stats.duplicates_encountered, stats.merges_performed, stats.total_lines);
            avl_destroy(tree);
            history_destroy(hist);
            return 0;
        }
    }

    printf("====================================================================\n");
    printf("   LIVE ARRIVAL INDEX - ADVANCED WAREHOUSE PACKAGE MANAGEMENT      \n");
    printf("   Core Engine: AVL Interval Tree | Domain: Balanced Search Index  \n");
    printf("====================================================================\n");
    printf("Type 'help' for commands, 'exit' to quit.\n\n");

    char buffer[1024];
    while (1) {
        printf("lai> ");
        fflush(stdout);

        if (!fgets(buffer, sizeof(buffer), stdin)) {
            break;
        }

        char *cmd = strtok(buffer, " \t\r\n");
        if (!cmd) continue;

        if (strcmp(cmd, "exit") == 0 || strcmp(cmd, "quit") == 0) {
            break;
        } else if (strcmp(cmd, "help") == 0) {
            print_help();
        } else if (strcmp(cmd, "add") == 0) {
            char *token = strtok(NULL, " \t\r\n");
            if (!token) {
                printf("Usage: add <id1> [id2 ...]\n");
                continue;
            }
            while (token) {
                int64_t id = atoll(token);
                arrival_attempts++;
                OperationResult res = arrival_process_package(tree, id);
                history_record(hist, &res);

                if (res.is_duplicate) {
                    duplicates++;
                } else if (res.type == OP_BRIDGE_MERGE) {
                    merges++;
                } else if (res.type == OP_EXTEND_LEFT || res.type == OP_EXTEND_RIGHT) {
                    extensions++;
                } else if (res.type == OP_NEW_INTERVAL) {
                    new_intervals++;
                }

                printf("\n--- ARRIVAL OPERATION RESULT ---\n");
                printf("Package ID      : %lld\n", (long long)id);
                printf("Operation Type  : %s\n", operation_type_to_string(res.type));
                printf("Result Interval : [%lld, %lld]\n",
                       (long long)res.updated_interval.start_id, (long long)res.updated_interval.end_id);
                printf("Intervals Count : %d -> %d\n", res.intervals_before, res.intervals_after);
                printf("Unique Packages : %lld -> %lld\n",
                       (long long)res.unique_packages_before, (long long)res.unique_packages_after);
                printf("Execution Steps :\n");
                for (int s = 0; s < res.execution_steps_count; s++) {
                    printf("  %s\n", res.execution_steps[s]);
                }
                token = strtok(NULL, " \t\r\n");
            }
        } else if (strcmp(cmd, "show") == 0 || strcmp(cmd, "intervals") == 0) {
            Interval *arr = NULL;
            int count = avl_get_all_intervals(tree, &arr);
            printf("\nCurrent Sorted Intervals (%d intervals, %lld total packages):\n",
                   count, (long long)tree->total_unique_packages);
            for (int i = 0; i < count; i++) {
                printf("  [%d] [%lld, %lld] (size: %lld)\n",
                       i + 1, (long long)arr[i].start_id, (long long)arr[i].end_id,
                       (long long)interval_size(arr[i]));
            }
            if (count == 0) printf("  (No intervals currently registered)\n");
            if (arr) free(arr);
        } else if (strcmp(cmd, "tree") == 0) {
            printf("\nAVL Interval Tree Structure:\n");
            if (!tree->root) {
                printf("  (Tree is empty)\n");
            } else {
                print_ascii_tree(tree->root, "", false);
                printf("Summary: Height=%d, Intervals=%d, Rotations=%llu\n",
                       avl_node_height(tree->root), tree->total_intervals, (unsigned long long)tree->total_rotations);
            }
        } else if (strcmp(cmd, "search") == 0) {
            char *token = strtok(NULL, " \t\r\n");
            if (!token) {
                printf("Usage: search <id>\n");
                continue;
            }
            int64_t id = atoll(token);
            LookupResult lk = search_package(tree, id);
            ProximityResult px = search_proximity(tree, id);
            printf("\nSearch Results for Package ID %lld:\n", (long long)id);
            if (lk.found) {
                printf("  Status: RECEIVED in interval [%lld, %lld]\n",
                       (long long)lk.containing_interval.start_id, (long long)lk.containing_interval.end_id);
            } else {
                printf("  Status: NOT RECEIVED (Missing)\n");
            }
            if (px.has_closest) {
                printf("  Closest Received ID : %lld (distance: %lld)\n",
                       (long long)px.closest_id, (long long)px.distance);
            }
            if (px.has_lower) printf("  Nearest Lower ID    : %lld\n", (long long)px.lower_id);
            if (px.has_higher) printf("  Nearest Higher ID   : %lld\n", (long long)px.higher_id);
        } else if (strcmp(cmd, "range") == 0) {
            char *tok_min = strtok(NULL, " \t\r\n");
            char *tok_max = strtok(NULL, " \t\r\n");
            if (!tok_min || !tok_max) {
                printf("Usage: range <min> <max>\n");
                continue;
            }
            int64_t qmin = atoll(tok_min);
            int64_t qmax = atoll(tok_max);
            RangeQueryResult rq = search_intervals_in_range(tree, qmin, qmax);
            printf("\nIntervals in [%lld, %lld] (%d segments, %lld packages):\n",
                   (long long)qmin, (long long)qmax, rq.count, (long long)rq.total_packages);
            for (int i = 0; i < rq.count; i++) {
                printf("  [%lld, %lld] (size: %lld)\n",
                       (long long)rq.intervals[i].start_id, (long long)rq.intervals[i].end_id,
                       (long long)interval_size(rq.intervals[i]));
            }
            free_range_query_result(&rq);
        } else if (strcmp(cmd, "gaps") == 0) {
            char *tok_l = strtok(NULL, " \t\r\n");
            char *tok_r = strtok(NULL, " \t\r\n");
            if (!tok_l || !tok_r) {
                printf("Usage: gaps <L> <R>\n");
                continue;
            }
            int64_t l = atoll(tok_l);
            int64_t r = atoll(tok_r);
            char *report = gap_generate_report(tree, l, r);
            if (report) {
                printf("\n%s\n", report);
                free(report);
            }
        } else if (strcmp(cmd, "stats") == 0 || strcmp(cmd, "analytics") == 0) {
            WarehouseAnalytics a = analytics_calculate(tree, arrival_attempts, duplicates, new_intervals, extensions, merges);
            printf("\n=== WAREHOUSE ANALYTICS ===\n");
            printf("Arrival Attempts      : %lld\n", (long long)a.total_arrival_attempts);
            printf("Unique Packages       : %lld\n", (long long)a.total_unique_packages);
            printf("Duplicates Ignored    : %lld\n", (long long)a.duplicate_count);
            printf("Active Intervals      : %d\n", a.total_intervals);
            printf("AVL Tree Height       : %d\n", a.tree_height);
            printf("Total AVL Rotations   : %llu (LL:%llu, RR:%llu, LR:%llu, RL:%llu)\n",
                   (unsigned long long)a.total_rotations,
                   (unsigned long long)a.count_ll, (unsigned long long)a.count_rr,
                   (unsigned long long)a.count_lr, (unsigned long long)a.count_rl);
            printf("Largest Interval      : [%lld, %lld] (size: %lld)\n",
                   (long long)a.largest_interval.start_id, (long long)a.largest_interval.end_id, (long long)a.largest_interval_size);
            printf("Average Interval Size : %.2f packages\n", a.average_interval_size);
            printf("Total Internal Gaps   : %d\n", a.total_gaps);
            printf("Largest Missing Gap   : [%lld, %lld] (size: %lld)\n",
                   (long long)a.largest_gap.start_id, (long long)a.largest_gap.end_id, (long long)a.largest_gap_size);
            printf("Global Coverage       : %.2f%% (span [%lld, %lld])\n",
                   a.global_coverage_percentage, (long long)a.global_min_id, (long long)a.global_max_id);
            printf("Operations Breakdown  : New=%lld, Extend=%lld, BridgeMerge=%lld\n",
                   (long long)a.new_interval_count, (long long)a.extend_count, (long long)a.merge_count);
        } else if (strcmp(cmd, "history") == 0) {
            char *tok_lim = strtok(NULL, " \t\r\n");
            int limit = tok_lim ? atoi(tok_lim) : 15;
            printf("\nRecent Arrival Events (newest first):\n");
            int n = hist->count;
            int start = n - 1;
            int stop = (limit > 0 && n > limit) ? (n - limit) : 0;
            for (int i = start; i >= stop && i >= 0; i--) {
                HistoryEntry *e = &hist->entries[i];
                printf("  #%llu: ID %lld | %s | intervals %d->%d | %s\n",
                       (unsigned long long)e->sequence_id, (long long)e->package_id,
                       operation_type_to_string(e->op_type),
                       e->intervals_before, e->intervals_after, e->details);
            }
            if (n == 0) printf("  (No arrivals recorded)\n");
        } else if (strcmp(cmd, "import") == 0) {
            char *file = strtok(NULL, " \t\r\n");
            if (!file) {
                printf("Usage: import <filepath>\n");
                continue;
            }
            CSVImportStats st = storage_import_csv(tree, hist, file);
            arrival_attempts += st.total_lines;
            duplicates += st.duplicates_encountered;
            merges += st.merges_performed;
            printf("Imported %s: %d new packages, %d duplicates, %d merges (lines read: %d)\n",
                   file, st.valid_packages_read, st.duplicates_encountered, st.merges_performed, st.total_lines);
        } else if (strcmp(cmd, "export") == 0) {
            char *type = strtok(NULL, " \t\r\n");
            char *file = strtok(NULL, " \t\r\n");
            if (!type || !file) {
                printf("Usage: export <intervals|gaps|history|stats> <filepath>\n");
                continue;
            }
            bool ok = false;
            if (strcmp(type, "intervals") == 0) {
                ok = storage_export_intervals_csv(tree, file);
            } else if (strcmp(type, "gaps") == 0) {
                ok = storage_export_gaps_csv(tree, 0, 1000000, file);
            } else if (strcmp(type, "history") == 0) {
                ok = storage_export_history_csv(hist, file);
            } else if (strcmp(type, "stats") == 0) {
                WarehouseAnalytics a = analytics_calculate(tree, arrival_attempts, duplicates, new_intervals, extensions, merges);
                ok = storage_export_analytics_csv(&a, file);
            }
            printf("Export %s to %s: %s\n", type, file, ok ? "SUCCESS" : "FAILED");
        } else if (strcmp(cmd, "save") == 0) {
            char *file = strtok(NULL, " \t\r\n");
            if (!file) {
                printf("Usage: save <filepath>\n");
                continue;
            }
            bool ok = storage_save_state(tree, hist, arrival_attempts, duplicates, new_intervals, extensions, merges, file);
            printf("State save to %s: %s\n", file, ok ? "SUCCESS" : "FAILED");
        } else if (strcmp(cmd, "restore") == 0) {
            char *file = strtok(NULL, " \t\r\n");
            if (!file) {
                printf("Usage: restore <filepath>\n");
                continue;
            }
            bool ok = storage_load_state(tree, hist, &arrival_attempts, &duplicates, &new_intervals, &extensions, &merges, file);
            printf("State restore from %s: %s (Tree has %d intervals, %lld packages)\n",
                   file, ok ? "SUCCESS" : "FAILED", tree->total_intervals, (long long)tree->total_unique_packages);
        } else if (strcmp(cmd, "bench") == 0) {
            char *tok_p = strtok(NULL, " \t\r\n");
            char *tok_n = strtok(NULL, " \t\r\n");
            int pat_id = tok_p ? atoi(tok_p) : 2;
            int count = tok_n ? atoi(tok_n) : 10000;
            printf("Running benchmark: pattern=%s, count=%d...\n", benchmark_pattern_name((ArrivalPattern)pat_id), count);
            BenchmarkResult bres = benchmark_run((ArrivalPattern)pat_id, count, (count <= 25000));
            printf("  Total Insertion Time : %.2f us (avg: %.2f ns/op)\n", bres.total_insertion_us, bres.avg_insertion_ns);
            printf("  Search Lookup Time   : %.2f us (1000 lookups)\n", bres.search_lookup_us);
            printf("  Resulting Intervals  : %d\n", bres.resulting_intervals);
            printf("  Tree Height          : %d\n", bres.tree_height);
            printf("  Total Rotations      : %llu\n", (unsigned long long)bres.total_rotations);
            if (bres.has_baseline) {
                printf("  Baseline (Array)     : %.2f us\n", bres.baseline_insertion_us);
                printf("  AVL Speedup Factor   : %.2fx faster\n", bres.speedup_factor);
            }
        } else if (strcmp(cmd, "reset") == 0) {
            avl_clear(tree);
            history_clear(hist);
            arrival_attempts = 0;
            duplicates = 0;
            new_intervals = 0;
            extensions = 0;
            merges = 0;
            printf("Warehouse index and history reset.\n");
        } else {
            printf("Unknown command '%s'. Type 'help' for available commands.\n", cmd);
        }
    }

    avl_destroy(tree);
    history_destroy(hist);
    return 0;
}
