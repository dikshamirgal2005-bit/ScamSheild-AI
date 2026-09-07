"""
run_ci_cd.py
------------
Lightweight Local & Automated CI/CD Pipeline Runner for ScamShield AI MLOps.

Stages Executed:
  1. Code Syntax & Config Linting
  2. Data Preprocessing Pipeline Validation
  3. Automated Unit & Integration Test Suite
  4. Model Validation & Performance Gatekeeping
  5. FastAPI Backend Microservice Smoke & Health Test

No model retraining is performed on code changes.
"""
import argparse
import os
import py_compile
import sys
import time
import unittest
from pathlib import Path

# Add mlops root to sys.path
mlops_root = Path(__file__).resolve().parent
if str(mlops_root) not in sys.path:
    sys.path.insert(0, str(mlops_root))

from src.common.logger import get_logger
from src.common.registry import ModelRegistry
from src.common.validator import ModelValidator
from src.preprocessing.message_pipeline import MessagePipeline
from src.preprocessing.scam_type_pipeline import ScamTypePipeline
from src.preprocessing.url_pipeline import URLPipeline

logger = get_logger("CICDPipeline")


def print_banner(text: str) -> None:
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)


def run_stage_1_syntax_and_config() -> bool:
    print_banner("STAGE 1: Code Syntax & Configuration Verification")
    passed = True

    # 1. Python Syntax Compile Check
    py_files = list(mlops_root.rglob("*.py"))
    print(f"--> Checking Python syntax across {len(py_files)} files...")
    compiled_count = 0
    for p in py_files:
        if ".venv" in p.parts or "venv" in p.parts or "__pycache__" in p.parts:
            continue
        try:
            py_compile.compile(str(p), doraise=True)
            compiled_count += 1
        except Exception as e:
            print(f"  [ERROR] Syntax error in {p.relative_to(mlops_root)}: {e}")
            passed = False

    print(f"    Passed syntax check for {compiled_count} Python source files.")

    # 2. Configuration Files Verification
    config_dir = mlops_root / "configs"
    required_configs = [
        "base_config.yaml",
        "message_model.yaml",
        "scam_type_model.yaml",
        "url_model.yaml",
        "model_validation.yaml",
        "serving_config.yaml",
    ]
    print(f"--> Verifying required YAML configuration files in {config_dir.name}/...")
    for cfg in required_configs:
        cfg_path = config_dir / cfg
        if cfg_path.exists():
            print(f"    [OK] {cfg} present ({cfg_path.stat().st_size} bytes)")
        else:
            print(f"    [FAIL] Missing required config file: {cfg}")
            passed = False

    return passed


def run_stage_2_preprocessing_validation() -> bool:
    print_banner("STAGE 2: Preprocessing Pipeline Validation")
    passed = True

    sample_dir = mlops_root / "data" / "sample"
    temp_output_dir = mlops_root / "data" / "processed" / "_ci_test"

    try:
        print("--> Validating Message Preprocessing Pipeline...")
        msg_pipe = MessagePipeline()
        msg_res = msg_pipe.run(
            source=sample_dir / "sample_messages.json",
            output_dir=temp_output_dir / "messages",
        )
        print(f"    [OK] Message pipeline processed {msg_res['processed_count']} samples (Splits: {msg_res['splits']}).")

        print("--> Validating Scam Type Preprocessing Pipeline...")
        scam_pipe = ScamTypePipeline()
        scam_res = scam_pipe.run(
            source=sample_dir / "sample_scam_types.json",
            output_dir=temp_output_dir / "scam_types",
        )
        print(f"    [OK] Scam type pipeline processed {scam_res['processed_count']} samples (Splits: {scam_res['splits']}).")

        print("--> Validating URL Feature Engineering Pipeline...")
        url_pipe = URLPipeline()
        url_res = url_pipe.run(
            source=sample_dir / "sample_urls.json",
            output_dir=temp_output_dir / "urls",
        )
        print(f"    [OK] URL pipeline processed {url_res['processed_count']} samples (Splits: {url_res['splits']}).")

    except Exception as e:
        print(f"  [ERROR] Preprocessing pipeline validation failed: {e}")
        passed = False
    finally:
        # Clean up temporary CI test artifacts
        if temp_output_dir.exists():
            import shutil
            shutil.rmtree(temp_output_dir, ignore_errors=True)

    return passed


def run_stage_3_unit_tests() -> bool:
    print_banner("STAGE 3: Automated Unit & Integration Test Suite")
    test_dir = mlops_root / "tests"
    print(f"--> Running discover on test directory: {test_dir}")

    loader = unittest.TestLoader()
    suite = loader.discover(start_dir=str(test_dir), pattern="test_*.py")

    runner = unittest.TextTestRunner(verbosity=1)
    result = runner.run(suite)

    passed = result.wasSuccessful()
    print(f"--> Test Summary: Ran {result.testsRun} tests | Failures: {len(result.failures)} | Errors: {len(result.errors)}")
    return passed


