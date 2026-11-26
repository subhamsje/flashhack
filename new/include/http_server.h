#ifndef HTTP_SERVER_H
#define HTTP_SERVER_H

#include <stdbool.h>

typedef struct {
    int port;
    const char *web_root;
    volatile bool running;
} HTTPServerConfig;

int http_server_start(const HTTPServerConfig *config);
void http_server_stop(void);

#endif // HTTP_SERVER_H
