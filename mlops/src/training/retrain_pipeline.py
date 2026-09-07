"""
retrain_pipeline.py
-------------------
Controlled End-to-End Model Retraining Pipeline for ScamShield AI.
Coordinates:
  1. Feedback & new labeled data ingestion into a new Dataset Version
  2. Data Preprocessing & split generation
  3. Candidate Model Training
  4. Automated Model Evaluation
  5. Validation against performance thresholds & Production Champion
  6. Controlled Stage Promotion (to Production if passed, or Rejected if failed)
"""
import json
from pathlib import Path
from typing import Any, Dict, Optional

from src.common.dataset_registry import DatasetRegistry
from src.common.feedback import FeedbackManager
from src.common.logger import get_logger
from src.common.registry import ModelRegistry
from src.common.validator import ModelValidator
from src.evaluation.evaluate_message import evaluate_message_model
from src.evaluation.evaluate_scam_type import evaluate_scam_type_model
from src.evaluation.evaluate_url import evaluate_url_model
from src.preprocessing.message_pipeline import MessagePipeline
from src.preprocessing.scam_type_pipeline import ScamTypePipeline
from src.preprocessing.url_pipeline import URLPipeline
from src.common.path_utils import MLOPS_ROOT, resolve_path
from src.training.train_message import MessageTrainer
from src.training.train_scam_type import ScamTypeTrainer
from src.training.train_url import URLTrainer

logger = get_logger("RetrainPipeline")


