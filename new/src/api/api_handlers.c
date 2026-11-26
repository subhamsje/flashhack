#include "api_handlers.h"
#include "insertion.h"
#include "search.h"
#include "gap_analysis.h"
#include "analytics.h"
#include "storage.h"
#include "benchmark.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

WarehouseState g_warehouse;

void api_init_state(void) {
    g_warehouse.tree = avl_create();
    g_warehouse.history = history_create(1024);
    g_warehouse.arrival_attempts = 0;
    g_warehouse.duplicates = 0;
    g_warehouse.new_intervals = 0;
    g_warehouse.extensions = 0;
    g_warehouse.merges = 0;
}

void api_cleanup_state(void) {
    avl_destroy(g_warehouse.tree);
    history_destroy(g_warehouse.history);
    g_warehouse.tree = NULL;
    g_warehouse.history = NULL;
}

static bool extract_json_int(const char *json, const char *key, int64_t *val) {
    if (!json || !key || !val) return false;
    char search_pattern[64];
    snprintf(search_pattern, sizeof(search_pattern), "\"%s\"", key);
    const char *pos = strstr(json, search_pattern);
    if (!pos) {
        pos = strstr(json, key);
        if (!pos) return false;
    }
    pos = strchr(pos, ':');
    if (!pos) return false;
    pos++;
    while (*pos && (isspace((unsigned char)*pos) || *pos == '\"')) pos++;
    char *endptr = NULL;
    *val = strtoll(pos, &endptr, 10);
    return (endptr != pos);
}

// Forward declare external test functions for /api/tests
extern bool test_avl_rotations_and_balancing(void);
extern bool test_avl_predecessor_successor(void);
extern bool test_interval_insertion_and_extension(void);
extern bool test_gap_analysis_and_coverage(void);
extern bool test_bridge_merge_basic(void);
extern bool test_bridge_merge_multi_alternating(void);
extern bool test_sparse_and_large_boundaries(void);
extern bool test_randomized_against_reference(void);
extern bool test_large_scale_50k_unique_ids(void);

