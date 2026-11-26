#ifndef HISTORY_H
#define HISTORY_H

#include "insertion.h"
#include <stdint.h>
#include <stdbool.h>
#include <time.h>

typedef struct {
    uint64_t sequence_id;
    int64_t package_id;
    time_t timestamp;
    OperationType op_type;
    bool is_duplicate;
    bool merge_occurred;
    Interval prev_affected_1;
    Interval prev_affected_2;
    Interval updated_interval;
    int intervals_before;
    int intervals_after;
    int64_t unique_packages_before;
    int64_t unique_packages_after;
    char details[256];
} HistoryEntry;

typedef struct {
    HistoryEntry *entries;
    int count;
    int capacity;
    uint64_t next_seq;
} ArrivalHistory;

ArrivalHistory* history_create(int initial_capacity);
void history_destroy(ArrivalHistory *hist);
void history_clear(ArrivalHistory *hist);
void history_record(ArrivalHistory *hist, const OperationResult *res);

// Query and Filter
typedef struct {
    int max_entries;
    int64_t filter_package_id; // -1 for any
    int filter_op_type;        // -1 for any
    bool filter_only_merges;
    bool filter_only_duplicates;
} HistoryFilter;

int history_get_filtered(const ArrivalHistory *hist, const HistoryFilter *filter, 
                         HistoryEntry *out_entries, int max_capacity);

char* history_to_json(const ArrivalHistory *hist, int limit);

#endif // HISTORY_H
