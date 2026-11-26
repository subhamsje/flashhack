#include "history.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

ArrivalHistory* history_create(int initial_capacity) {
    ArrivalHistory *hist = (ArrivalHistory*)malloc(sizeof(ArrivalHistory));
    if (!hist) return NULL;
    hist->capacity = initial_capacity > 16 ? initial_capacity : 128;
    hist->entries = (HistoryEntry*)malloc(sizeof(HistoryEntry) * hist->capacity);
    hist->count = 0;
    hist->next_seq = 1;
    return hist;
}

void history_destroy(ArrivalHistory *hist) {
    if (!hist) return;
    if (hist->entries) {
        free(hist->entries);
    }
    free(hist);
}

void history_clear(ArrivalHistory *hist) {
    if (!hist) return;
    hist->count = 0;
    hist->next_seq = 1;
}

void history_record(ArrivalHistory *hist, const OperationResult *res) {
    if (!hist || !res) return;

    if (hist->count >= hist->capacity) {
        hist->capacity *= 2;
        hist->entries = (HistoryEntry*)realloc(hist->entries, sizeof(HistoryEntry) * hist->capacity);
    }

    HistoryEntry *entry = &hist->entries[hist->count++];
    entry->sequence_id = hist->next_seq++;
    entry->package_id = res->package_id;
    entry->timestamp = time(NULL);
    entry->op_type = res->type;
    entry->is_duplicate = res->is_duplicate;
    entry->merge_occurred = res->merge_occurred;
    entry->prev_affected_1 = res->prev_affected_1;
    entry->prev_affected_2 = res->prev_affected_2;
    entry->updated_interval = res->updated_interval;
    entry->intervals_before = res->intervals_before;
    entry->intervals_after = res->intervals_after;
    entry->unique_packages_before = res->unique_packages_before;
    entry->unique_packages_after = res->unique_packages_after;
    strncpy(entry->details, res->details, sizeof(entry->details) - 1);
    entry->details[sizeof(entry->details) - 1] = '\0';
}

int history_get_filtered(const ArrivalHistory *hist, const HistoryFilter *filter,
                         HistoryEntry *out_entries, int max_capacity) {
    if (!hist || !filter || !out_entries || max_capacity <= 0) return 0;

    int written = 0;
    // Iterate from newest to oldest
    for (int i = hist->count - 1; i >= 0 && written < max_capacity; i--) {
        const HistoryEntry *e = &hist->entries[i];

        if (filter->filter_package_id >= 0 && e->package_id != filter->filter_package_id) {
            continue;
        }
        if (filter->filter_op_type >= 0 && (int)e->op_type != filter->filter_op_type) {
            continue;
        }
        if (filter->filter_only_merges && !e->merge_occurred) {
            continue;
        }
        if (filter->filter_only_duplicates && !e->is_duplicate) {
            continue;
        }

        out_entries[written++] = *e;
        if (filter->max_entries > 0 && written >= filter->max_entries) {
            break;
        }
    }
    return written;
}

char* history_to_json(const ArrivalHistory *hist, int limit) {
    if (!hist) {
        char *empty = (char*)malloc(16);
        strcpy(empty, "[]");
        return empty;
    }

    int n = hist->count;
    if (limit > 0 && n > limit) {
        n = limit;
    }

    size_t cap = 256 + (n * 320);
    char *buf = (char*)malloc(cap);
    if (!buf) return NULL;

    strcpy(buf, "[");
    size_t offset = 1;

    // Show newest first
    int start_idx = hist->count - 1;
    int end_idx = hist->count - n;
    bool first = true;

    for (int i = start_idx; i >= end_idx && i >= 0; i--) {
        const HistoryEntry *e = &hist->entries[i];
        if (!first) {
            strcat(buf + offset, ",");
            offset += 1;
        }
        first = false;

        char item[512];
        int len = snprintf(item, sizeof(item),
            "{\"seq\":%llu,\"package_id\":%lld,\"timestamp\":%lld,\"op_type\":\"%s\","
            "\"is_duplicate\":%s,\"merge_occurred\":%s,"
            "\"intervals_before\":%d,\"intervals_after\":%d,"
            "\"unique_before\":%lld,\"unique_after\":%lld,"
            "\"details\":\"%s\"}",
            (unsigned long long)e->sequence_id,
            (long long)e->package_id,
            (long long)e->timestamp,
            operation_type_to_string(e->op_type),
            e->is_duplicate ? "true" : "false",
            e->merge_occurred ? "true" : "false",
            e->intervals_before, e->intervals_after,
            (long long)e->unique_packages_before, (long long)e->unique_packages_after,
            e->details
        );

        if (offset + len + 10 >= cap) {
            cap *= 2;
            buf = (char*)realloc(buf, cap);
        }
        strcat(buf + offset, item);
        offset += len;
    }

    strcat(buf + offset, "]");
    return buf;
}
