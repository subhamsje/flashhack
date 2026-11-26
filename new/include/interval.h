#ifndef INTERVAL_H
#define INTERVAL_H

#include <stdint.h>
#include <stdbool.h>

/**
 * Represents a closed interval of received package IDs: [start_id, end_id].
 * Both boundaries are inclusive.
 * Invariant: start_id <= end_id and start_id >= 0.
 */
typedef struct {
    int64_t start_id;
    int64_t end_id;
} Interval;

static inline Interval interval_create(int64_t start_id, int64_t end_id) {
    Interval iv;
    iv.start_id = start_id;
    iv.end_id = end_id;
    return iv;
}

static inline int64_t interval_size(Interval iv) {
    if (iv.start_id > iv.end_id) return 0;
    return iv.end_id - iv.start_id + 1;
}

static inline bool interval_contains(Interval iv, int64_t package_id) {
    return package_id >= iv.start_id && package_id <= iv.end_id;
}

static inline bool interval_adjacent_left(Interval iv, int64_t package_id) {
    return iv.start_id > 0 && iv.start_id - 1 == package_id;
}

static inline bool interval_adjacent_right(Interval iv, int64_t package_id) {
    return iv.end_id + 1 == package_id;
}

static inline bool interval_overlaps(Interval a, Interval b) {
    return !(a.end_id < b.start_id || b.end_id < a.start_id);
}

static inline int interval_compare(Interval a, Interval b) {
    if (a.start_id < b.start_id) return -1;
    if (a.start_id > b.start_id) return 1;
    if (a.end_id < b.end_id) return -1;
    if (a.end_id > b.end_id) return 1;
    return 0;
}

#endif // INTERVAL_H
