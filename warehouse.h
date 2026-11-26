#ifndef WAREHOUSE_H
#define WAREHOUSE_H

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

typedef struct Warehouse Warehouse;

/* Lifecycle */
Warehouse *warehouse_create(void);
void warehouse_free(Warehouse *w);
void warehouse_clear(Warehouse *w);

/* Core operations */
ArrivalResult warehouse_add(Warehouse *w, package_id_t id);
bool warehouse_contains(const Warehouse *w, package_id_t id);
size_t warehouse_interval_count(const Warehouse *w);
size_t warehouse_total_packages(const Warehouse *w);

/* Interval and gap queries (caller frees returned array) */
Interval *warehouse_get_intervals(const Warehouse *w, size_t *count);
Interval *warehouse_query_range(const Warehouse *w, package_id_t low, package_id_t high, size_t *count);
Interval *warehouse_query_gaps(const Warehouse *w, package_id_t low, package_id_t high, size_t *count);

/* Display helpers */
const char *arrival_result_str(ArrivalResult res);
void warehouse_print_intervals(const Warehouse *w);
void warehouse_print_report(const Warehouse *w, package_id_t low, package_id_t high);

#endif /* WAREHOUSE_H */
