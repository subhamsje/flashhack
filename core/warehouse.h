#ifndef WAREHOUSE_CORE_H
#define WAREHOUSE_CORE_H

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

typedef int64_t package_id_t;

typedef enum {
    ARRIVAL_CREATED = 0,
    ARRIVAL_EXTENDED_LEFT,
    ARRIVAL_EXTENDED_RIGHT,
    ARRIVAL_BRIDGED,
    ARRIVAL_DUPLICATE
} ArrivalResult;

typedef struct {
    package_id_t start;
    package_id_t end;
} Interval;

/* Detailed metadata about an insertion event for JSON/audit logging */
typedef struct {
    package_id_t package_id;
    ArrivalResult result;
    size_t prev_interval_count;
    size_t new_interval_count;
    Interval touched_prev[2];
    size_t touched_prev_count;
    Interval touched_new;
    int64_t execution_time_ns;
} ArrivalEvent;

/* AVL tree node snapshot for UI visualization */
typedef struct AVLNodeSnapshot {
    package_id_t start;
    package_id_t end;
    int height;
    int balance_factor;
    int depth;
    int64_t node_id;
    int64_t parent_id;
    int64_t left_id;
    int64_t right_id;
} AVLNodeSnapshot;

/* Overall tree snapshot */
typedef struct {
    size_t node_count;
    int max_depth;
    AVLNodeSnapshot *nodes;
} TreeSnapshot;

/* Analytics metrics */
typedef struct {
    size_t total_packages;
    size_t interval_count;
    size_t bridge_count;
    size_t extension_count;
    size_t creation_count;
    size_t duplicate_count;
    package_id_t min_id;
    package_id_t max_id;
    package_id_t largest_interval_size;
    double avg_interval_size;
    double coverage_ratio; /* within [min_id, max_id] */
} WarehouseAnalytics;

typedef struct Warehouse Warehouse;

/* Lifecycle */
Warehouse *warehouse_create(void);
void warehouse_free(Warehouse *w);
void warehouse_clear(Warehouse *w);

/* Core Mutations */
ArrivalResult warehouse_add(Warehouse *w, package_id_t id);
ArrivalEvent warehouse_add_detailed(Warehouse *w, package_id_t id);
size_t warehouse_add_batch(Warehouse *w, const package_id_t *ids, size_t count);

/* Membership & Queries */
bool warehouse_contains(const Warehouse *w, package_id_t id);
size_t warehouse_interval_count(const Warehouse *w);
size_t warehouse_total_packages(const Warehouse *w);

/* Predecessor & Successor Lookup */
bool warehouse_find_neighbors(const Warehouse *w, package_id_t id,
                              Interval *out_containing,
                              Interval *out_pred,
                              Interval *out_succ);

/* Interval and Gap Retrievals (Caller frees returned array) */
Interval *warehouse_get_intervals(const Warehouse *w, size_t *count);
Interval *warehouse_query_range(const Warehouse *w, package_id_t low, package_id_t high, size_t *count);
Interval *warehouse_query_gaps(const Warehouse *w, package_id_t low, package_id_t high, size_t *count);

/* Tree Snapshot for Visualizer */
TreeSnapshot warehouse_get_tree_snapshot(const Warehouse *w);
void warehouse_free_tree_snapshot(TreeSnapshot snapshot);

/* Analytics & Metrics */
WarehouseAnalytics warehouse_get_analytics(const Warehouse *w);

/* Serialization / Deserialization (CSV & Snapshot) */
char *warehouse_export_csv(const Warehouse *w);
size_t warehouse_import_csv(Warehouse *w, const char *csv_data);

/* String conversions */
const char *arrival_result_str(ArrivalResult res);

#endif /* WAREHOUSE_CORE_H */
