#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

static void test_http_endpoint(int port, const char *req, const char *expected_substring) {
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    assert(sock >= 0);

    struct sockaddr_in serv_addr;
    memset(&serv_addr, 0, sizeof(serv_addr));
    serv_addr.sin_family = AF_INET;
    serv_addr.sin_port = htons(port);
    inet_pton(AF_INET, "127.0.0.1", &serv_addr.sin_addr);

    int conn = connect(sock, (struct sockaddr *)&serv_addr, sizeof(serv_addr));
    assert(conn >= 0);

    write(sock, req, strlen(req));

    char response[8192];
    ssize_t n = read(sock, response, sizeof(response) - 1);
    assert(n > 0);
    response[n] = '\0';

    assert(strstr(response, expected_substring) != NULL);
    close(sock);
}

int main(void) {
    printf("Running C HTTP API server test suite...\n");

    /* Test /health */
    test_http_endpoint(8080, "GET /health HTTP/1.1\r\nHost: localhost\r\n\r\n", "\"status\":\"healthy\"");

    /* Test POST /api/arrivals */
    test_http_endpoint(8080, "POST /api/arrivals HTTP/1.1\r\nHost: localhost\r\nContent-Length: 18\r\n\r\n{\"package_id\":100}", "\"operation\":\"CREATED\"");

    /* Test GET /api/intervals */
    test_http_endpoint(8080, "GET /api/intervals HTTP/1.1\r\nHost: localhost\r\n\r\n", "{\"start\":100,\"end\":100}");

    /* Test POST /api/arrivals with neighbor 101 */
    test_http_endpoint(8080, "POST /api/arrivals HTTP/1.1\r\nHost: localhost\r\nContent-Length: 18\r\n\r\n{\"package_id\":101}", "\"operation\":\"EXTENDED_RIGHT\"");

    /* Test GET /api/analytics */
    test_http_endpoint(8080, "GET /api/analytics HTTP/1.1\r\nHost: localhost\r\n\r\n", "\"total_packages\":2");

    /* Test GET /api/tree */
    test_http_endpoint(8080, "GET /api/tree HTTP/1.1\r\nHost: localhost\r\n\r\n", "\"node_count\":1");

    printf("C HTTP API server tests passed successfully!\n");
    return 0;
}
