"""
Demonstration of Live Arrival Index:
- Step-by-step additions including bridge merge.
- Detailed before-and-after state explanation.
- Stress demonstration with sparse/large numbers up to 10^9.
"""

from live_arrival_index import LiveArrivalIndex

def main():
    print("=" * 65)
    print("DEMONSTRATION 1: Illustrative Sequence [1, 3, 7, 2, 6]")
    print("=" * 65)
    index = LiveArrivalIndex()
    arrivals = [1, 3, 7, 2, 6]
    for pkg in arrivals:
        added = index.add(pkg)
        print(f"Arrival: {pkg:2d} | Added: {added!s:<5} | Intervals: {index.get_intervals()}")

    print("\nRange and Gap Report for query [1, 7]:")
    print(f"Received in [1, 7]: {index.get_intervals_in_range(1, 7)}")
    print(f"Missing in  [1, 7]: {index.get_missing_ranges(1, 7)}")

    print("\n" + "=" * 65)
    print("DEMONSTRATION 2: Bridge Merge (Connecting Two Intervals)")
    print("=" * 65)
    demo_bridge = LiveArrivalIndex()
    for x in [100, 101, 102, 104, 105, 106]:
        demo_bridge.add(x)

    print("State BEFORE connecting ID arrives:")
    print(f"Known intervals: {demo_bridge.get_intervals()}")
    print("Missing ID 103 separates [100, 102] and [104, 106].")
    
    print("\n--> Package 103 arrives (Bridge Merge) <--")
    demo_bridge.add(103)
    print("State AFTER connecting ID arrives:")
    print(f"Known intervals: {demo_bridge.get_intervals()}")

    print("\n" + "=" * 65)
    print("DEMONSTRATION 3: Widely Spaced Large IDs (Sparse Representation)")
    print("=" * 65)
    sparse_index = LiveArrivalIndex()
    large_arrivals = [42, 500_000_000, 1_000_000_000, 500_000_001]
    for x in large_arrivals:
        sparse_index.add(x)
    print(f"Intervals with IDs up to 10^9: {sparse_index.get_intervals()}")
    print(f"Gaps in subrange [500_000_000, 500_000_005]: {sparse_index.get_missing_ranges(500_000_000, 500_000_005)}")
    print("Memory used is proportional only to number of intervals, NOT 10^9!")

if __name__ == "__main__":
    main()
