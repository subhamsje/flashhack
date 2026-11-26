#ifndef WAREHOUSE_INDEX_H
#define WAREHOUSE_INDEX_H

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

/**
 * @brief Representation of package identifiers.
 * Using int64_t to safely support IDs up to 10^9 and beyond without overflow.
 */
typedef int64_t package_id_t;

/**
 * @brief Categorization of what occurred during an incremental arrival.
 */
typedef enum {
    ARRIVAL_CREATED = 0,        /**< Created a new isolated interval [x, x] */
    ARRIVAL_EXTENDED_LEFT = 1,   /**< Extended an existing successor interval to the left */
    ARRIVAL_EXTENDED_RIGHT = 2,  /**< Extended an existing predecessor interval to the right */
    ARRIVAL_BRIDGED = 3,         /**< Connected two previously separated intervals into one */
    ARRIVAL_DUPLICATE = 4        /**< ID was already present; ignored without changes */
} ArrivalResult;

/**
 * @brief Represents an inclusive consecutive range [start, end].
 */
typedef struct {
    package_id_t start;
    package_id_t end;
} Interval;

/**
 * @brief Opaque Live Arrival Index structure.
 */
typedef struct WarehouseIndex WarehouseIndex;

/**
 * @brief Allocate and initialize a new empty Live Arrival Index.
 * @return Pointer to the allocated WarehouseIndex, or NULL on allocation failure.
 */
WarehouseIndex *warehouse_index_create(void);

/**
 * @brief Free all memory associated with the Live Arrival Index.
 * @param index Pointer to the WarehouseIndex to destroy.
 */
void warehouse_index_free(WarehouseIndex *index);

/**
 * @brief Remove all intervals and reset the index to empty.
 * @param index Pointer to the WarehouseIndex to reset.
 */
void warehouse_index_clear(WarehouseIndex *index);

/**
 * @brief Incrementally record the arrival of a single package ID.
 *
 * Operates in O(log K) time where K is the number of disjoint intervals.
 * Automatically performs interval creation, boundary extension, or bridge merging.
 *
 * @param index Pointer to the Live Arrival Index.
 * @param id Nonnegative package ID.
 * @return ArrivalResult indicating whether an interval was created, extended, bridged, or ignored.
 */
ArrivalResult warehouse_index_add(WarehouseIndex *index, package_id_t id);

/**
 * @brief Incrementally record an array of package IDs.
 * @param index Pointer to the Live Arrival Index.
 * @param ids Array of package IDs.
 * @param count Number of IDs in the array.
 * @return Total number of new unique IDs inserted (excluding duplicates).
 */
size_t warehouse_index_add_batch(WarehouseIndex *index, const package_id_t *ids, size_t count);

/**
 * @brief Query whether a specific package ID has arrived.
 * @param index Pointer to the Live Arrival Index.
 * @param id Package ID to check.
 * @return true if ID is present, false otherwise.
 */
bool warehouse_index_contains(const WarehouseIndex *index, package_id_t id);

/**
 * @brief Get the current number of disjoint intervals in the index.
 */
size_t warehouse_index_interval_count(const WarehouseIndex *index);

/**
 * @brief Get the total number of unique individual package IDs received so far.
 */
size_t warehouse_index_total_packages(const WarehouseIndex *index);

/**
 * @brief Get all current disjoint intervals in ascending order.
 *
 * Caller is responsible for free()'ing the returned array.
 *
 * @param index Pointer to the Live Arrival Index.
 * @param out_count Output pointer receiving the number of intervals returned.
 * @return Dynamically allocated array of Interval, or NULL if empty or error.
 */
Interval *warehouse_index_get_all_intervals(const WarehouseIndex *index, size_t *out_count);

/**
 * @brief Query received intervals overlapping [low, high], clamped to [low, high].
 *
 * Runs in O(log K + M) time where M is the number of overlapping intervals.
 * Caller is responsible for free()'ing the returned array.
 *
 * @param index Pointer to the Live Arrival Index.
 * @param low Lower bound of query window (inclusive).
 * @param high Upper bound of query window (inclusive).
 * @param out_count Output pointer receiving the number of intervals returned.
 * @return Dynamically allocated array of clamped intervals, or NULL if empty.
 */
Interval *warehouse_index_query_intervals_in_range(const WarehouseIndex *index,
                                                   package_id_t low,
                                                   package_id_t high,
                                                   size_t *out_count);

/**
 * @brief Query missing intervals (gaps) within [low, high].
 *
 * Runs in O(log K + M) time where M is the number of overlapping intervals.
 * Caller is responsible for free()'ing the returned array.
 *
 * @param index Pointer to the Live Arrival Index.
 * @param low Lower bound of query window (inclusive).
 * @param high Upper bound of query window (inclusive).
 * @param out_count Output pointer receiving the number of gap intervals returned.
 * @return Dynamically allocated array of gap intervals, or NULL if no gaps exist.
 */
Interval *warehouse_index_query_gaps(const WarehouseIndex *index,
                                     package_id_t low,
                                     package_id_t high,
                                     size_t *out_count);

/**
 * @brief Convert an ArrivalResult enum value to a descriptive string.
 */
const char *arrival_result_to_string(ArrivalResult res);

/**
 * @brief Print a human-readable summary of the current index state.
 */
void warehouse_index_print_summary(const WarehouseIndex *index);

/**
 * @brief Print a comprehensive report showing received intervals and missing gaps in [low, high].
 */
void warehouse_index_print_report(const WarehouseIndex *index, package_id_t low, package_id_t high);

#endif /* WAREHOUSE_INDEX_H */
