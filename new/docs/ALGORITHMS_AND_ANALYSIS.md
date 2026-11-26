# Algorithms and Theoretical Complexity Analysis — Live Arrival Index

## 1. Fundamental Problem Formulation
Given a continuous stream of integer package IDs $\mathcal{S} = \{p_1, p_2, \dots, p_N\}$ arriving in arbitrary sequence where $p_i \in [0, 10^9]$, maintain a data structure that dynamically represents all received IDs as a minimal set of pairwise disjoint closed intervals $\mathcal{I} = \{[s_1, e_1], [s_2, e_2], \dots, [s_K, e_K]\}$ such that:
1. $s_j \le e_j$ for all $1 \le j \le K$.
2. $e_j + 1 < s_{j+1}$ for all $1 \le j < K$ (no overlap and no unmerged adjacent intervals).
3. $\bigcup_{j=1}^K [s_j, e_j] = \{p_1, \dots, p_N\}$.

---

## 2. Incremental Insertion Algorithm

```
                             New Package Arrival P
                                       |
                   +-------------------v-------------------+
                   |   Binary Search Tree Lookup in AVL    |
                   |   Find containing node: s <= P <= e   |
                   +-------------------+-------------------+
                                       |
                         Is P contained in any node?
                                      / \
                                Yes /     \ No
                                  /         \
            +--------------------v+         +-------------------v--------------------+
            |    OP_DUPLICATE     |         | Locate Predecessor pred: max end < P   |
            | State unchanged     |         | Locate Successor succ: min start > P   |
            +---------------------+         +-------------------+--------------------+
                                                                |
                                                Evaluate Boundary Proximity
                                                                |
                    +------------------------+------------------+------------------------+
                    |                        |                  |                        |
             pred.e + 1 == P          pred.e + 1 == P        P + 1 == succ.s          Neither condition
                   AND                      AND                ONLY                     applies
             P + 1 == succ.s          P + 1 < succ.s                                     |
                    |                        |                  |                        |
            +-------v-------+        +-------v-------+  +-------v-------+        +-------v-------+
            |  BRIDGE MERGE |        |  EXTEND LEFT  |  | EXTEND RIGHT  |        | NEW INTERVAL  |
            |  [pred.s,     |        |  [pred.s, P]  |  | [P, succ.e]   |        |  [P, P]       |
            |   succ.e]     |        +---------------+  +---------------+        +---------------+
            +---------------+
```

### Detailed Structural Transitions
Let $K$ denote the current number of intervals in the AVL tree:

1. **Duplicate Arrival ($s \le P \le e$)**:
   - Time: $O(\log K)$
   - Action: No tree mutation. Operation result logged.
   - Interval count: $K \to K$.
   - Unique packages: $U \to U$.

2. **Left Extension ($pred.end\_id + 1 == P \land P + 1 < succ.start\_id$)**:
   - Time: $O(\log K)$
   - Action: Predecessor interval updated to $[pred.start\_id, P]$.
   - Subtree metadata updated along ancestor path.
   - Interval count: $K \to K$.
   - Unique packages: $U \to U + 1$.

3. **Right Extension ($pred.end\_id + 1 < P \land P + 1 == succ.start\_id$)**:
   - Time: $O(\log K)$
   - Action: Successor interval updated to $[P, succ.end\_id]$.
   - Key property: BST ordering is strictly preserved since $P > pred.end\_id \ge pred.start\_id$.
   - Interval count: $K \to K$.
   - Unique packages: $U \to U + 1$.

4. **Bridge Merge ($pred.end\_id + 1 == P \land P + 1 == succ.start\_id$)**:
   - Time: $O(\log K)$
   - Action: Package $P$ connects two adjacent intervals into a single interval $[pred.start\_id, succ.end\_id]$.
   - In the AVL tree, the successor node is deleted via `avl_delete_interval_node` and predecessor node is expanded and rebalanced.
   - Interval count: $K \to K - 1$.
   - Unique packages: $U \to U + 1$.

5. **New Isolated Interval ($pred.end\_id + 1 < P \land P + 1 < succ.start\_id$)**:
   - Time: $O(\log K)$
   - Action: A new node $[P, P]$ is inserted into the AVL tree with balancing rotations.
   - Interval count: $K \to K + 1$.
   - Unique packages: $U \to U + 1$.

---

## 3. AVL Balancing and Rotations

The AVL invariant enforces that for every node $N$, $\text{height}(N) = 1 + \max(h(N.left), h(N.right))$ and $\text{bf}(N) = h(N.left) - h(N.right) \in \{-1, 0, 1\}$.

```
       Right Rotation (LL Case)                   Left Rotation (RR Case)
               y                                         x
              / \                                       / \
             x   T3       ======>                      T1  y
            / \        Right Rotate(y)                    / \
           z   T2                                        T2  z
```

```
       Left-Right Rotation (LR Case)              Right-Left Rotation (RL Case)
               z                                         z
              / \                                       / \
             x   T4       ======>                      T1  y
            / \        Rotate Left(x)                     / \
           T1  y       Rotate Right(z)                   x   T4
```

Because node insertion or deletion can at most alter path heights by 1, rebalancing requires at most $O(1)$ rotations on insertion and $O(\log K)$ rotations on deletion, maintaining strict $O(\log K)$ worst-case tree height:
$$\text{Height}(K) \le 1.44 \log_2(K + 2) - 0.328$$

---

## 4. Missing-Range (Gap) Intelligence Algorithm
To compute all missing intervals in a query range $[L, R]$:
1. Clip all received intervals intersecting $[L, R]$ using binary search traversal in $O(\log K + M)$ time, where $M$ is the number of overlapping intervals.
2. Initialize pointer `curr = L`.
3. For each received interval $[s_i, e_i]$:
   - If `curr < s_i`, the range $[curr, s_i - 1]$ is a missing gap of size $(s_i - curr)$.
   - Advance `curr = e_i + 1`.
4. If `curr <= R`, the trailing range $[curr, R]$ is a missing gap.
5. Overall Gap Computation Time: $O(\log K + M)$.

---

## 5. Formal Complexity Summary

| Operation | Time Complexity | Space Complexity |
|---|---|---|
| Single Package Arrival | $O(\log K)$ worst-case | $O(1)$ auxiliary |
| Duplicate Detection | $O(\log K)$ worst-case | $O(1)$ auxiliary |
| Bridge Merge | $O(\log K)$ worst-case | $O(1)$ auxiliary |
| Range Interval Query $[L, R]$ | $O(\log K + M)$ | $O(M)$ output |
| Range Gap Query $[L, R]$ | $O(\log K + G)$ | $O(G)$ output |
| Proximity / Nearest ID Search | $O(\log K)$ | $O(1)$ |
| Tree Validation Invariants | $O(K)$ | $O(\log K)$ call stack |
| Persistence Save / Load | $O(K)$ | $O(K)$ |
| Total System Memory | — | $\mathcal{O}(K)$ nodes |

---

## 6. Algorithmic Comparison: AVL Tree vs Sorted-Array Baseline

A common naive approach maintains a dynamically resized sorted array of intervals:
- Searching position via binary search: $O(\log K)$ time.
- Inserting or deleting an interval: **$O(K)$ memory movement** via `memmove`!
- For $N$ package insertions, sorted-array baseline exhibits **$O(N^2)$ quadratic slowdown**, deteriorating rapidly as $N \ge 10,000$.
- The AVL Interval Tree completes each insertion, extension, and bridge merge in strict **$O(\log K)$ time**, guaranteeing effortless scaling to 50,000+ packages in milliseconds.
