CC = gcc
CFLAGS = -Wall -Wextra -O2 -Iinclude
LDFLAGS = -lws2_32

CORE_SRC = src/core/avl_tree.c src/core/interval.c src/core/insertion.c \
           src/core/search.c src/core/gap_analysis.c src/core/analytics.c
HIST_SRC = src/history/history.c
STOR_SRC = src/storage/csv_import.c src/storage/csv_export.c src/storage/persistence.c
BENCH_SRC = src/benchmark/benchmark.c
TEST_SRC = tests/test_avl.c tests/test_intervals.c tests/test_merging.c \
           tests/test_sparse_ids.c tests/test_randomized.c

ALL_COMMON_SRC = $(CORE_SRC) $(HIST_SRC) $(STOR_SRC) $(BENCH_SRC)

all: bin_test.exe live_arrival_cli.exe live_arrival_server.exe

bin_test.exe: $(ALL_COMMON_SRC) $(TEST_SRC) tests/test_runner.c
	$(CC) $(CFLAGS) $^ -o $@

live_arrival_cli.exe: $(ALL_COMMON_SRC) src/cli/main.c
	$(CC) $(CFLAGS) $^ -o $@

live_arrival_server.exe: $(ALL_COMMON_SRC) src/api/api_handlers.c src/api/http_server.c src/api/server_main.c $(TEST_SRC)
	$(CC) $(CFLAGS) $^ -o $@ $(LDFLAGS)

test: bin_test.exe
	./bin_test.exe

clean:
	rm -f bin_test.exe live_arrival_cli.exe live_arrival_server.exe *.o
