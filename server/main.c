#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <inttypes.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <pthread.h>
#include "../core/warehouse.h"

#define DEFAULT_PORT 8080
#define BUFFER_SIZE 65536

static Warehouse *global_warehouse = NULL;
static pthread_mutex_t warehouse_mutex = PTHREAD_MUTEX_INITIALIZER;

/* Helpers to send JSON responses */
static void send_response(int client_fd, int status_code, const char *status_text, const char *content_type, const char *body) {
    char header[1024];
    int body_len = (int)strlen(body);
    int header_len = snprintf(header, sizeof(header),
        "HTTP/1.1 %d %s\r\n"
        "Content-Type: %s\r\n"
        "Content-Length: %d\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n"
        "Access-Control-Allow-Headers: Content-Type, Authorization, X-Session-Id\r\n"
        "Connection: close\r\n\r\n",
        status_code, status_text, content_type, body_len);

    write(client_fd, header, header_len);
    write(client_fd, body, body_len);
}

static void send_json(int client_fd, int status_code, const char *json_body) {
    send_response(client_fd, status_code, "OK", "application/json", json_body);
}

static void send_error(int client_fd, int status_code, const char *msg) {
    char buf[512];
    snprintf(buf, sizeof(buf), "{\"success\":false,\"error\":\"%s\"}", msg);
    send_response(client_fd, status_code, "Error", "application/json", buf);
}

/* Parse simple JSON numbers or string values without bulky dependencies */
static long long extract_json_int(const char *body, const char *key) {
    char pattern[64];
    snprintf(pattern, sizeof(pattern), "\"%s\"", key);
    const char *pos = strstr(body, pattern);
    if (!pos) return -1;
    pos = strchr(pos, ':');
    if (!pos) return -1;
    pos++;
    while (*pos == ' ' || *pos == '\t' || *pos == '\"') pos++;
    return atoll(pos);
}

/* Handle route: POST /api/arrivals */
static void handle_post_arrival(int client_fd, const char *body) {
    long long package_id = extract_json_int(body, "package_id");
    if (package_id < 0) {
        send_error(client_fd, 400, "Invalid package_id (must be nonnegative integer)");
        return;
    }

    pthread_mutex_lock(&warehouse_mutex);
    ArrivalEvent ev = warehouse_add_detailed(global_warehouse, (package_id_t)package_id);
    size_t count = 0;
    Interval *all_ivs = warehouse_get_intervals(global_warehouse, &count);
    pthread_mutex_unlock(&warehouse_mutex);

    char *resp = (char *)malloc(BUFFER_SIZE);
    if (!resp) {
        send_error(client_fd, 500, "Memory allocation error");
        if (all_ivs) free(all_ivs);
        return;
    }

    int pos = snprintf(resp, BUFFER_SIZE,
        "{\"success\":true,\"package_id\":%" PRId64 ","
        "\"operation\":\"%s\","
        "\"prev_interval_count\":%zu,"
        "\"new_interval_count\":%zu,"
        "\"execution_time_ns\":%" PRId64 ","
        "\"touched_new\":{\"start\":%" PRId64 ",\"end\":%" PRId64 "},"
        "\"touched_prev\":[",
        ev.package_id,
        arrival_result_str(ev.result),
        ev.prev_interval_count,
        ev.new_interval_count,
        ev.execution_time_ns,
        ev.touched_new.start,
        ev.touched_new.end);

    for (size_t i = 0; i < ev.touched_prev_count; i++) {
        pos += snprintf(resp + pos, BUFFER_SIZE - pos,
            "{\"start\":%" PRId64 ",\"end\":%" PRId64 "}%s",
            ev.touched_prev[i].start, ev.touched_prev[i].end,
            (i + 1 < ev.touched_prev_count) ? "," : "");
    }

    pos += snprintf(resp + pos, BUFFER_SIZE - pos, "],\"current_intervals\":[");
    for (size_t i = 0; i < count; i++) {
        pos += snprintf(resp + pos, BUFFER_SIZE - pos,
            "{\"start\":%" PRId64 ",\"end\":%" PRId64 "}%s",
            all_ivs[i].start, all_ivs[i].end,
            (i + 1 < count) ? "," : "");
    }
    pos += snprintf(resp + pos, BUFFER_SIZE - pos, "]}");

    send_json(client_fd, 200, resp);
    free(resp);
    if (all_ivs) free(all_ivs);
}

