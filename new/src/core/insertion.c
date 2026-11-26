#include "insertion.h"
#include <stdio.h>
#include <string.h>

const char* operation_type_to_string(OperationType type) {
    switch (type) {
        case OP_DUPLICATE: return "DUPLICATE";
        case OP_NEW_INTERVAL: return "NEW_INTERVAL";
        case OP_EXTEND_LEFT: return "EXTEND_LEFT";
        case OP_EXTEND_RIGHT: return "EXTEND_RIGHT";
        case OP_BRIDGE_MERGE: return "BRIDGE_MERGE";
        case OP_ERROR: return "ERROR";
        default: return "UNKNOWN";
    }
}

OperationResult arrival_process_package(AVLTree *tree, int64_t package_id) {
    OperationResult res;
    memset(&res, 0, sizeof(res));
    res.package_id = package_id;

    if (!tree || package_id < 0) {
        res.type = OP_ERROR;
        snprintf(res.details, sizeof(res.details), "Invalid input or null tree reference");
        return res;
    }

    tree->last_rotation_count = 0;
    res.intervals_before = tree->total_intervals;
    res.unique_packages_before = tree->total_unique_packages;

    // Step 1: Search for containing interval
    AVLNode *cont = avl_find_containing(tree, package_id);
    if (cont) {
        res.type = OP_DUPLICATE;
        res.is_duplicate = true;
        res.merge_occurred = false;
        res.prev_affected_1 = interval_create(cont->start_id, cont->end_id);
        res.updated_interval = res.prev_affected_1;
        res.intervals_after = tree->total_intervals;
        res.unique_packages_after = tree->total_unique_packages;

        res.execution_steps_count = 3;
        snprintf(res.execution_steps[0], sizeof(res.execution_steps[0]),
                 "Step 1: Searched AVL tree for package ID %lld", (long long)package_id);
        snprintf(res.execution_steps[1], sizeof(res.execution_steps[1]),
                 "Step 2: Found containing interval [%lld, %lld]",
                 (long long)cont->start_id, (long long)cont->end_id);
        snprintf(res.execution_steps[2], sizeof(res.execution_steps[2]),
                 "Step 3: Duplicate detected; index state unchanged");
        snprintf(res.details, sizeof(res.details),
                 "Package %lld already recorded in interval [%lld, %lld]",
                 (long long)package_id, (long long)cont->start_id, (long long)cont->end_id);
        return res;
    }

    // Locate candidate predecessor and successor intervals
    AVLNode *pred = avl_predecessor_of_id(tree, package_id);
    AVLNode *succ = avl_successor_of_id(tree, package_id);

    bool can_merge_left = (pred != NULL && pred->end_id + 1 == package_id);
    bool can_merge_right = (succ != NULL && package_id + 1 == succ->start_id);

    if (can_merge_left && can_merge_right) {
        // Bridge Merge
        res.type = OP_BRIDGE_MERGE;
        res.is_duplicate = false;
        res.merge_occurred = true;
        res.prev_affected_1 = interval_create(pred->start_id, pred->end_id);
        res.prev_affected_2 = interval_create(succ->start_id, succ->end_id);

        int64_t new_start = pred->start_id;
        int64_t new_end = succ->end_id;
        int64_t old_succ_start = succ->start_id;

        // Perform AVL node deletions and insertion
        tree->root = avl_delete_interval_node(tree, tree->root, old_succ_start);
        tree->root = avl_delete_interval_node(tree, tree->root, new_start);
        tree->root = avl_insert_interval_node(tree, tree->root, new_start, new_end);

        tree->total_intervals -= 1;
        tree->total_unique_packages += 1;

        res.updated_interval = interval_create(new_start, new_end);
        res.intervals_after = tree->total_intervals;
        res.unique_packages_after = tree->total_unique_packages;

        res.execution_steps_count = 6;
        snprintf(res.execution_steps[0], sizeof(res.execution_steps[0]),
                 "Step 1: Queried predecessor and successor for ID %lld", (long long)package_id);
        snprintf(res.execution_steps[1], sizeof(res.execution_steps[1]),
                 "Step 2: Located left interval [%lld, %lld]",
                 (long long)res.prev_affected_1.start_id, (long long)res.prev_affected_1.end_id);
        snprintf(res.execution_steps[2], sizeof(res.execution_steps[2]),
                 "Step 3: Located right interval [%lld, %lld]",
                 (long long)res.prev_affected_2.start_id, (long long)res.prev_affected_2.end_id);
        snprintf(res.execution_steps[3], sizeof(res.execution_steps[3]),
                 "Step 4: Confirmed package bridges [%lld] and [%lld]",
                 (long long)res.prev_affected_1.end_id, (long long)res.prev_affected_2.start_id);
        snprintf(res.execution_steps[4], sizeof(res.execution_steps[4]),
                 "Step 5: Merged intervals into unified node [%lld, %lld]",
                 (long long)new_start, (long long)new_end);
        snprintf(res.execution_steps[5], sizeof(res.execution_steps[5]),
                 "Step 6: Rebalanced AVL tree (total rotations: %d)", tree->last_rotation_count);

        snprintf(res.details, sizeof(res.details),
                 "Bridge merge: [%lld, %lld] + %lld + [%lld, %lld] -> [%lld, %lld]",
                 (long long)res.prev_affected_1.start_id, (long long)res.prev_affected_1.end_id,
                 (long long)package_id,
                 (long long)res.prev_affected_2.start_id, (long long)res.prev_affected_2.end_id,
                 (long long)new_start, (long long)new_end);

    } else if (can_merge_left) {
        // Extend left interval to the right
        res.type = OP_EXTEND_LEFT;
        res.is_duplicate = false;
        res.merge_occurred = false;
        res.prev_affected_1 = interval_create(pred->start_id, pred->end_id);

        int64_t start_id = pred->start_id;
        int64_t end_id = package_id;

        tree->root = avl_delete_interval_node(tree, tree->root, start_id);
        tree->root = avl_insert_interval_node(tree, tree->root, start_id, end_id);

        tree->total_unique_packages += 1;

        res.updated_interval = interval_create(start_id, end_id);
        res.intervals_after = tree->total_intervals;
        res.unique_packages_after = tree->total_unique_packages;

        res.execution_steps_count = 5;
        snprintf(res.execution_steps[0], sizeof(res.execution_steps[0]),
                 "Step 1: Queried bounds for package %lld", (long long)package_id);
        snprintf(res.execution_steps[1], sizeof(res.execution_steps[1]),
                 "Step 2: Located adjacent predecessor [%lld, %lld]",
                 (long long)res.prev_affected_1.start_id, (long long)res.prev_affected_1.end_id);
        snprintf(res.execution_steps[2], sizeof(res.execution_steps[2]),
                 "Step 3: Confirmed ID %lld extends predecessor boundary", (long long)package_id);
        snprintf(res.execution_steps[3], sizeof(res.execution_steps[3]),
                 "Step 4: Extended interval to [%lld, %lld]",
                 (long long)start_id, (long long)end_id);
        snprintf(res.execution_steps[4], sizeof(res.execution_steps[4]),
                 "Step 5: Rebalanced AVL tree and updated subtree metadata");

        snprintf(res.details, sizeof(res.details),
                 "Extended left interval [%lld, %lld] -> [%lld, %lld]",
                 (long long)res.prev_affected_1.start_id, (long long)res.prev_affected_1.end_id,
                 (long long)start_id, (long long)end_id);

    } else if (can_merge_right) {
        // Extend right interval to the left
        res.type = OP_EXTEND_RIGHT;
        res.is_duplicate = false;
        res.merge_occurred = false;
        res.prev_affected_1 = interval_create(succ->start_id, succ->end_id);

        int64_t old_start = succ->start_id;
        int64_t new_start = package_id;
        int64_t end_id = succ->end_id;

        tree->root = avl_delete_interval_node(tree, tree->root, old_start);
        tree->root = avl_insert_interval_node(tree, tree->root, new_start, end_id);

        tree->total_unique_packages += 1;

        res.updated_interval = interval_create(new_start, end_id);
        res.intervals_after = tree->total_intervals;
        res.unique_packages_after = tree->total_unique_packages;

        res.execution_steps_count = 5;
        snprintf(res.execution_steps[0], sizeof(res.execution_steps[0]),
                 "Step 1: Queried bounds for package %lld", (long long)package_id);
        snprintf(res.execution_steps[1], sizeof(res.execution_steps[1]),
                 "Step 2: Located adjacent successor [%lld, %lld]",
                 (long long)res.prev_affected_1.start_id, (long long)res.prev_affected_1.end_id);
        snprintf(res.execution_steps[2], sizeof(res.execution_steps[2]),
                 "Step 3: Confirmed ID %lld prepends successor boundary", (long long)package_id);
        snprintf(res.execution_steps[3], sizeof(res.execution_steps[3]),
                 "Step 4: Prepended interval to [%lld, %lld]",
                 (long long)new_start, (long long)end_id);
        snprintf(res.execution_steps[4], sizeof(res.execution_steps[4]),
                 "Step 5: Rebalanced AVL tree and updated subtree metadata");

        snprintf(res.details, sizeof(res.details),
                 "Extended right interval [%lld, %lld] -> [%lld, %lld]",
                 (long long)res.prev_affected_1.start_id, (long long)res.prev_affected_1.end_id,
                 (long long)new_start, (long long)end_id);

    } else {
        // New isolated interval
        res.type = OP_NEW_INTERVAL;
        res.is_duplicate = false;
        res.merge_occurred = false;

        tree->root = avl_insert_interval_node(tree, tree->root, package_id, package_id);
        tree->total_intervals += 1;
        tree->total_unique_packages += 1;

        res.updated_interval = interval_create(package_id, package_id);
        res.intervals_after = tree->total_intervals;
        res.unique_packages_after = tree->total_unique_packages;

        res.execution_steps_count = 4;
        snprintf(res.execution_steps[0], sizeof(res.execution_steps[0]),
                 "Step 1: Searched predecessor and successor; no adjacent intervals found");
        snprintf(res.execution_steps[1], sizeof(res.execution_steps[1]),
                 "Step 2: Allocated new interval node [%lld, %lld]",
                 (long long)package_id, (long long)package_id);
        snprintf(res.execution_steps[2], sizeof(res.execution_steps[2]),
                 "Step 3: Inserted into AVL tree at key %lld", (long long)package_id);
        snprintf(res.execution_steps[3], sizeof(res.execution_steps[3]),
                 "Step 4: Rebalanced AVL tree (total rotations: %d)", tree->last_rotation_count);

        snprintf(res.details, sizeof(res.details),
                 "Created new isolated interval [%lld, %lld]",
                 (long long)package_id, (long long)package_id);
    }

    res.rotation_count = tree->last_rotation_count;
    for (int i = 0; i < tree->last_rotation_count && i < 8; i++) {
        res.rotations[i] = tree->last_rotations[i];
    }

    return res;
}

int arrival_process_batch(AVLTree *tree, const int64_t *package_ids, int count, OperationResult *results_out) {
    if (!tree || !package_ids || count <= 0) return 0;
    int added = 0;
    for (int i = 0; i < count; i++) {
        OperationResult res = arrival_process_package(tree, package_ids[i]);
        if (!res.is_duplicate && res.type != OP_ERROR) {
            added++;
        }
        if (results_out) {
            results_out[i] = res;
        }
    }
    return added;
}
