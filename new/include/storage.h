#ifndef STORAGE_H
#define STORAGE_H

#include "avl_tree.h"
#include "history.h"
#include "analytics.h"
#include <stdint.h>
#include <stdbool.h>

// CSV Import
typedef struct {
    int total_lines;
    int valid_packages_read;
    int invalid_records;
    int duplicates_encountered;
    int merges_performed;
    char error_sample[256];
} CSVImportStats;

CSVImportStats storage_import_csv(AVLTree *tree, ArrivalHistory *hist, const char *filepath);

// CSV Exports
bool storage_export_intervals_csv(const AVLTree *tree, const char *filepath);
bool storage_export_gaps_csv(const AVLTree *tree, int64_t l, int64_t r, const char *filepath);
bool storage_export_history_csv(const ArrivalHistory *hist, const char *filepath);
bool storage_export_analytics_csv(const WarehouseAnalytics *analytics, const char *filepath);

// Persistence (Versioned State File)
#define STORAGE_MAGIC "LAIX"
#define STORAGE_VERSION 1

typedef struct {
    char magic[4];
    uint32_t version;
    int64_t total_packages;
    int32_t total_intervals;
    int64_t arrival_attempts;
    int64_t duplicates;
    int64_t new_intervals;
    int64_t extensions;
    int64_t merges;
    uint32_t checksum;
} StorageHeader;

bool storage_save_state(const AVLTree *tree, const ArrivalHistory *hist,
                        int64_t arrival_attempts, int64_t duplicates,
                        int64_t new_intervals, int64_t extensions, int64_t merges,
                        const char *filepath);

bool storage_load_state(AVLTree *tree, ArrivalHistory *hist,
                        int64_t *out_arrival_attempts, int64_t *out_duplicates,
                        int64_t *out_new_intervals, int64_t *out_extensions, int64_t *out_merges,
                        const char *filepath);

#endif // STORAGE_H
