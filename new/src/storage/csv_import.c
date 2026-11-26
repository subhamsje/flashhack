#include "storage.h"
#include "insertion.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

CSVImportStats storage_import_csv(AVLTree *tree, ArrivalHistory *hist, const char *filepath) {
    CSVImportStats stats;
    memset(&stats, 0, sizeof(stats));

    if (!tree || !filepath) {
        snprintf(stats.error_sample, sizeof(stats.error_sample), "Invalid tree or filepath");
        return stats;
    }

    FILE *fp = fopen(filepath, "r");
    if (!fp) {
        snprintf(stats.error_sample, sizeof(stats.error_sample), "Could not open file: %s", filepath);
        return stats;
    }

    char line[512];
    int line_num = 0;

    while (fgets(line, sizeof(line), fp)) {
        line_num++;
        stats.total_lines++;

        // Trim leading and trailing whitespace
        char *start = line;
        while (*start && isspace((unsigned char)*start)) start++;
        char *end = start + strlen(start) - 1;
        while (end > start && isspace((unsigned char)*end)) {
            *end = '\0';
            end--;
        }

        if (*start == '\0' || *start == '#') {
            continue; // Empty line or comment
        }

        // If header line like "package_id" or "id", skip
        if (line_num == 1 && (strstr(start, "package") || strstr(start, "id") || strstr(start, "ID"))) {
            continue;
        }

        // Parse package ID (first token before comma, semicolon, or space)
        char *comma = strchr(start, ',');
        if (!comma) comma = strchr(start, ';');
        if (comma) *comma = '\0';

        char *endptr = NULL;
        long long val = strtoll(start, &endptr, 10);

        if (endptr == start || (*endptr != '\0' && !isspace((unsigned char)*endptr)) || val < 0) {
            stats.invalid_records++;
            if (stats.error_sample[0] == '\0') {
                snprintf(stats.error_sample, sizeof(stats.error_sample),
                         "Line %d: invalid record '%s'", line_num, start);
            }
            continue;
        }

        int64_t pkg_id = (int64_t)val;
        OperationResult res = arrival_process_package(tree, pkg_id);

        if (res.is_duplicate) {
            stats.duplicates_encountered++;
        } else if (res.type != OP_ERROR) {
            stats.valid_packages_read++;
            if (res.merge_occurred) {
                stats.merges_performed++;
            }
        }

        if (hist) {
            history_record(hist, &res);
        }
    }

    fclose(fp);
    return stats;
}
