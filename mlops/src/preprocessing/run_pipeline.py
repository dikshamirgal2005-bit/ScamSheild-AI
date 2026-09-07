"""
run_pipeline.py
---------------
CLI execution script for ScamShield AI data preprocessing pipelines.
Cleans raw datasets, extracts features, generates train/val/test splits,
and saves processed artifacts alongside preprocessor_config.json.
"""
import argparse
import sys
from pathlib import Path

# Add mlops root to sys.path
mlops_root = Path(__file__).resolve().parent.parent.parent
if str(mlops_root) not in sys.path:
    sys.path.insert(0, str(mlops_root))

from src.preprocessing.message_pipeline import MessagePipeline
from src.preprocessing.scam_type_pipeline import ScamTypePipeline
from src.preprocessing.url_pipeline import URLPipeline


PIPELINE_MAP = {
    "messages": (
        MessagePipeline,
        mlops_root / "data" / "sample" / "sample_messages.json",
        mlops_root / "data" / "processed" / "messages",
    ),
    "scam_types": (
        ScamTypePipeline,
        mlops_root / "data" / "sample" / "sample_scam_types.json",
        mlops_root / "data" / "processed" / "scam_types",
    ),
    "urls": (
        URLPipeline,
        mlops_root / "data" / "sample" / "sample_urls.json",
        mlops_root / "data" / "processed" / "urls",
    ),
}


def run_single_pipeline(
    pipeline_name: str,
    input_path: Path,
    output_dir: Path,
    train_ratio: float = 0.8,
    val_ratio: float = 0.1,
    test_ratio: float = 0.1,
    seed: int = 42,
) -> None:
    """Executes a single preprocessing pipeline and logs summary."""
    if pipeline_name not in PIPELINE_MAP:
        print(f"Error: Unknown pipeline '{pipeline_name}'. Choose from: {list(PIPELINE_MAP.keys())}")
        sys.exit(1)

    pipeline_cls = PIPELINE_MAP[pipeline_name][0]
    pipeline = pipeline_cls()

    print(f"\n==========================================")
    print(f"Running Preprocessing: {pipeline_name.upper()}")
    print(f"Source file : {input_path}")
    print(f"Output dir  : {output_dir}")
    print(f"==========================================")

    res = pipeline.run(
        source=input_path,
        output_dir=output_dir,
        train_ratio=train_ratio,
        val_ratio=val_ratio,
        test_ratio=test_ratio,
        seed=seed,
    )

    print(f"Raw records ingested : {res['raw_count']}")
    print(f"Cleaned records      : {res['cleaned_count']}")
    print(f"Features extracted   : {res['processed_count']}")
    print(f"Split distributions  :")
    for split_name, count in res["splits"].items():
        print(f"  - {split_name:<6}: {count} records")
    print(f"Artifacts saved      :")
    for artifact_name, path_str in res["saved_paths"].items():
        print(f"  - {artifact_name:<7}: {path_str}")
    print("Done.")


def main():
    parser = argparse.ArgumentParser(
        description="ScamShield AI - Data Preprocessing & Feature Extraction Runner"
    )
    parser.add_argument(
        "--pipeline",
        type=str,
        choices=["messages", "scam_types", "urls"],
        help="Preprocessing pipeline name",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Run all three preprocessing pipelines sequentially",
    )
    parser.add_argument(
        "--input",
        type=str,
        default=None,
        help="Path to raw dataset file (.json, .csv). Defaults to sample data.",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Destination directory for processed splits and config.",
    )
    parser.add_argument(
        "--train-ratio",
        type=float,
        default=0.8,
        help="Fraction of data allocated for training (default: 0.8)",
    )
    parser.add_argument(
        "--val-ratio",
        type=float,
        default=0.1,
        help="Fraction of data allocated for validation (default: 0.1)",
    )
    parser.add_argument(
        "--test-ratio",
        type=float,
        default=0.1,
        help="Fraction of data allocated for testing (default: 0.1)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for deterministic splitting (default: 42)",
    )

    args = parser.parse_args()

    if args.all:
        for p_name, (_, def_in, def_out) in PIPELINE_MAP.items():
            run_single_pipeline(
                pipeline_name=p_name,
                input_path=def_in,
                output_dir=def_out,
                train_ratio=args.train_ratio,
                val_ratio=args.val_ratio,
                test_ratio=args.test_ratio,
                seed=args.seed,
            )
        print("\nAll preprocessing pipelines completed successfully.\n")
    elif args.pipeline:
        _, def_in, def_out = PIPELINE_MAP[args.pipeline]
        in_path = Path(args.input) if args.input else def_in
        out_dir = Path(args.output_dir) if args.output_dir else def_out
        run_single_pipeline(
            pipeline_name=args.pipeline,
            input_path=in_path,
            output_dir=out_dir,
            train_ratio=args.train_ratio,
            val_ratio=args.val_ratio,
            test_ratio=args.test_ratio,
            seed=args.seed,
        )
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