/* Handle route: POST /api/arrivals/batch */
static void handle_post_batch(int client_fd, const char *body) {
    const char *arr_start = strstr(body, "\"package_ids\"");
    if (!arr_start) arr_start = strstr(body, "\"ids\"");
    if (!arr_start) {
        send_error(client_fd, 400, "Missing package_ids array in JSON body");
        return;
    }
    arr_start = strchr(arr_start, '[');
    if (!arr_start) {
        send_error(client_fd, 400, "Malformed package_ids array");
        return;
    }

    size_t added_count = 0;
    size_t total_processed = 0;
    pthread_mutex_lock(&warehouse_mutex);

    const char *p = arr_start + 1;
    while (*p && *p != ']') {
        while (*p == ' ' || *p == ',' || *p == '\t' || *p == '\n') p++;
        if (*p == ']') break;
        long long id = atoll(p);
        if (id >= 0) {
            ArrivalResult r = warehouse_add(global_warehouse, (package_id_t)id);
            if (r != ARRIVAL_DUPLICATE) added_count++;
            total_processed++;
        }
        while (*p && *p != ',' && *p != ']') p++;
    }

    size_t iv_count = warehouse_interval_count(global_warehouse);
    size_t total_pkgs = warehouse_total_packages(global_warehouse);
    pthread_mutex_unlock(&warehouse_mutex);

    char resp[512];
    snprintf(resp, sizeof(resp),
        "{\"success\":true,\"total_processed\":%zu,\"unique_added\":%zu,\"interval_count\":%zu,\"total_packages\":%zu}",
        total_processed, added_count, iv_count, total_pkgs);
    send_json(client_fd, 200, resp);
}

/* Handle route: GET /api/intervals */
static void handle_get_intervals(int client_fd) {
    pthread_mutex_lock(&warehouse_mutex);
    size_t count = 0;
    Interval *ivs = warehouse_get_intervals(global_warehouse, &count);
    size_t total_pkgs = warehouse_total_packages(global_warehouse);
    pthread_mutex_unlock(&warehouse_mutex);

    char *resp = (char *)malloc(BUFFER_SIZE);
    if (!resp) {
        send_error(client_fd, 500, "Memory allocation failed");
        if (ivs) free(ivs);
        return;
    }

    int pos = snprintf(resp, BUFFER_SIZE,
        "{\"success\":true,\"total_packages\":%zu,\"interval_count\":%zu,\"intervals\":[",
        total_pkgs, count);

    for (size_t i = 0; i < count; i++) {
        pos += snprintf(resp + pos, BUFFER_SIZE - pos,
            "{\"start\":%" PRId64 ",\"end\":%" PRId64 "}%s",
            ivs[i].start, ivs[i].end,
            (i + 1 < count) ? "," : "");
    }
    pos += snprintf(resp + pos, BUFFER_SIZE - pos, "]}");

    send_json(client_fd, 200, resp);
    free(resp);
    if (ivs) free(ivs);
}

/* Handle route: GET /api/gaps?low=X&high=Y */
static void handle_get_gaps(int client_fd, const char *query) {
    long long low = 0, high = 1000;
    const char *p_low = strstr(query, "low=");
    if (p_low) low = atoll(p_low + 4);
    const char *p_high = strstr(query, "high=");
    if (p_high) high = atoll(p_high + 5);

    if (low < 0 || low > high) {
        send_error(client_fd, 400, "Invalid query range (low must be <= high)");
        return;
    }

    pthread_mutex_lock(&warehouse_mutex);
    size_t gap_count = 0;
    Interval *gaps = warehouse_query_gaps(global_warehouse, (package_id_t)low, (package_id_t)high, &gap_count);
    size_t recv_count = 0;
    Interval *recv = warehouse_query_range(global_warehouse, (package_id_t)low, (package_id_t)high, &recv_count);
    pthread_mutex_unlock(&warehouse_mutex);

    char *resp = (char *)malloc(BUFFER_SIZE);
    if (!resp) {
        send_error(client_fd, 500, "Memory allocation error");
        if (gaps) free(gaps);
        if (recv) free(recv);
        return;
    }

    int pos = snprintf(resp, BUFFER_SIZE,
        "{\"success\":true,\"low\":%" PRId64 ",\"high\":%" PRId64 ",\"gap_count\":%zu,\"received_count\":%zu,\"gaps\":[",
        (package_id_t)low, (package_id_t)high, gap_count, recv_count);

    for (size_t i = 0; i < gap_count; i++) {
        pos += snprintf(resp + pos, BUFFER_SIZE - pos,
            "{\"start\":%" PRId64 ",\"end\":%" PRId64 "}%s",
            gaps[i].start, gaps[i].end,
            (i + 1 < gap_count) ? "," : "");
    }

    pos += snprintf(resp + pos, BUFFER_SIZE - pos, "],\"received\":[");
    for (size_t i = 0; i < recv_count; i++) {
        pos += snprintf(resp + pos, BUFFER_SIZE - pos,
            "{\"start\":%" PRId64 ",\"end\":%" PRId64 "}%s",
            recv[i].start, recv[i].end,
            (i + 1 < recv_count) ? "," : "");
    }
    pos += snprintf(resp + pos, BUFFER_SIZE - pos, "]}");

    send_json(client_fd, 200, resp);
    free(resp);
    if (gaps) free(gaps);
    if (recv) free(recv);
}

