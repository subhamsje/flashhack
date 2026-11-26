import unittest
from live_arrival_index import LiveArrivalIndex

class TestLiveArrivalIndex(unittest.TestCase):
    def test_illustrative_example(self):
        index = LiveArrivalIndex()
        arrivals = [1, 3, 7, 2, 6]
        for x in arrivals:
            index.add(x)
        
        self.assertEqual(index.get_intervals(), [(1, 3), (6, 7)])
        self.assertEqual(index.get_missing_ranges(1, 7), [(4, 5)])

    def test_bridge_merges(self):
        index = LiveArrivalIndex()
        # Create separate intervals [10, 12] and [14, 16]
        for x in [10, 11, 12, 14, 15, 16]:
            index.add(x)
        self.assertEqual(index.get_intervals(), [(10, 12), (14, 16)])

        # Insert connecting bridge 13
        added = index.add(13)
        self.assertTrue(added)
        self.assertEqual(index.get_intervals(), [(10, 16)])

    def test_duplicate_arrivals(self):
        index = LiveArrivalIndex()
        self.assertTrue(index.add(5))
        self.assertFalse(index.add(5))  # duplicate
        self.assertEqual(index.get_intervals(), [(5, 5)])

        self.assertTrue(index.add(6))
        self.assertFalse(index.add(5))  # duplicate inside range
        self.assertFalse(index.add(6))  # duplicate inside range
        self.assertEqual(index.get_intervals(), [(5, 6)])

    def test_sparse_and_large_ids(self):
        index = LiveArrivalIndex()
        large_ids = [0, 500_000_000, 1_000_000_000]
        for x in large_ids:
            index.add(x)

        self.assertEqual(index.get_intervals(), [(0, 0), (500_000_000, 500_000_000), (1_000_000_000, 1_000_000_000)])
        
        # Query gaps in subranges without allocating large memory
        gaps = index.get_missing_ranges(0, 5)
        self.assertEqual(gaps, [(1, 5)])

        gaps_large = index.get_missing_ranges(499_999_999, 500_000_002)
        self.assertEqual(gaps_large, [(499_999_999, 499_999_999), (500_000_001, 500_000_002)])

    def test_bounded_range_queries(self):
        index = LiveArrivalIndex()
        for x in [2, 3, 4, 8, 9, 10, 20]:
            index.add(x)
        # Intervals are [(2, 4), (8, 10), (20, 20)]

        # Query partially overlapping [3, 9]
        received = index.get_intervals_in_range(3, 9)
        self.assertEqual(received, [(3, 4), (8, 9)])

        # Query missing ranges in [0, 25]
        missing = index.get_missing_ranges(0, 25)
        self.assertEqual(missing, [(0, 1), (5, 7), (11, 19), (21, 25)])

    def test_extension_left_and_right(self):
        index = LiveArrivalIndex()
        index.add(10)
        self.assertEqual(index.get_intervals(), [(10, 10)])
        
        # Extend right
        index.add(11)
        self.assertEqual(index.get_intervals(), [(10, 11)])

        # Extend left
        index.add(9)
        self.assertEqual(index.get_intervals(), [(9, 11)])

if __name__ == "__main__":
    unittest.main()
