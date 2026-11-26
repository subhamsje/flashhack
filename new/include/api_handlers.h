#ifndef API_HANDLERS_H
#define API_HANDLERS_H

#include "avl_tree.h"
#include "history.h"
#include <stddef.h>

typedef struct {
    AVLTree *tree;
    ArrivalHistory *history;
    int64_t arrival_attempts;
    int64_t duplicates;
    int64_t new_intervals;
    int64_t extensions;
    int64_t merges;
} WarehouseState;

extern WarehouseState g_warehouse;

void api_init_state(void);
void api_cleanup_state(void);

// Route dispatcher: processes HTTP request line, headers, and body, and writes response string
int api_handle_request(const char *method, const char *path, const char *query, 
                       const char *body, char **response_out, const char **content_type_out);

#endif // API_HANDLERS_H
