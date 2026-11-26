"""
Interactive Warehouse Package Tracking Console
Allows you to type numbers and see the intervals update live.
"""

from live_arrival_index import LiveArrivalIndex

def main():
    tracker = LiveArrivalIndex()
    print("=" * 60)
    print("   WAREHOUSE LIVE ARRIVAL TRACKER - INTERACTIVE CONSOLE")
    print("=" * 60)
    print("Commands:")
    print("  <number>          : Add a single package ID (e.g. 5)")
    print("  <num1, num2, ...> : Add multiple package IDs (e.g. 1, 3, 7, 2, 6)")
    print("  gaps <min> <max>  : Find missing IDs between min and max (e.g. gaps 1 10)")
    print("  show              : Display all current received intervals")
    print("  quit or exit      : Exit the program")
    print("=" * 60)

    while True:
        try:
            user_input = input("\nEnter package ID or command > ").strip()
            if not user_input:
                continue

            lowered = user_input.lower()
            if lowered in ("quit", "exit", "q"):
                print("Exiting tracker. Goodbye!")
                break

            if lowered == "show":
                intervals = tracker.get_intervals()
                print(f"Current Received Ranges: {intervals if intervals else 'None'}")
                continue

            if lowered.startswith("gaps"):
                parts = user_input.split()
                if len(parts) == 3 and parts[1].isdigit() and parts[2].isdigit():
                    q_min, q_max = int(parts[1]), int(parts[2])
                    missing = tracker.get_missing_ranges(q_min, q_max)
                    print(f"Missing packages in range [{q_min}, {q_max}]: {missing if missing else 'None (All received!)'}")
                else:
                    print("Usage: gaps <min> <max>  (e.g., gaps 1 10)")
                continue

            # Process comma or space-separated numbers
            clean_input = user_input.replace(",", " ")
            tokens = clean_input.split()

            all_numbers = True
            for token in tokens:
                if not token.isdigit():
                    all_numbers = False
                    break

            if not all_numbers:
                print("Unrecognized command. Type a number, 'gaps <min> <max>', 'show', or 'quit'.")
                continue

            for token in tokens:
                pkg_id = int(token)
                added = tracker.add(pkg_id)
                status = "ADDED" if added else "DUPLICATE (ignored)"
                print(f"  Package {pkg_id:4d} -> {status}")

            print(f"--> Current Ranges: {tracker.get_intervals()}")

        except (KeyboardInterrupt, EOFError):
            print("\nExiting. Goodbye!")
            break

if __name__ == "__main__":
    main()
