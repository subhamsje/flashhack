#include "http_server.h"
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>

static HTTPServerConfig g_config;

static void handle_sigint(int sig) {
    (void)sig;
    printf("\nShutting down HTTP server...\n");
    g_config.running = false;
    exit(0);
}

int main(int argc, char *argv[]) {
    int port = 8080;
    const char *web_root = "web";

    if (argc > 1) {
        port = atoi(argv[1]);
        if (port <= 0 || port > 65535) port = 8080;
    }
    if (argc > 2) {
        web_root = argv[2];
    }

    g_config.port = port;
    g_config.web_root = web_root;
    g_config.running = true;

    signal(SIGINT, handle_sigint);
    signal(SIGTERM, handle_sigint);

    return http_server_start(&g_config);
}