class RetrainPipeline:
    """Manages controlled retraining lifecycle for ScamShield AI models."""

    def __init__(self, root_dir: Optional[str | Path] = None):
        self.root_dir = resolve_path(root_dir or MLOPS_ROOT)
        self.dataset_registry = DatasetRegistry(versions_dir=self.root_dir / "data" / "versions")
        self.model_registry = ModelRegistry(models_dir=str(self.root_dir / "models"))
        self.validator = ModelValidator(models_dir=str(self.root_dir / "models"))
        self.feedback_manager = FeedbackManager(feedback_dir=str(self.root_dir / "data" / "feedback"))

    def retrain_model(
        self,
        model_name: str,
        new_dataset_version: str,
        new_model_version: str,
        include_feedback: bool = True,
        auto_promote_if_valid: bool = True,
    ) -> Dict[str, Any]:
        """
        Executes controlled retraining pipeline for a specific model:
          Dataset Versioning -> Preprocessing -> Candidate Training -> Evaluation -> Champion Validation -> Promotion/Rejection
        """
        logger.info(f"=== Starting Controlled Retraining Pipeline for '{model_name}' ===")
        logger.info(f"Target Dataset Version: {new_dataset_version} | Target Model Version: {new_model_version}")

        # 1. Dataset Ingestion & Feedback Merging
        base_sample_map = {
            "message_model": self.root_dir / "data" / "sample" / "sample_messages.json",
            "scam_type_model": self.root_dir / "data" / "sample" / "sample_scam_types.json",
            "url_model": self.root_dir / "data" / "sample" / "sample_urls.json",
        }

        base_data_file = base_sample_map.get(model_name)
        if not base_data_file or not base_data_file.exists():
            raise FileNotFoundError(f"Base data file not found for {model_name}")

        with open(base_data_file, "r", encoding="utf-8-sig") as f:
            records = json.load(f)

        feedback_added = 0
        if include_feedback:
            # Ingest approved feedback samples
            exported = self.feedback_manager.export_retraining_dataset(model_name=model_name)
            exp_file = Path(exported["output_path"])
            if exp_file.exists() and exported["exported_samples"] > 0:
                with open(exp_file, "r", encoding="utf-8-sig") as f:
                    fb_samples = json.load(f)
                records.extend(fb_samples)
                feedback_added = len(fb_samples)
                logger.info(f"Merged {feedback_added} approved user feedback samples into retraining dataset.")

        # Register new dataset version snapshot
        temp_data_file = self.root_dir / "data" / "feedback" / f"temp_{model_name}_{new_dataset_version}.json"
        with open(temp_data_file, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2)

        dataset_type_map = {
            "message_model": "messages",
            "scam_type_model": "scam_types",
            "url_model": "urls",
        }
        dataset_type = dataset_type_map[model_name]

        self.dataset_registry.register_dataset(
            dataset_name=dataset_type,
            file_path=temp_data_file,
            version=new_dataset_version,
            label_column="label",
            description=f"Retraining dataset version {new_dataset_version} with {feedback_added} feedback samples",
        )

        # 2. Preprocessing
        output_prep_dir = self.root_dir / "data" / "processed" / dataset_type
        if model_name == "message_model":
            pipe = MessagePipeline()
        elif model_name == "scam_type_model":
            pipe = ScamTypePipeline()
        else:
            pipe = URLPipeline()

        prep_res = pipe.run(source=temp_data_file, output_dir=output_prep_dir)
        logger.info(f"Preprocessing completed. Processed {prep_res['processed_count']} samples into train/val/test splits.")

        # Clean temp dataset file
        if temp_data_file.exists():
            temp_data_file.unlink(missing_ok=True)

        # 3. Candidate Model Training
        trainer_config = {
            "paths": {"train_data": str(output_prep_dir / "train.json")},
            "data": {"version": new_dataset_version},
        }
        if model_name == "message_model":
            trainer = MessageTrainer(
                config=trainer_config,
                version=new_model_version,
                models_dir=str(self.root_dir / "models"),
            )
        elif model_name == "scam_type_model":
            trainer = ScamTypeTrainer(
                config=trainer_config,
                version=new_model_version,
                models_dir=str(self.root_dir / "models"),
            )
        else:
            trainer = URLTrainer(
                config=trainer_config,
                version=new_model_version,
                models_dir=str(self.root_dir / "models"),
            )
        trainer.run()

        # 4. Automated Model Evaluation
        test_file = output_prep_dir / "test.json"
        if model_name == "message_model":
            eval_res = evaluate_message_model(
                version=new_model_version,
                data_path=str(test_file),
                models_dir=self.root_dir / "models",
            )
        elif model_name == "scam_type_model":
            eval_res = evaluate_scam_type_model(
                version=new_model_version,
                data_path=str(test_file),
                models_dir=self.root_dir / "models",
            )
        else:
            eval_res = evaluate_url_model(
                version=new_model_version,
                data_path=str(test_file),
                models_dir=self.root_dir / "models",
            )

        # 5. Model Validation & Champion Comparison
        val_result = self.validator.validate_model(
            model_name=model_name,
            version=new_model_version,
            require_champion_check=True,
        )

        # 6. Controlled Stage Promotion / Rejection
        promoted = False
        rejection_reasons = val_result.get("rejection_reasons", [])

        if val_result["is_valid"] and auto_promote_if_valid:
            try:
                self.model_registry.promote_model(
                    model_name=model_name,
                    version=new_model_version,
                    stage="Production",
                    force=False,
                )
                promoted = True
                stage_status = "Production"
                logger.info(f"Candidate model '{model_name}' version '{new_model_version}' PASSED validation and PROMOTED to Production.")
            except Exception as e:
                stage_status = "Rejected"
                rejection_reasons.append(str(e))
        else:
            # Mark candidate version as Rejected in registry catalog
            try:
                self.model_registry.promote_model(
                    model_name=model_name,
                    version=new_model_version,
                    stage="Rejected",
                    force=True,
                )
            except Exception:
                pass
            stage_status = "Rejected"
            logger.warning(
                f"Candidate model '{model_name}' version '{new_model_version}' REJECTED by validator. "
                f"Active Production champion remains untouched. Reasons: {rejection_reasons}"
            )

        return {
            "model_name": model_name,
            "dataset_version": new_dataset_version,
            "model_version": new_model_version,
            "feedback_samples_added": feedback_added,
            "is_valid": val_result["is_valid"],
            "promoted_to_production": promoted,
            "final_stage_status": stage_status,
            "evaluation_metrics": eval_res.get("metrics", {}),
            "rejection_reasons": rejection_reasons,
            "validation_report": val_result,
        }
