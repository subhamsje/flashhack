# flashhack - Warehouse Live Arrival Index

Solution in C for **Problem Statement 09: The Warehouse's Broken Number Ranges**.

Tracks out-of-order package arrivals and maintains them as compact, sorted consecutive intervals `[start, end]`. Also queries missing ranges (gaps) within any bounded query window `[low, high]`.

## Approach

Instead of allocating a flat array or bitset for package IDs up to $10^9$ (which would consume up to 4 GB of RAM), this uses a self-balancing AVL tree where each node stores an active interval `[start, end]`.

When an ID `x` arrives:
- **Duplicate**: Ignored if already within an existing interval.
- **Extend**: If `x == end + 1` or `x == start - 1`, the interval expands.
- **Bridge merge**: If `x` fills the gap between two intervals (e.g. 106 between `[100, 105]` and `[107, 115]`), they fuse into `[100, 115]` and the extra node is removed.
- **New interval**: If isolated, a new `[x, x]` node is inserted into the tree.

Space complexity is $O(K)$ where $K$ is the count of active disjoint intervals, and insertions/queries run in $O(\log K)$ time.

## Build

Compile with `make`:

```bash
make
```

## Usage

Run the demo (includes the problem statement example `[1, 3, 7, 2, 6]` and bridge merge):

```bash
./warehouse
```

Run unit tests:

```bash
make test
```

Interactive mode:

```bash
./warehouse interactive
```

Example session:
```
> add 1
1 -> CREATED
> add 3
3 -> CREATED
> add 7
7 -> CREATED
> add 2
2 -> BRIDGED
> add 6
6 -> EXTENDED_LEFT
> intervals
[[1, 3], [6, 7]]
> report 1 7
Window [1, 7]:
  Received : [[1, 3], [6, 7]]
  Missing  : [[4, 5]]
```
