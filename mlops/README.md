# ScamShield AI — MLOps Machine Learning Architecture

Production-grade, modular MLOps architecture for **ScamShield AI**.
Houses the data preprocessing, model training scaffolding, evaluation metrics, artifact registries, and FastAPI backend inference microservice for ScamShield AI security models.

---

## 🏛️ Architecture Overview

The pipeline manages three independent ML tasks:
1. **💬 Message Phishing Classifier (Binary):** Detects if an incoming text/SMS is `Scam/Phishing` vs `Legitimate`.
2. **🎯 Scam-Type Classifier (Multi-Class 9 Categories):** Categorizes threats into `phishing`, `vishing`, `smishing`, `lottery_advance_fee`, `investment_crypto`, `impersonation`, `romance_pig_butchering`, `tech_support`, or `job_recruitment`.
3. **🔗 URL Risk & Malicious Domain Classifier:** Extracts lexical, structural, and Shannon entropy metrics to grade link safety (`safe`, `suspicious`, `malicious`).

---

## 📁 Directory Structure

```
mlops/
├── configs/                     # Centralized YAML configurations
│   ├── base_config.yaml         # Global environment & seed settings
│   ├── message_model.yaml       # Hyperparameters & paths for Message Classifier
│   ├── scam_type_model.yaml     # Hyperparameters for 9-class Scam Category Model
│   ├── url_model.yaml           # Features & config for URL Threat Model
│   └── serving_config.yaml      # FastAPI serving configuration
│
├── data/                        # Dataset storage
│   ├── raw/                     # Raw datasets (messages, scam_types, urls)
│   ├── processed/               # Cleaned & tokenized splits
│   └── sample/                  # Ground-truth sample datasets for testing
│
├── models/                      # Versioned Model Artifacts & Registry
│   ├── message_model/           # Model weights, metadata.json
│   ├── scam_type_model/         # Model weights, label_encoder.json
│   └── url_model/               # Scaler, feature_names.json
│
├── src/                         # Core Python Packages
│   ├── common/                  # Shared utilities (logger, config loader, metrics, registry)
│   ├── preprocessing/           # Data cleaning & feature extractors
│   ├── training/                # Independent training pipelines (BaseTrainer ABC)
│   ├── evaluation/              # Model evaluation & benchmarking suites
│   └── inference/               # Mobile-compatible predictor engines
│
├── serving/                     # FastAPI Backend Inference Service
│   ├── app.py                   # FastAPI application instance & CORS middleware
│   ├── schemas.py               # Pydantic request & response schemas
│   └── routes/                  # API endpoints (/healthz, /message, /scam-type, /url)
│
├── tests/                       # Automated Test Suite
│   ├── test_config.py           # Configuration integrity tests
│   ├── test_preprocessing.py    # Feature extraction & text cleaner tests
│   └── test_inference.py        # Predictor tests
│
├── requirements.txt             # Python dependencies
├── .gitignore                   # Ignores large weights, venvs, cache
└── README.md                    # Project documentation
```

---

## 📦 Dataset Version Management

ScamShield AI includes a lightweight, transparent dataset versioning system for tracking data evolution, sample counts, feature schemas, label distributions, and SHA-256 hashes.

### CLI Usage:

1. **List all registered dataset versions:**
   ```bash
   python -m src.data_versioning_cli --list
   ```

2. **Inspect detailed dataset metadata:**
   ```bash
   python -m src.data_versioning_cli --info --dataset messages --version v1.0.0
   ```

3. **Register a new dataset snapshot:**
   ```bash
   python -m src.data_versioning_cli --register --dataset messages --file data/raw/messages_2026.json --version v1.1.0 --label label --desc "Augmented SMS phishing samples"
   ```

---

## ⚙️ Reusable Data Preprocessing Pipelines

ScamShield AI features automated data cleaning, feature extraction, and dataset partitioning pipelines for Message, Scam-Type, and URL models. Preprocessing configurations (`preprocessor_config.json`) are automatically serialized to ensure identical transformations during inference.

### CLI Usage:

1. **Run preprocessing across all pipelines:**
   ```bash
   python -m src.preprocessing.run_pipeline --all
   ```

2. **Run a specific pipeline with custom dataset:**
   ```bash
   python -m src.preprocessing.run_pipeline --pipeline messages --input data/sample/sample_messages.json --output-dir data/processed/messages
   ```

---

## 🎯 Model Training Pipelines

ScamShield AI supports independent or batch training of the Message Scam, Scam-Type, and URL Risk classifiers. Each training run freezes hyperparameters in `training_config.json`, generates versioned model artifacts under `mlops/models/<name>/<version>/`, and catalogs metrics in `ModelRegistry`.

### CLI Usage:

1. **Train all models sequentially:**
   ```bash
   python -m src.training.train_all --all --version v1.0.0
   ```

2. **Train a specific model independently:**
   ```bash
   python -m src.training.train_all --model message --version v1.0.0
   python -m src.training.train_all --model scam_type --version v1.0.0
   python -m src.training.train_all --model url --version v1.0.0
   ```

3. **List all registered models:**
   ```bash
   python -m src.training.train_all --list
   ```

---

## 📊 Automated Model Evaluation

ScamShield AI systematically evaluates trained models against test datasets, computing Accuracy, Precision, Recall, F1-Score, ROC-AUC, and Confusion Matrices, and saving `evaluation_results.json` directly in each model version directory.

### CLI Usage:

1. **Evaluate all model versions sequentially:**
   ```bash
   python -m src.evaluation.evaluate_all --all --version v1.0.0
   ```

2. **Evaluate a specific model version independently:**
   ```bash
   python -m src.evaluation.evaluate_all --model message --version v1.0.0
   python -m src.evaluation.evaluate_all --model scam_type --version v1.0.0
   python -m src.evaluation.evaluate_all --model url --version v1.0.0
   ```

3. **Display model evaluation scorecards:**
   ```bash
   python -m src.evaluation.evaluate_all --list
   ```

---

## 🏛️ Model Registry & Active Production Tracking

ScamShield AI includes a Model Registry for cataloging trained models using version numbers, model names, training dates, dataset versions, evaluation metrics, and stage status (`Development`, `Testing`, `Production`, `Archived`). It provides stage promotion and identifies active production models served by the backend.

### CLI Usage:

1. **List all registered models and stage statuses:**
   ```bash
   python -m src.model_registry_cli --list
   ```

2. **Identify active models served by the backend microservice:**
   ```bash
   python -m src.model_registry_cli --active
   ```

3. **Promote a model version to Production stage:**
   ```bash
   python -m src.model_registry_cli --promote --model message_model --version v1.0.0 --stage Production
   python -m src.model_registry_cli --promote --model scam_type_model --version v1.0.0 --stage Production
   python -m src.model_registry_cli --promote --model url_model --version v1.0.0 --stage Production
   ```

4. **View detailed metadata for a model version:**
   ```bash
   python -m src.model_registry_cli --info --model message_model --version v1.0.0
   ```

---

## 🚀 Quickstart

### 1. Run Automated Unit Tests
```bash
python -m unittest discover tests -v
```

### 2. Launch FastAPI Inference Server
```bash
uvicorn serving.app:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger Documentation: `http://localhost:8000/docs`

