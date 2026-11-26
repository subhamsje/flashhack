#ifndef INSERTION_H
#define INSERTION_H

#include "avl_tree.h"
#include <stdint.h>
#include <stdbool.h>

typedef enum {
    OP_DUPLICATE = 0,
    OP_NEW_INTERVAL,
    OP_EXTEND_LEFT,
    OP_EXTEND_RIGHT,
    OP_BRIDGE_MERGE,
    OP_ERROR
} OperationType;

const char* operation_type_to_string(OperationType type);

typedef struct {
    int64_t package_id;
    OperationType type;
    bool is_duplicate;
    bool merge_occurred;
    Interval prev_affected_1;      // e.g. predecessor interval before op
    Interval prev_affected_2;      // e.g. successor interval before op (if bridge merge)
    Interval updated_interval;     // resulting interval
    int intervals_before;
    int intervals_after;
    int64_t unique_packages_before;
    int64_t unique_packages_after;
    int execution_steps_count;
    char execution_steps[10][160];  // Step-by-step inspector trace
    RotationEvent rotations[8];
    int rotation_count;
    char details[256];
} OperationResult;

/**
 * Inserts a single package ID incrementally into the AVL Interval Tree.
 * Maintains sorted, non-overlapping, non-adjacent intervals.
 * Performs duplicate detection, extensions, and bridge merges.
 * Returns a comprehensive OperationResult with step-by-step trace.
 */
OperationResult arrival_process_package(AVLTree *tree, int64_t package_id);

/**
 * Inserts a batch of package IDs sequentially.
 * If results_out is not NULL, writes individual OperationResults into it.
 * Returns number of newly added (non-duplicate) packages.
 */
int arrival_process_batch(AVLTree *tree, const int64_t *package_ids, int count, OperationResult *results_out);

#endif // INSERTION_H