/* Handle route: GET /api/search?id=X */
static void handle_get_search(int client_fd, const char *query) {
    long long target_id = -1;
    const char *p_id = strstr(query, "id=");
    if (p_id) target_id = atoll(p_id + 3);

    if (target_id < 0) {
        send_error(client_fd, 400, "Missing or invalid id parameter");
        return;
    }

    pthread_mutex_lock(&warehouse_mutex);
    Interval containing, pred, succ;
    bool found = warehouse_find_neighbors(global_warehouse, (package_id_t)target_id, &containing, &pred, &succ);
    pthread_mutex_unlock(&warehouse_mutex);

    char resp[1024];
    snprintf(resp, sizeof(resp),
        "{\"success\":true,\"id\":%" PRId64 ",\"found\":%s,"
        "\"containing\":{\"start\":%" PRId64 ",\"end\":%" PRId64 "},"
        "\"predecessor\":{\"start\":%" PRId64 ",\"end\":%" PRId64 "},"
        "\"successor\":{\"start\":%" PRId64 ",\"end\":%" PRId64 "}}",
        (package_id_t)target_id,
        found ? "true" : "false",
        containing.start, containing.end,
        pred.start, pred.end,
        succ.start, succ.end);

    send_json(client_fd, 200, resp);
}

/* Handle route: GET /api/analytics */
static void handle_get_analytics(int client_fd) {
    pthread_mutex_lock(&warehouse_mutex);
    WarehouseAnalytics an = warehouse_get_analytics(global_warehouse);
    pthread_mutex_unlock(&warehouse_mutex);

    char resp[1024];
    snprintf(resp, sizeof(resp),
        "{\"success\":true,\"analytics\":{"
        "\"total_packages\":%zu,"
        "\"interval_count\":%zu,"
        "\"bridge_count\":%zu,"
        "\"extension_count\":%zu,"
        "\"creation_count\":%zu,"
        "\"duplicate_count\":%zu,"
        "\"min_id\":%" PRId64 ","
        "\"max_id\":%" PRId64 ","
        "\"largest_interval_size\":%" PRId64 ","
        "\"avg_interval_size\":%.2f,"
        "\"coverage_ratio\":%.4f}}",
        an.total_packages, an.interval_count, an.bridge_count,
        an.extension_count, an.creation_count, an.duplicate_count,
        an.min_id, an.max_id, an.largest_interval_size,
        an.avg_interval_size, an.coverage_ratio);

    send_json(client_fd, 200, resp);
}

/* Handle route: GET /api/tree */
static void handle_get_tree(int client_fd) {
    pthread_mutex_lock(&warehouse_mutex);
    TreeSnapshot snap = warehouse_get_tree_snapshot(global_warehouse);
    pthread_mutex_unlock(&warehouse_mutex);

    char *resp = (char *)malloc(BUFFER_SIZE);
    if (!resp) {
        send_error(client_fd, 500, "Memory allocation error");
        warehouse_free_tree_snapshot(snap);
        return;
    }

    int pos = snprintf(resp, BUFFER_SIZE,
        "{\"success\":true,\"node_count\":%zu,\"max_depth\":%d,\"nodes\":[",
        snap.node_count, snap.max_depth);

    for (size_t i = 0; i < snap.node_count; i++) {
        pos += snprintf(resp + pos, BUFFER_SIZE - pos,
            "{\"node_id\":%" PRId64 ",\"parent_id\":%" PRId64 ","
            "\"left_id\":%" PRId64 ",\"right_id\":%" PRId64 ","
            "\"start\":%" PRId64 ",\"end\":%" PRId64 ","
            "\"height\":%d,\"balance_factor\":%d,\"depth\":%d}%s",
            snap.nodes[i].node_id, snap.nodes[i].parent_id,
            snap.nodes[i].left_id, snap.nodes[i].right_id,
            snap.nodes[i].start, snap.nodes[i].end,
            snap.nodes[i].height, snap.nodes[i].balance_factor,
            snap.nodes[i].depth,
            (i + 1 < snap.node_count) ? "," : "");
    }
    pos += snprintf(resp + pos, BUFFER_SIZE - pos, "]}");

    send_json(client_fd, 200, resp);
    free(resp);
    warehouse_free_tree_snapshot(snap);
}

