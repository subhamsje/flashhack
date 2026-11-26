CC ?= gcc
CFLAGS = -Wall -Wextra -O2 -std=c11 -Icore
SRC_CORE = core/avl_tree.c core/warehouse.c

all: core_test server cli_tool

core_test: $(SRC_CORE) tests/test_core.c
	$(CC) $(CFLAGS) $(SRC_CORE) tests/test_core.c -o tests/test_core

server: $(SRC_CORE) server/main.c
	$(CC) $(CFLAGS) $(SRC_CORE) server/main.c -o server/warehouse_server -lpthread

cli_tool: $(SRC_CORE) cli/main.c
	$(CC) $(CFLAGS) $(SRC_CORE) cli/main.c -o cli/warehouse_cli

test: core_test
	./tests/test_core

clean:
	rm -f tests/test_core server/warehouse_server cli/warehouse_cli
	rm -f warehouse test_warehouse tests/test_api/test_server

.PHONY: all core_test server cli_tool test clean
