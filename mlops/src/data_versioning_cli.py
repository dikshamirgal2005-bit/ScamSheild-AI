"""
data_versioning_cli.py
-----------------------
Command-line interface for Dataset Version Management in ScamShield AI.
Allows students and developers to register, inspect, and list versioned datasets.
"""
import argparse
import json
import sys
from pathlib import Path

# Add parent directory to sys.path to allow running as script or module
mlops_root = Path(__file__).resolve().parent.parent
if str(mlops_root) not in sys.path:
    sys.path.insert(0, str(mlops_root))

from src.common.dataset_registry import DatasetRegistry


def main():
    parser = argparse.ArgumentParser(
        description="ScamShield AI - Dataset Version Management CLI"
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all registered datasets and their versions",
    )
    parser.add_argument(
        "--info",
        action="store_true",
        help="Show detailed metadata for a dataset version",
    )
    parser.add_argument(
        "--register",
        action="store_true",
        help="Register a new dataset version snapshot",
    )
    parser.add_argument(
        "--dataset",
        type=str,
        help="Dataset name (e.g. messages, scam_types, urls)",
    )
    parser.add_argument(
        "--version",
        type=str,
        default="latest",
        help="Version tag (e.g. v1.0.0, or 'latest')",
    )
    parser.add_argument(
        "--file",
        type=str,
        help="Path to source dataset file (.json, .csv) for registration",
    )
    parser.add_argument(
        "--label",
        type=str,
        default=None,
        help="Target label column name (optional)",
    )
    parser.add_argument(
        "--desc",
        type=str,
        default="",
        help="Brief description of this dataset version",
    )
    parser.add_argument(
        "--versions-dir",
        type=str,
        default=str(mlops_root / "data" / "versions"),
        help="Path to dataset versions storage directory",
    )

    args = parser.parse_args()
    registry = DatasetRegistry(versions_dir=args.versions_dir)

    if args.list:
        datasets = registry.list_datasets(dataset_name=args.dataset)
        if not datasets:
            print("No datasets registered yet.")
            return

        print("\n=== Registered Datasets ===")
        header = f"{'Dataset':<15} {'Version':<10} {'Records':<10} {'Format':<8} {'Label Col':<12} {'Created At':<22} {'Latest?'}"
        print("-" * len(header))
        print(header)
        print("-" * len(header))

        for d in datasets:
            is_latest_str = "[YES]" if d["is_latest"] else " "
            lbl_col = d.get("labels", {}).get("label_column") or "None"
            fmt = d.get("file_format", "json")
            print(
                f"{d['dataset_name']:<15} {d['version']:<10} {d['num_records']:<10} {fmt:<8} {lbl_col:<12} {d['creation_date'][:19]:<22} {is_latest_str}"
            )
        print("-" * len(header))
        print(f"Total versions found: {len(datasets)}\n")

    elif args.info:
        if not args.dataset:
            print("Error: --dataset argument is required for --info.")
            sys.exit(1)

        try:
            meta = registry.get_metadata(args.dataset, version=args.version)
            print(f"\n=== Dataset Metadata: {args.dataset} ({meta['version']}) ===")
            print(f"Description   : {meta['description']}")
            print(f"Creation Date : {meta['creation_date']}")
            print(f"File Path     : {meta['file_path']}")
            print(f"File Size     : {meta['file_size_bytes']} bytes")
            print(f"SHA-256 Hash  : {meta['checksum_sha256']}")
            print(f"Num Records   : {meta['num_records']}")
            print(f"Features      : {', '.join(meta['features'])}")
            print(f"Label Column  : {meta['label_column']}")

            labels_data = meta.get("labels", {})
            if labels_data and labels_data.get("distribution"):
                print("Class Distribution:")
                for cls_name, count in labels_data["distribution"].items():
                    print(f"  - {cls_name}: {count}")
            print("===================================================\n")
        except Exception as e:
            print(f"Error fetching dataset metadata: {e}")
            sys.exit(1)

    elif args.register:
        if not args.dataset or not args.file or args.version == "latest":
            print("Error: --register requires --dataset, --file, and a specific --version (e.g. v1.0.0).")
            sys.exit(1)

        try:
            meta = registry.register_dataset(
                dataset_name=args.dataset,
                file_path=args.file,
                version=args.version,
                label_column=args.label,
                description=args.desc,
            )
            print(f"\nSuccessfully registered dataset '{args.dataset}' version '{args.version}'.")
            print(f"Records     : {meta['num_records']}")
            print(f"Features    : {meta['features']}")
            print(f"SHA-256     : {meta['checksum_sha256']}")
            print(f"Destination : {meta['file_path']}\n")
        except Exception as e:
            print(f"Error registering dataset: {e}")
            sys.exit(1)

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