def run_stage_4_model_validation() -> bool:
    print_banner("STAGE 4: Model Performance & Registry Validation")
    passed = True

    registry = ModelRegistry(models_dir=str(mlops_root / "models"))
    validator = ModelValidator(models_dir=str(mlops_root / "models"))

    active_models = registry.get_backend_active_models()
    print(f"--> Inspecting active production models ({len(active_models)} registered models found)...")

    if not active_models:
        print("    [WARNING] No active production models set in catalog.json. Validating latest versions instead.")

    models_to_check = ["message_model", "scam_type_model", "url_model"]
    for m_name in models_to_check:
        try:
            _, meta = registry.get_model(m_name, version="production")
            version = meta["version"]
        except Exception:
            try:
                _, meta = registry.get_model(m_name, version="latest")
                version = meta["version"]
            except Exception:
                print(f"    [FAIL] No registered version found for '{m_name}'")
                passed = False
                continue

        print(f"--> Validating {m_name} (Version: {version}, Stage: {meta.get('status')})...")
        val_res = validator.validate_model(m_name, version)
        if val_res["is_valid"]:
            print(f"    [OK] {m_name} ({version}) PASSED performance validation thresholds.")
        else:
            reasons = "; ".join(val_res["rejection_reasons"])
            print(f"    [FAIL] {m_name} ({version}) REJECTED by validator: {reasons}")
            passed = False

    return passed


def run_stage_5_backend_smoke_test() -> bool:
    print_banner("STAGE 5: FastAPI Backend Microservice Smoke Test")
    passed = True

    try:
        from fastapi.testclient import TestClient
        from serving.app import create_app

        print("--> Initializing FastAPI serving application instance...")
        app = create_app()
        client = TestClient(app)

        print("--> Testing GET /healthz endpoint...")
        r_health = client.get("/healthz")
        if r_health.status_code == 200 and r_health.json().get("status") == "healthy":
            print(f"    [OK] /healthz returned HTTP 200 (Active models: {list(r_health.json().get('active_models', {}).keys())})")
        else:
            print(f"    [FAIL] /healthz returned HTTP {r_health.status_code}: {r_health.text}")
            passed = False

        print("--> Testing POST /api/v1/scan/message endpoint...")
        r_msg = client.post("/api/v1/scan/message", json={"text": "Urgent: Update your bank KYC immediately!"})
        if r_msg.status_code == 200 and "riskScore" in r_msg.json():
            print(f"    [OK] /api/v1/scan/message returned riskScore {r_msg.json()['riskScore']} (Version: {r_msg.json().get('modelVersion')})")
        else:
            print(f"    [FAIL] /api/v1/scan/message failed: {r_msg.text}")
            passed = False

        print("--> Testing POST /api/v1/reload hot-reload API endpoint...")
        r_reload = client.post("/api/v1/reload")
        if r_reload.status_code == 200 and r_reload.json().get("status") == "success":
            print(f"    [OK] Zero-downtime model hot-reload successful: {r_reload.json().get('reloaded_models')}")
        else:
            print(f"    [FAIL] Hot reload endpoint failed: {r_reload.text}")
            passed = False

    except Exception as e:
        print(f"  [ERROR] Backend smoke test failed: {e}")
        passed = False

    return passed


def main():
    parser = argparse.ArgumentParser(description="ScamShield AI - Local CI/CD Pipeline Runner")
    parser.add_argument("--stage", type=int, choices=[1, 2, 3, 4, 5], help="Run a specific pipeline stage only")
    args = parser.parse_args()

    start_time = time.time()
    print_banner("ScamShield AI MLOps & Backend CI/CD Pipeline")
    print(f"Execution Date: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")
    print("Pipeline Mode : Validation & Testing (No automatic model retraining)")

    stages = [
        (1, "Syntax & Config Linting", run_stage_1_syntax_and_config),
        (2, "Preprocessing Pipeline Validation", run_stage_2_preprocessing_validation),
        (3, "Unit & Integration Test Suite", run_stage_3_unit_tests),
        (4, "Model Validation & Registry Inspection", run_stage_4_model_validation),
        (5, "FastAPI Backend Smoke & Health Test", run_stage_5_backend_smoke_test),
    ]

    results = {}
    overall_success = True

    for stage_num, stage_name, stage_func in stages:
        if args.stage and args.stage != stage_num:
            continue

        st_time = time.time()
        success = stage_func()
        elapsed = time.time() - st_time
        results[stage_name] = (success, elapsed)
        if not success:
            overall_success = False
            print(f"\n[FAIL] Pipeline stopped due to failure in Stage {stage_num}: {stage_name}")
            break

    total_duration = time.time() - start_time
    print_banner("CI/CD PIPELINE EXECUTION SUMMARY")
    for s_name, (ok, dur) in results.items():
        status_str = "[PASSED]" if ok else "[FAILED]"
        print(f"  {status_str:<10} | {s_name:<42} | ({dur:.2f}s)")
    print("-" * 70)
    print(f"Total Pipeline Duration: {total_duration:.2f}s")
    print(f"Final Pipeline Verdict : {'PASSED (Ready for Deployment)' if overall_success else 'FAILED'}\n")

    sys.exit(0 if overall_success else 1)


if __name__ == "__main__":
    main()