int api_handle_request(const char *method, const char *path, const char *query,
                       const char *body, char **response_out, const char **content_type_out) {
    *content_type_out = "application/json";

    if (strcmp(method, "GET") == 0) {
        if (strcmp(path, "/api/status") == 0) {
            char *buf = (char*)malloc(512);
            snprintf(buf, 512,
                "{\"status\":\"ok\",\"service\":\"Live Arrival Index\","
                "\"unique_packages\":%lld,\"total_intervals\":%d,\"tree_height\":%d}",
                (long long)g_warehouse.tree->total_unique_packages,
                g_warehouse.tree->total_intervals,
                avl_node_height(g_warehouse.tree->root));
            *response_out = buf;
            return 200;
        }

        if (strcmp(path, "/api/analytics") == 0) {
            WarehouseAnalytics a = analytics_calculate(
                g_warehouse.tree, g_warehouse.arrival_attempts, g_warehouse.duplicates,
                g_warehouse.new_intervals, g_warehouse.extensions, g_warehouse.merges);
            *response_out = analytics_to_json(&a);
            return 200;
        }

        if (strcmp(path, "/api/tree") == 0) {
            *response_out = avl_to_json(g_warehouse.tree);
            return 200;
        }

        if (strcmp(path, "/api/intervals") == 0) {
            int64_t qmin = -1, qmax = -1;
            if (query) {
                const char *pmin = strstr(query, "min=");
                const char *pmax = strstr(query, "max=");
                if (pmin) qmin = atoll(pmin + 4);
                if (pmax) qmax = atoll(pmax + 4);
            }

            Interval *arr = NULL;
            int count = 0;
            if (qmin >= 0 && qmax >= qmin) {
                RangeQueryResult rq = search_intervals_in_range(g_warehouse.tree, qmin, qmax);
                arr = rq.intervals;
                count = rq.count;
            } else {
                count = avl_get_all_intervals(g_warehouse.tree, &arr);
            }

            size_t cap = 256 + (count * 64);
            char *buf = (char*)malloc(cap);
            strcpy(buf, "{\"intervals\":[");
            size_t offset = strlen(buf);

            for (int i = 0; i < count; i++) {
                char item[128];
                int len = snprintf(item, sizeof(item), "%s{\"start\":%lld,\"end\":%lld,\"size\":%lld}",
                                   (i == 0) ? "" : ",",
                                   (long long)arr[i].start_id, (long long)arr[i].end_id,
                                   (long long)interval_size(arr[i]));
                if (offset + len + 32 >= cap) {
                    cap *= 2;
                    buf = (char*)realloc(buf, cap);
                }
                strcat(buf + offset, item);
                offset += len;
            }

            strcat(buf + offset, "]}");
            if (arr) free(arr);
            *response_out = buf;
            return 200;
        }

        if (strcmp(path, "/api/gaps") == 0) {
            int64_t l = 0, r = 1000;
            if (query) {
                const char *pl = strstr(query, "l=");
                const char *pr = strstr(query, "r=");
                if (pl) l = atoll(pl + 2);
                if (pr) r = atoll(pr + 2);
            }
            if (l < 0) l = 0;
            if (r < l) r = l;

            GapAnalysisResult gaps = gap_analysis_compute(g_warehouse.tree, l, r);
            size_t cap = 1024 + (gaps.count * 64);
            char *buf = (char*)malloc(cap);

            int off = snprintf(buf, cap,
                "{\"query_l\":%lld,\"query_r\":%lld,\"total_missing\":%lld,"
                "\"coverage_percentage\":%.2f,\"gap_count\":%d,"
                "\"largest_gap\":{\"start\":%lld,\"end\":%lld,\"size\":%lld},"
                "\"average_gap_size\":%.2f,\"gaps\":[",
                (long long)l, (long long)r, (long long)gaps.total_missing_ids,
                gaps.coverage_percentage, gaps.count,
                (long long)gaps.largest_gap.start_id, (long long)gaps.largest_gap.end_id, (long long)gaps.largest_gap_size,
                gaps.average_gap_size);

            for (int i = 0; i < gaps.count; i++) {
                char item[128];
                int len = snprintf(item, sizeof(item), "%s{\"start\":%lld,\"end\":%lld,\"size\":%lld}",
                                   (i == 0) ? "" : ",",
                                   (long long)gaps.gaps[i].start_id, (long long)gaps.gaps[i].end_id,
                                   (long long)interval_size(gaps.gaps[i]));
                if ((size_t)(off + len + 32) >= cap) {
                    cap *= 2;
                    buf = (char*)realloc(buf, cap);
                }
                strcat(buf + off, item);
                off += len;
            }
            strcat(buf + off, "]}");
            free_gap_analysis_result(&gaps);
            *response_out = buf;
            return 200;
        }

        if (strcmp(path, "/api/history") == 0) {
            int limit = 25;
            if (query) {
                const char *pl = strstr(query, "limit=");
                if (pl) limit = atoi(pl + 6);
            }
            *response_out = history_to_json(g_warehouse.history, limit);
            return 200;
        }

        if (strcmp(path, "/api/tests") == 0) {
            bool t1 = test_avl_rotations_and_balancing();
            bool t2 = test_avl_predecessor_successor();
            bool t3 = test_interval_insertion_and_extension();
            bool t4 = test_gap_analysis_and_coverage();
            bool t5 = test_bridge_merge_basic();
            bool t6 = test_bridge_merge_multi_alternating();
            bool t7 = test_sparse_and_large_boundaries();
            bool t8 = test_randomized_against_reference();
            bool t9 = test_large_scale_50k_unique_ids();

            int passed = t1 + t2 + t3 + t4 + t5 + t6 + t7 + t8 + t9;
            char *buf = (char*)malloc(2048);
            snprintf(buf, 2048,
                "{\"total\":9,\"passed\":%d,\"failed\":%d,\"tests\":["
                "{\"name\":\"AVL Rotations & Balancing\",\"status\":\"%s\"},"
                "{\"name\":\"Predecessor & Successor\",\"status\":\"%s\"},"
                "{\"name\":\"Interval Insertion & Extension\",\"status\":\"%s\"},"
                "{\"name\":\"Gap Analysis & Coverage\",\"status\":\"%s\"},"
                "{\"name\":\"Bridge Merge Basic\",\"status\":\"%s\"},"
                "{\"name\":\"Multi Alternating Bridge Merges\",\"status\":\"%s\"},"
                "{\"name\":\"Sparse IDs & 10^9 Boundaries\",\"status\":\"%s\"},"
                "{\"name\":\"Randomized Reference Verification\",\"status\":\"%s\"},"
                "{\"name\":\"50,000 Large Scale Unique IDs\",\"status\":\"%s\"}"
                "]}",
                passed, 9 - passed,
                t1 ? "PASS" : "FAIL", t2 ? "PASS" : "FAIL", t3 ? "PASS" : "FAIL",
                t4 ? "PASS" : "FAIL", t5 ? "PASS" : "FAIL", t6 ? "PASS" : "FAIL",
                t7 ? "PASS" : "FAIL", t8 ? "PASS" : "FAIL", t9 ? "PASS" : "FAIL");
            *response_out = buf;
            return 200;
        }
    }

    if (strcmp(method, "POST") == 0) {
        if (strcmp(path, "/api/arrival") == 0) {
            int64_t pkg_id = -1;
            if (query) {
                const char *pid = strstr(query, "id=");
                if (!pid) pid = strstr(query, "package_id=");
                if (pid) {
                    char *eq = strchr(pid, '=');
                    if (eq) pkg_id = atoll(eq + 1);
                }
            }
            if (pkg_id < 0 && body) {
                if (!extract_json_int(body, "package_id", &pkg_id)) {
                    extract_json_int(body, "id", &pkg_id);
                }
                if (pkg_id < 0 && isdigit((unsigned char)body[0])) {
                    pkg_id = atoll(body);
                }
            }

            if (pkg_id < 0) {
                char *err = (char*)malloc(128);
                strcpy(err, "{\"error\":\"Invalid or missing package_id\"}");
                *response_out = err;
                return 400;
            }

            g_warehouse.arrival_attempts++;
            OperationResult res = arrival_process_package(g_warehouse.tree, pkg_id);
            history_record(g_warehouse.history, &res);

            if (res.is_duplicate) {
                g_warehouse.duplicates++;
            } else if (res.type == OP_BRIDGE_MERGE) {
                g_warehouse.merges++;
            } else if (res.type == OP_EXTEND_LEFT || res.type == OP_EXTEND_RIGHT) {
                g_warehouse.extensions++;
            } else if (res.type == OP_NEW_INTERVAL) {
                g_warehouse.new_intervals++;
            }

            char *tree_json = avl_to_json(g_warehouse.tree);
            size_t cap = 2048 + (tree_json ? strlen(tree_json) : 0);
            char *buf = (char*)malloc(cap);

            int off = snprintf(buf, cap,
                "{\"package_id\":%lld,\"type\":\"%s\",\"is_duplicate\":%s,\"merge_occurred\":%s,"
                "\"affected_interval\":{\"start\":%lld,\"end\":%lld},"
                "\"intervals_before\":%d,\"intervals_after\":%d,"
                "\"unique_before\":%lld,\"unique_after\":%lld,"
                "\"details\":\"%s\",\"steps\":[",
                (long long)pkg_id,
                operation_type_to_string(res.type),
                res.is_duplicate ? "true" : "false",
                res.merge_occurred ? "true" : "false",
                (long long)res.updated_interval.start_id, (long long)res.updated_interval.end_id,
                res.intervals_before, res.intervals_after,
                (long long)res.unique_packages_before, (long long)res.unique_packages_after,
                res.details);

            for (int s = 0; s < res.execution_steps_count; s++) {
                char step_buf[256];
                snprintf(step_buf, sizeof(step_buf), "%s\"%s\"",
                         (s == 0) ? "" : ",", res.execution_steps[s]);
                strcat(buf + off, step_buf);
                off += strlen(step_buf);
            }

            char tail_header[64];
            snprintf(tail_header, sizeof(tail_header), "],\"tree\":");
            strcat(buf + off, tail_header);
            off += strlen(tail_header);

            if (tree_json) {
                strcat(buf + off, tree_json);
                free(tree_json);
            } else {
                strcat(buf + off, "null");
            }
            strcat(buf + off, "}");

            *response_out = buf;
            return 200;
        }

        if (strcmp(path, "/api/arrival/batch") == 0) {
            // Parse comma-separated or JSON array of package IDs
            int added = 0;
            if (body) {
                const char *p = strchr(body, '[');
                if (p) p++;
                else p = body;

                while (*p && *p != ']') {
                    while (*p && (isspace((unsigned char)*p) || *p == ',' || *p == '[')) p++;
                    if (!*p || *p == ']') break;
                    char *endptr = NULL;
                    int64_t id = strtoll(p, &endptr, 10);
                    if (endptr > p && id >= 0) {
                        g_warehouse.arrival_attempts++;
                        OperationResult res = arrival_process_package(g_warehouse.tree, id);
                        history_record(g_warehouse.history, &res);
                        if (res.is_duplicate) {
                            g_warehouse.duplicates++;
                        } else if (res.type == OP_BRIDGE_MERGE) {
                            g_warehouse.merges++;
                            added++;
                        } else if (res.type == OP_EXTEND_LEFT || res.type == OP_EXTEND_RIGHT) {
                            g_warehouse.extensions++;
                            added++;
                        } else if (res.type == OP_NEW_INTERVAL) {
                            g_warehouse.new_intervals++;
                            added++;
                        }
                        p = endptr;
                    } else {
                        p++;
                    }
                }
            }

            char *buf = (char*)malloc(256);
            snprintf(buf, 256,
                "{\"status\":\"batch_processed\",\"added\":%d,\"total_unique\":%lld,\"total_intervals\":%d}",
                added, (long long)g_warehouse.tree->total_unique_packages, g_warehouse.tree->total_intervals);
            *response_out = buf;
            return 200;
        }

        if (strcmp(path, "/api/search") == 0) {
            int64_t pkg_id = -1;
            if (body) {
                extract_json_int(body, "package_id", &pkg_id);
                if (pkg_id < 0) extract_json_int(body, "id", &pkg_id);
                if (pkg_id < 0) pkg_id = atoll(body);
            }

            LookupResult lk = search_package(g_warehouse.tree, pkg_id);
            ProximityResult px = search_proximity(g_warehouse.tree, pkg_id);

            char *buf = (char*)malloc(512);
            snprintf(buf, 512,
                "{\"package_id\":%lld,\"found\":%s,"
                "\"containing_interval\":{\"start\":%lld,\"end\":%lld},"
                "\"closest_id\":%lld,\"distance\":%lld,"
                "\"has_lower\":%s,\"lower_id\":%lld,"
                "\"has_higher\":%s,\"higher_id\":%lld}",
                (long long)pkg_id, lk.found ? "true" : "false",
                (long long)lk.containing_interval.start_id, (long long)lk.containing_interval.end_id,
                (long long)px.closest_id, (long long)px.distance,
                px.has_lower ? "true" : "false", (long long)px.lower_id,
                px.has_higher ? "true" : "false", (long long)px.higher_id);
            *response_out = buf;
            return 200;
        }

        if (strcmp(path, "/api/benchmark") == 0) {
            int64_t pat = 2; // Random
            int64_t n = 1000;
            if (body) {
                extract_json_int(body, "pattern", &pat);
                extract_json_int(body, "count", &n);
            }
            if (pat < 0 || pat > 6) pat = 2;
            if (n < 10) n = 10;
            if (n > 50000) n = 50000;

            BenchmarkResult res = benchmark_run((ArrivalPattern)pat, (int)n, (n <= 15000));
            *response_out = benchmark_result_to_json(&res);
            return 200;
        }

        if (strcmp(path, "/api/reset") == 0) {
            avl_clear(g_warehouse.tree);
            history_clear(g_warehouse.history);
            g_warehouse.arrival_attempts = 0;
            g_warehouse.duplicates = 0;
            g_warehouse.new_intervals = 0;
            g_warehouse.extensions = 0;
            g_warehouse.merges = 0;

            char *buf = (char*)malloc(64);
            strcpy(buf, "{\"status\":\"reset_successful\"}");
            *response_out = buf;
            return 200;
        }

        if (strcmp(path, "/api/save") == 0) {
            bool ok = storage_save_state(g_warehouse.tree, g_warehouse.history,
                                         g_warehouse.arrival_attempts, g_warehouse.duplicates,
                                         g_warehouse.new_intervals, g_warehouse.extensions,
                                         g_warehouse.merges, "data/warehouse_snapshot.lai");
            char *buf = (char*)malloc(128);
            snprintf(buf, 128, "{\"status\":\"%s\",\"file\":\"data/warehouse_snapshot.lai\"}",
                     ok ? "success" : "error");
            *response_out = buf;
            return ok ? 200 : 500;
        }

        if (strcmp(path, "/api/restore") == 0) {
            bool ok = storage_load_state(g_warehouse.tree, g_warehouse.history,
                                         &g_warehouse.arrival_attempts, &g_warehouse.duplicates,
                                         &g_warehouse.new_intervals, &g_warehouse.extensions,
                                         &g_warehouse.merges, "data/warehouse_snapshot.lai");
            char *buf = (char*)malloc(256);
            snprintf(buf, 256,
                "{\"status\":\"%s\",\"unique_packages\":%lld,\"total_intervals\":%d}",
                ok ? "success" : "error",
                (long long)g_warehouse.tree->total_unique_packages,
                g_warehouse.tree->total_intervals);
            *response_out = buf;
            return ok ? 200 : 500;
        }
    }

    char *not_found = (char*)malloc(64);
    strcpy(not_found, "{\"error\":\"Route not found\"}");
    *response_out = not_found;
    return 404;
}
