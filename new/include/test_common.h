#ifndef TEST_COMMON_H
#define TEST_COMMON_H

#include <stdio.h>
#include <stdbool.h>
#include <string.h>

typedef struct {
    int total_tests;
    int passed_tests;
    int failed_tests;
    double elapsed_ms;
} TestReport;

#define ASSERT_TRUE(expr, msg) do { \
    if (!(expr)) { \
        printf("  [FAIL] %s:%d: %s (Assertion '%s' failed)\n", __FILE__, __LINE__, msg, #expr); \
        return false; \
    } \
} while (0)

#define ASSERT_FALSE(expr, msg) ASSERT_TRUE(!(expr), msg)

#define ASSERT_EQ_INT(a, b, msg) do { \
    long long _a = (long long)(a); \
    long long _b = (long long)(b); \
    if (_a != _b) { \
        printf("  [FAIL] %s:%d: %s (Expected %lld, got %lld)\n", __FILE__, __LINE__, msg, _b, _a); \
        return false; \
    } \
} while (0)

#define ASSERT_EQ_STR(a, b, msg) do { \
    if (strcmp((a), (b)) != 0) { \
        printf("  [FAIL] %s:%d: %s (Expected \"%s\", got \"%s\")\n", __FILE__, __LINE__, msg, (b), (a)); \
        return false; \
    } \
} while (0)

#define RUN_TEST(test_func, report) do { \
    report.total_tests++; \
    printf("Running %s... ", #test_func); \
    fflush(stdout); \
    if (test_func()) { \
        printf("PASSED\n"); \
        report.passed_tests++; \
    } else { \
        report.failed_tests++; \
    } \
} while (0)

#endif // TEST_COMMON_H
