#include "storage.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static uint32_t calculate_checksum(const Interval *intervals, int count) {
    uint32_t sum1 = 0xffff, sum2 = 0xffff;
    const uint8_t *data = (const uint8_t*)intervals;
    size_t len = sizeof(Interval) * count;

    while (len) {
        size_t tlen = len > 359 ? 359 : len;
        len -= tlen;
        do {
            sum1 += *data++;
            sum2 += sum1;
        } while (--tlen);
        sum1 = (sum1 & 0xffff) + (sum1 >> 16);
        sum2 = (sum2 & 0xffff) + (sum2 >> 16);
    }
    sum1 = (sum1 & 0xffff) + (sum1 >> 16);
    sum2 = (sum2 & 0xffff) + (sum2 >> 16);
    return (sum2 << 16) | sum1;
}

bool storage_save_state(const AVLTree *tree, const ArrivalHistory *hist,
                        int64_t arrival_attempts, int64_t duplicates,
                        int64_t new_intervals, int64_t extensions, int64_t merges,
                        const char *filepath) {
    (void)hist;
    if (!tree || !filepath) return false;

    FILE *fp = fopen(filepath, "wb");
    if (!fp) return false;

    Interval *intervals = NULL;
    int count = avl_get_all_intervals(tree, &intervals);

    StorageHeader header;
    memcpy(header.magic, STORAGE_MAGIC, 4);
    header.version = STORAGE_VERSION;
    header.total_packages = tree->total_unique_packages;
    header.total_intervals = count;
    header.arrival_attempts = arrival_attempts;
    header.duplicates = duplicates;
    header.new_intervals = new_intervals;
    header.extensions = extensions;
    header.merges = merges;
    header.checksum = calculate_checksum(intervals, count);

    if (fwrite(&header, sizeof(StorageHeader), 1, fp) != 1) {
        if (intervals) free(intervals);
        fclose(fp);
        return false;
    }

    if (count > 0 && intervals) {
        if (fwrite(intervals, sizeof(Interval), count, fp) != (size_t)count) {
            free(intervals);
            fclose(fp);
            return false;
        }
        free(intervals);
    }

    fclose(fp);
    return true;
}

bool storage_load_state(AVLTree *tree, ArrivalHistory *hist,
                        int64_t *out_arrival_attempts, int64_t *out_duplicates,
                        int64_t *out_new_intervals, int64_t *out_extensions, int64_t *out_merges,
                        const char *filepath) {
    if (!tree || !filepath) return false;

    FILE *fp = fopen(filepath, "rb");
    if (!fp) return false;

    StorageHeader header;
    if (fread(&header, sizeof(StorageHeader), 1, fp) != 1) {
        fclose(fp);
        return false;
    }

    if (memcmp(header.magic, STORAGE_MAGIC, 4) != 0 || header.version != STORAGE_VERSION) {
        fclose(fp);
        return false;
    }

    if (header.total_intervals < 0 || header.total_intervals > 10000000) {
        fclose(fp);
        return false;
    }

    Interval *intervals = NULL;
    if (header.total_intervals > 0) {
        intervals = (Interval*)malloc(sizeof(Interval) * header.total_intervals);
        if (!intervals) {
            fclose(fp);
            return false;
        }
        if (fread(intervals, sizeof(Interval), header.total_intervals, fp) != (size_t)header.total_intervals) {
            free(intervals);
            fclose(fp);
            return false;
        }

        uint32_t csum = calculate_checksum(intervals, header.total_intervals);
        if (csum != header.checksum) {
            free(intervals);
            fclose(fp);
            return false; // Corrupted state file
        }

        // Validate interval ordering and non-overlap
        for (int i = 0; i < header.total_intervals; i++) {
            if (intervals[i].start_id > intervals[i].end_id || intervals[i].start_id < 0) {
                free(intervals);
                fclose(fp);
                return false;
            }
            if (i > 0 && intervals[i - 1].end_id + 1 >= intervals[i].start_id) {
                free(intervals);
                fclose(fp);
                return false; // Overlap or unmerged adjacency in serialized data
            }
        }
    }

    fclose(fp);

    // Safely reconstruct the AVL tree
    avl_clear(tree);
    if (hist) {
        history_clear(hist);
    }

    // Insert intervals into AVL tree
    for (int i = 0; i < header.total_intervals; i++) {
        tree->root = avl_insert_interval_node(tree, tree->root, intervals[i].start_id, intervals[i].end_id);
    }
    tree->total_intervals = header.total_intervals;
    tree->total_unique_packages = header.total_packages;

    if (intervals) free(intervals);

    TreeValidationResult val = avl_validate_invariants(tree);
    if (!val.is_valid) {
        avl_clear(tree);
        return false;
    }

    if (out_arrival_attempts) *out_arrival_attempts = header.arrival_attempts;
    if (out_duplicates) *out_duplicates = header.duplicates;
    if (out_new_intervals) *out_new_intervals = header.new_intervals;
    if (out_extensions) *out_extensions = header.extensions;
    if (out_merges) *out_merges = header.merges;

    return true;
}