/* Handle route: POST /api/reset */
static void handle_post_reset(int client_fd) {
    pthread_mutex_lock(&warehouse_mutex);
    warehouse_clear(global_warehouse);
    pthread_mutex_unlock(&warehouse_mutex);

    send_json(client_fd, 200, "{\"success\":true,\"message\":\"Warehouse index reset successfully\"}");
}

/* Client request dispatcher */
static void handle_client(int client_fd) {
    char buffer[BUFFER_SIZE];
    ssize_t bytes_read = read(client_fd, buffer, sizeof(buffer) - 1);
    if (bytes_read <= 0) {
        close(client_fd);
        return;
    }
    buffer[bytes_read] = '\0';

    char method[16], uri[256];
    if (sscanf(buffer, "%15s %255s", method, uri) < 2) {
        send_error(client_fd, 400, "Malformed HTTP request");
        close(client_fd);
        return;
    }

    /* Handle CORS preflight OPTIONS request */
    if (strcmp(method, "OPTIONS") == 0) {
        send_response(client_fd, 204, "No Content", "text/plain", "");
        close(client_fd);
        return;
    }

    /* Extract body if POST/PUT */
    const char *body = strstr(buffer, "\r\n\r\n");
    if (body) body += 4;
    else body = "";

    /* Route matching */
    if (strcmp(method, "POST") == 0 && strcmp(uri, "/api/arrivals") == 0) {
        handle_post_arrival(client_fd, body);
    } else if (strcmp(method, "POST") == 0 && strcmp(uri, "/api/arrivals/batch") == 0) {
        handle_post_batch(client_fd, body);
    } else if (strcmp(method, "GET") == 0 && strncmp(uri, "/api/intervals", 14) == 0) {
        handle_get_intervals(client_fd);
    } else if (strcmp(method, "GET") == 0 && strncmp(uri, "/api/gaps", 9) == 0) {
        handle_get_gaps(client_fd, uri);
    } else if (strcmp(method, "GET") == 0 && strncmp(uri, "/api/search", 11) == 0) {
        handle_get_search(client_fd, uri);
    } else if (strcmp(method, "GET") == 0 && strcmp(uri, "/api/analytics") == 0) {
        handle_get_analytics(client_fd);
    } else if (strcmp(method, "GET") == 0 && strcmp(uri, "/api/tree") == 0) {
        handle_get_tree(client_fd);
    } else if (strcmp(method, "POST") == 0 && strcmp(uri, "/api/reset") == 0) {
        handle_post_reset(client_fd);
    } else if (strcmp(method, "GET") == 0 && strcmp(uri, "/health") == 0) {
        send_json(client_fd, 200, "{\"status\":\"healthy\",\"service\":\"flashhack-c-engine\",\"version\":\"2.0.0\"}");
    } else {
        send_error(client_fd, 404, "Endpoint not found");
    }

    close(client_fd);
}

int main(int argc, char **argv) {
    int port = DEFAULT_PORT;
    if (argc > 1) {
        port = atoi(argv[1]);
    }

    global_warehouse = warehouse_create();
    if (!global_warehouse) {
        fprintf(stderr, "Failed to initialize global warehouse index.\n");
        return 1;
    }

    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) {
        perror("socket failed");
        return 1;
    }

    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in address;
    memset(&address, 0, sizeof(address));
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(port);

    if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) < 0) {
        perror("bind failed");
        close(server_fd);
        return 1;
    }

    if (listen(server_fd, 64) < 0) {
        perror("listen failed");
        close(server_fd);
        return 1;
    }

    printf("=========================================================\n");
    printf(" FLASHHACK Live Arrival C Engine HTTP Server v2.0\n");
    printf(" Listening on http://0.0.0.0:%d\n", port);
    printf("=========================================================\n");

    while (1) {
        struct sockaddr_in client_addr;
        socklen_t addr_len = sizeof(client_addr);
        int client_fd = accept(server_fd, (struct sockaddr *)&client_addr, &addr_len);
        if (client_fd < 0) continue;
        handle_client(client_fd);
    }

    close(server_fd);
    warehouse_free(global_warehouse);
    return 0;
}
