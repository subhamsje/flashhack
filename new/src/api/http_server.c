#include "http_server.h"
#include "api_handlers.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#if defined(_WIN32) || defined(_WIN64)
#include <winsock2.h>
#include <ws2tcpip.h>
typedef int socklen_t;
#define close_socket(s) closesocket(s)
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
typedef int SOCKET;
#define INVALID_SOCKET (-1)
#define SOCKET_ERROR (-1)
#define close_socket(s) close(s)
#endif

static const char* get_mime_type(const char *path) {
    const char *dot = strrchr(path, '.');
    if (!dot) return "text/plain";
    if (strcmp(dot, ".html") == 0) return "text/html";
    if (strcmp(dot, ".css") == 0) return "text/css";
    if (strcmp(dot, ".js") == 0) return "application/javascript";
    if (strcmp(dot, ".json") == 0) return "application/json";
    if (strcmp(dot, ".svg") == 0) return "image/svg+xml";
    if (strcmp(dot, ".png") == 0) return "image/png";
    if (strcmp(dot, ".ico") == 0) return "image/x-icon";
    return "text/plain";
}

static void send_response(SOCKET client, int status_code, const char *status_text,
                          const char *content_type, const char *body, size_t body_len) {
    char header[512];
    int header_len = snprintf(header, sizeof(header),
        "HTTP/1.1 %d %s\r\n"
        "Content-Type: %s; charset=utf-8\r\n"
        "Content-Length: %zu\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
        "Access-Control-Allow-Headers: Content-Type\r\n"
        "Connection: close\r\n\r\n",
        status_code, status_text, content_type, body_len);

    send(client, header, header_len, 0);
    if (body && body_len > 0) {
        send(client, body, (int)body_len, 0);
    }
}

static void serve_static_file(SOCKET client, const char *web_root, const char *path) {
    char filepath[512];
    if (strcmp(path, "/") == 0 || strcmp(path, "/index.html") == 0) {
        snprintf(filepath, sizeof(filepath), "%s/index.html", web_root);
    } else {
        snprintf(filepath, sizeof(filepath), "%s%s", web_root, path);
    }

    FILE *fp = fopen(filepath, "rb");
    if (!fp) {
        const char *not_found = "<h1>404 Not Found</h1>";
        send_response(client, 404, "Not Found", "text/html", not_found, strlen(not_found));
        return;
    }

    fseek(fp, 0, SEEK_END);
    long fsize = ftell(fp);
    fseek(fp, 0, SEEK_SET);

    char *filebuf = (char*)malloc(fsize);
    if (!filebuf) {
        fclose(fp);
        const char *err = "Internal Server Error";
        send_response(client, 500, "Internal Server Error", "text/plain", err, strlen(err));
        return;
    }

    fread(filebuf, 1, fsize, fp);
    fclose(fp);

    const char *mime = get_mime_type(filepath);
    send_response(client, 200, "OK", mime, filebuf, fsize);
    free(filebuf);
}

int http_server_start(const HTTPServerConfig *config) {
#if defined(_WIN32) || defined(_WIN64)
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
        fprintf(stderr, "Failed to initialize Winsock.\n");
        return -1;
    }
#endif

    SOCKET server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd == INVALID_SOCKET) {
        fprintf(stderr, "Failed to create socket.\n");
        return -1;
    }

    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, (char*)&opt, sizeof(opt));

    struct sockaddr_in address;
    memset(&address, 0, sizeof(address));
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons((unsigned short)config->port);

    if (bind(server_fd, (struct sockaddr*)&address, sizeof(address)) == SOCKET_ERROR) {
        fprintf(stderr, "Failed to bind server to port %d.\n", config->port);
        close_socket(server_fd);
        return -1;
    }

    if (listen(server_fd, 16) == SOCKET_ERROR) {
        fprintf(stderr, "Failed to listen on socket.\n");
        close_socket(server_fd);
        return -1;
    }

    api_init_state();

    printf("\n====================================================================\n");
    printf("   LIVE ARRIVAL INDEX - HTTP API & WAREHOUSE SERVER ACTIVE          \n");
    printf("   URL: http://localhost:%d/                                        \n", config->port);
    printf("   Web Dashboard: Serving from '%s'                                 \n", config->web_root);
    printf("   Press Ctrl+C to terminate server                                \n");
    printf("====================================================================\n\n");

    char recv_buf[65536];

    while (config->running) {
        struct sockaddr_in client_addr;
        socklen_t addr_len = sizeof(client_addr);
        SOCKET client = accept(server_fd, (struct sockaddr*)&client_addr, &addr_len);
        if (client == INVALID_SOCKET) {
            continue;
        }

        int bytes_read = recv(client, recv_buf, sizeof(recv_buf) - 1, 0);
        if (bytes_read > 0) {
            recv_buf[bytes_read] = '\0';

            // Check Content-Length to ensure entire body is read
            int content_length = 0;
            char *cl_header = strstr(recv_buf, "Content-Length:");
            if (!cl_header) cl_header = strstr(recv_buf, "content-length:");
            if (cl_header) {
                content_length = atoi(cl_header + 15);
            }

            char *body = strstr(recv_buf, "\r\n\r\n");
            if (body) {
                body += 4;
                int body_received = bytes_read - (int)(body - recv_buf);
                while (body_received < content_length && bytes_read < (int)sizeof(recv_buf) - 1) {
                    int more = recv(client, recv_buf + bytes_read, sizeof(recv_buf) - 1 - bytes_read, 0);
                    if (more <= 0) break;
                    bytes_read += more;
                    recv_buf[bytes_read] = '\0';
                    body_received += more;
                }
            }

            char method[16] = {0};
            char full_path[512] = {0};
            char version[16] = {0};

            sscanf(recv_buf, "%15s %511s %15s", method, full_path, version);

            // Handle CORS preflight
            if (strcmp(method, "OPTIONS") == 0) {
                send_response(client, 204, "No Content", "text/plain", "", 0);
                close_socket(client);
                continue;
            }

            char path[512] = {0};
            char *query = NULL;
            char *qmark = strchr(full_path, '?');
            if (qmark) {
                size_t path_len = qmark - full_path;
                strncpy(path, full_path, path_len);
                path[path_len] = '\0';
                query = qmark + 1;
            } else {
                snprintf(path, sizeof(path), "%s", full_path);
            }


            if (strncmp(path, "/api/", 5) == 0) {
                char *resp = NULL;
                const char *mime = "application/json";
                int code = api_handle_request(method, path, query, body, &resp, &mime);
                const char *status_str = (code == 200) ? "OK" :
                                         (code == 204) ? "No Content" :
                                         (code == 400) ? "Bad Request" :
                                         (code == 404) ? "Not Found" : "Internal Error";
                send_response(client, code, status_str, mime, resp ? resp : "", resp ? strlen(resp) : 0);
                if (resp) free(resp);
            } else {
                serve_static_file(client, config->web_root, path);
            }
        }

        close_socket(client);
    }

    api_cleanup_state();
    close_socket(server_fd);
#if defined(_WIN32) || defined(_WIN64)
    WSACleanup();
#endif
    return 0;
}
