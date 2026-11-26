CC = clang
CFLAGS = -Wall -Wextra -Werror -pedantic -std=c11 -O3 -Iinclude -Isrc
SRC_DIR = src
INC_DIR = include
TEST_DIR = tests
BIN_DIR = bin

SRCS = $(SRC_DIR)/avl_tree.c $(SRC_DIR)/warehouse_index.c
OBJS = $(SRCS:.c=.o)

all: $(BIN_DIR)/warehouse $(BIN_DIR)/test_warehouse

$(BIN_DIR):
	mkdir -p $(BIN_DIR)

$(BIN_DIR)/warehouse: $(OBJS) $(SRC_DIR)/main.o | $(BIN_DIR)
	$(CC) $(CFLAGS) -o $@ $^

$(BIN_DIR)/test_warehouse: $(OBJS) $(TEST_DIR)/test_warehouse.o | $(BIN_DIR)
	$(CC) $(CFLAGS) -o $@ $^

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

test: $(BIN_DIR)/test_warehouse
	./$(BIN_DIR)/test_warehouse

demo: $(BIN_DIR)/warehouse
	./$(BIN_DIR)/warehouse demo

clean:
	rm -rf $(SRC_DIR)/*.o $(TEST_DIR)/*.o $(BIN_DIR)

.PHONY: all test demo clean
