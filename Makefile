CC ?= gcc
CFLAGS = -Wall -Wextra -O2 -std=c11

all: warehouse test_warehouse

warehouse: warehouse.c main.c
	$(CC) $(CFLAGS) warehouse.c main.c -o warehouse

test_warehouse: warehouse.c test.c
	$(CC) $(CFLAGS) warehouse.c test.c -o test_warehouse

test: test_warehouse
	./test_warehouse

clean:
	rm -f warehouse test_warehouse

.PHONY: all test clean
