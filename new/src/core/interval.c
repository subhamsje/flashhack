#include "interval.h"
#include <stdio.h>

void interval_to_string(Interval iv, char *buffer, size_t buf_size) {
    if (iv.start_id == iv.end_id) {
        snprintf(buffer, buf_size, "[%lld]", (long long)iv.start_id);
    } else {
        snprintf(buffer, buf_size, "[%lld, %lld]", (long long)iv.start_id, (long long)iv.end_id);
    }
}
