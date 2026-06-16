# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast ML DB-Version
# * This program is protected by a Proprietary Non-Commercial License.
# ******************************************************************************

"""
Training Worker and Subprocess Runner for out-of-process model training.
Exempt from PyArmor obfuscation to prevent subprocess import/lock issues.

@zara
"""

import sys
import os
import json
import logging
import asyncio

_LOGGER = logging.getLogger(__name__)

# If running as script, save real stdout and redirect sys.stdout to sys.stderr
# to prevent print statements or third-party logs from corrupting the JSON payload.
if __name__ == "__main__":
    # Limit NumPy/OpenBLAS to a single thread to prevent CPU core saturation
    os.environ["OMP_NUM_THREADS"] = "1"
    os.environ["MKL_NUM_THREADS"] = "1"
    os.environ["OPENBLAS_NUM_THREADS"] = "1"
    os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
    os.environ["NUMEXPR_NUM_THREADS"] = "1"

    _REAL_STDOUT = sys.stdout
    sys.stdout = sys.stderr


async def async_run_training_in_subprocess(
    model_type: str,
    model_config: dict,
    current_weights: dict,
    X_data: list,
    y_targets: list,
    training_params: dict
) -> dict:
    """Run model training in a separate python subprocess. @zara"""
    try:
        # Get path to this script file
        core_dir = os.path.dirname(os.path.abspath(__file__))
        worker_path = os.path.join(core_dir, "core_train_worker.py")

        payload = {
            "model_type": model_type,
            "model_config": model_config,
            "current_weights": current_weights,
            "X_data": X_data,
            "y_targets": y_targets,
            "training_params": training_params
        }

        input_str = json.dumps(payload)

        # Start python process pointing to this script
        process = await asyncio.create_subprocess_exec(
            sys.executable,
            worker_path,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        try:
            # Enforce a 30-minute timeout on training execution
            stdout, stderr = await asyncio.wait_for(
                process.communicate(input=input_str.encode('utf-8')),
                timeout=1800.0
            )
        except asyncio.TimeoutError:
            _LOGGER.warning("Training worker subprocess timed out after 1800 seconds.")
            try:
                process.kill()
                await process.wait()
            except Exception:
                pass
            return {"success": False, "error_message": "Training worker timed out after 1800 seconds"}
        except asyncio.CancelledError:
            _LOGGER.info("Training worker subprocess cancelled, terminating process.")
            try:
                process.kill()
                await process.wait()
            except Exception:
                pass
            raise

        if process.returncode != 0:
            error_msg = stderr.decode('utf-8', errors='ignore').strip()
            _LOGGER.warning("Training worker process returned non-zero code %d: %s", process.returncode, error_msg)
            return {"success": False, "error_message": f"Exit code {process.returncode}: {error_msg}"}

        try:
            result = json.loads(stdout.decode('utf-8'))
            worker_stderr = stderr.decode('utf-8', errors='ignore').strip()
            if worker_stderr:
                _LOGGER.debug("Training worker stderr output:\n%s", worker_stderr)
            return result
        except json.JSONDecodeError as e:
            stdout_str = stdout.decode('utf-8', errors='ignore').strip()
            _LOGGER.warning("Failed to parse training worker stdout JSON: %s\nRaw output: %s", e, stdout_str)
            return {"success": False, "error_message": f"Invalid JSON stdout: {stdout_str}"}

    except Exception as e:
        _LOGGER.warning("Subprocess training invocation failed: %s", e)
        return {"success": False, "error_message": str(e)}


def main():
    """Subprocess main entrypoint. @zara"""
    import traceback

    # Locate config folder dynamically and insert into sys.path
    core_dir = os.path.dirname(os.path.abspath(__file__))
    integration_dir = os.path.dirname(core_dir)
    custom_components_dir = os.path.dirname(integration_dir)
    config_dir = os.path.dirname(custom_components_dir)

    if config_dir not in sys.path:
        sys.path.insert(0, config_dir)

    try:
        # Load parameters from stdin
        input_data = json.load(sys.stdin)
        model_type = input_data["model_type"]
        model_config = input_data["model_config"]
        current_weights = input_data.get("current_weights")
        X_data = input_data["X_data"]
        y_targets = input_data["y_targets"]
        training_params = input_data.get("training_params", {})

        result = {"success": False, "error_message": None}

        if model_type == "weather_mlp":
            from custom_components.solar_forecast_ml.ai.ai_weather_mlp import TinyWeatherMLP
            mlp = TinyWeatherMLP(
                input_size=model_config.get("input_size", 8),
                hidden1=model_config.get("hidden1", 16),
                hidden2=model_config.get("hidden2", 8),
                learning_rate=model_config.get("learning_rate", 0.001)
            )
            if current_weights:
                mlp.set_weights(current_weights)

            train_res = asyncio.run(mlp._train_in_process(
                X_data=X_data,
                y_targets=y_targets,
                epochs=training_params.get("epochs", 50),
                validation_split=training_params.get("validation_split", 0.2),
                early_stopping_patience=training_params.get("early_stopping_patience", 10)
            ))

            if train_res.get("success"):
                result["success"] = True
                result["weights"] = mlp.get_weights()
                result["accuracy"] = train_res.get("accuracy", 0.0)
                result["rmse"] = train_res.get("rmse", 0.0)
                result["epochs_trained"] = train_res.get("epochs_trained", 0)
                result["training_samples"] = train_res.get("training_samples", 0)
            else:
                result["error_message"] = "Training failed inside TinyWeatherMLP"

        elif model_type == "lstm":
            from custom_components.solar_forecast_ml.ai.ai_tiny_lstm import TinyLSTM
            hidden_sizes = model_config.get("hidden_sizes", (48, 24))
            if isinstance(hidden_sizes, list):
                hidden_sizes = tuple(hidden_sizes)

            lstm = TinyLSTM(
                input_size=model_config.get("input_size", 28),
                hidden_sizes=hidden_sizes,
                sequence_length=model_config.get("sequence_length", 24),
                num_outputs=model_config.get("num_outputs", 1),
                learning_rate=model_config.get("learning_rate", 0.005),
                dropout=model_config.get("dropout", 0.2),
                num_heads=model_config.get("num_heads", 4)
            )
            if current_weights:
                lstm.set_weights(current_weights)

            train_res = asyncio.run(lstm._train_in_process(
                X_sequences=X_data,
                y_targets=y_targets,
                epochs=training_params.get("epochs", 200),
                batch_size=training_params.get("batch_size", 16),
                validation_split=training_params.get("validation_split", 0.2),
                early_stopping_patience=training_params.get("early_stopping_patience", 20)
            ))

            if train_res.get("success"):
                result["success"] = True
                result["weights"] = lstm.get_weights()
                result["accuracy"] = train_res.get("accuracy", 0.0)
                result["rmse"] = train_res.get("rmse", 0.0)
                result["epochs_trained"] = train_res.get("epochs_trained", 0)
                result["training_samples"] = train_res.get("training_samples", 0)
                result["has_attention"] = train_res.get("has_attention", False)
            else:
                result["error_message"] = train_res.get("error_message", "Training failed inside TinyLSTM")

        elif model_type == "ridge":
            from custom_components.solar_forecast_ml.ai.ai_tiny_ridge import TinyRidge
            ridge = TinyRidge(
                input_size=model_config.get("input_size", 28),
                hidden_size=model_config.get("hidden_size", 32),
                sequence_length=model_config.get("sequence_length", 24),
                num_outputs=model_config.get("num_outputs", 1),
                learning_rate=model_config.get("learning_rate", 0.005),
                dropout=model_config.get("dropout", 0.2),
                use_attention=model_config.get("use_attention", False)
            )
            if current_weights:
                ridge.set_weights(current_weights)

            train_res = asyncio.run(ridge._train_in_process(
                X_sequences=X_data,
                y_targets=y_targets,
                epochs=training_params.get("epochs", 1),
                batch_size=training_params.get("batch_size", 16),
                validation_split=training_params.get("validation_split", 0.2),
                early_stopping_patience=training_params.get("early_stopping_patience", 10)
            ))

            if train_res.get("success"):
                result["success"] = True
                result["weights"] = ridge.get_weights()
                result["accuracy"] = train_res.get("accuracy", 0.0)
                result["rmse"] = train_res.get("rmse", 0.0)
                result["epochs_trained"] = train_res.get("epochs_trained", 0)
                result["training_samples"] = train_res.get("training_samples", 0)
                result["alpha"] = train_res.get("alpha", 0.0)
            else:
                result["error_message"] = train_res.get("message", "Training failed inside TinyRidge")

        else:
            result["error_message"] = f"Unsupported model type: {model_type}"

        # Output result to real stdout
        json.dump(result, _REAL_STDOUT)
        _REAL_STDOUT.flush()

    except Exception as e:
        error_res = {
            "success": False,
            "error_message": f"Worker exception: {str(e)}",
            "traceback": traceback.format_exc()
        }
        json.dump(error_res, _REAL_STDOUT)
        _REAL_STDOUT.flush()


if __name__ == "__main__":
    main()
