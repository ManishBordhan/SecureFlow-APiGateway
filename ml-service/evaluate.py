import numpy as np
import joblib
from sklearn.metrics import precision_score, recall_score, f1_score, classification_report
from sklearn.neighbors import LocalOutlierFactor
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler

# ── Load trained model ─────────────────────────────────────────
model  = joblib.load('model.pkl')
scaler = joblib.load('scaler.pkl')

print("=" * 60)
print("SecureFlow — ML Model Evaluation")
print("=" * 60)

# ── Create labelled test dataset ───────────────────────────────
# Features: request_count, error_rate, avg_latency,
#           unique_agents, unique_paths, unique_methods, avg_bytes_in

np.random.seed(99)

# Normal traffic — 200 samples
normal = np.column_stack([
    np.random.randint(1, 30,    200),   # request_count
    np.random.uniform(0, 0.1,  200),   # error_rate
    np.random.uniform(100, 600,200),   # avg_latency
    np.random.randint(1, 3,    200),   # unique_agents
    np.random.randint(1, 8,    200),   # unique_paths
    np.random.randint(1, 3,    200),   # unique_methods
    np.random.uniform(0, 1000, 200),   # avg_bytes_in
])

# Attack traffic — 50 samples (4 attack types)
rate_surge = np.column_stack([
    np.random.randint(200, 500, 15),   # very high request count
    np.random.uniform(0, 0.15, 15),
    np.random.uniform(50, 200,  15),
    np.random.randint(1, 3,     15),
    np.random.randint(1, 5,     15),
    np.random.randint(1, 2,     15),
    np.random.uniform(0, 500,   15),
])

credential_stuffing = np.column_stack([
    np.random.randint(50, 150,  10),
    np.random.uniform(0.7, 1.0, 10),   # very high error rate
    np.random.uniform(10, 50,   10),   # very low latency (fast rejects)
    np.random.randint(1, 3,     10),
    np.random.randint(1, 3,     10),
    np.random.randint(1, 2,     10),
    np.random.uniform(0, 200,   10),
])

path_scanning = np.column_stack([
    np.random.randint(100, 300, 15),
    np.random.uniform(0.3, 0.6, 15),
    np.random.uniform(50, 200,  15),
    np.random.randint(5, 20,    15),   # many unique agents
    np.random.randint(50, 200,  15),   # many unique paths
    np.random.randint(1, 4,     15),
    np.random.uniform(0, 300,   15),
])

payload_attack = np.column_stack([
    np.random.randint(20, 80,   10),
    np.random.uniform(0.1, 0.3, 10),
    np.random.uniform(100, 400, 10),
    np.random.randint(1, 3,     10),
    np.random.randint(1, 5,     10),
    np.random.randint(1, 2,     10),
    np.random.uniform(80000, 200000, 10),  # huge payloads
])

attacks = np.vstack([rate_surge, credential_stuffing, path_scanning, payload_attack])

# ── Combine and create labels ──────────────────────────────────
X_test = np.vstack([normal, attacks])
# True labels: 1 = normal, -1 = anomaly (matches sklearn convention)
y_true = np.array([1] * 200 + [-1] * 50)

print(f"\nTest dataset: {len(normal)} normal + {len(attacks)} attack samples")
print(f"Attack types: Rate surge (15), Credential stuffing (10), Path scanning (15), Payload attack (10)")

# ── Evaluate Isolation Forest ──────────────────────────────────
print("\n" + "=" * 60)
print("MODEL 1: Isolation Forest (Primary Model)")
print("=" * 60)

X_scaled = scaler.transform(X_test)
y_pred_if = model.predict(X_scaled)

print(classification_report(y_true, y_pred_if,
      target_names=["Attack (-1)", "Normal (1)"], zero_division=0))

p_if = precision_score(y_true, y_pred_if, pos_label=-1, zero_division=0)
r_if = recall_score(y_true, y_pred_if, pos_label=-1, zero_division=0)
f_if = f1_score(y_true, y_pred_if, pos_label=-1, zero_division=0)

print(f"Attack Detection — Precision: {p_if:.3f} | Recall: {r_if:.3f} | F1: {f_if:.3f}")

# ── Evaluate Local Outlier Factor ──────────────────────────────
print("\n" + "=" * 60)
print("MODEL 2: Local Outlier Factor (Alternative)")
print("=" * 60)

lof = LocalOutlierFactor(n_neighbors=20, contamination=0.05, novelty=True)
lof.fit(X_scaled[:200])  # train on normal samples only
y_pred_lof = lof.predict(X_scaled)

print(classification_report(y_true, y_pred_lof,
      target_names=["Attack (-1)", "Normal (1)"], zero_division=0))

p_lof = precision_score(y_true, y_pred_lof, pos_label=-1, zero_division=0)
r_lof = recall_score(y_true, y_pred_lof, pos_label=-1, zero_division=0)
f_lof = f1_score(y_true, y_pred_lof, pos_label=-1, zero_division=0)

print(f"Attack Detection — Precision: {p_lof:.3f} | Recall: {r_lof:.3f} | F1: {f_lof:.3f}")

# ── Evaluate One-Class SVM ─────────────────────────────────────
print("\n" + "=" * 60)
print("MODEL 3: One-Class SVM (Alternative)")
print("=" * 60)

ocsvm = OneClassSVM(kernel='rbf', nu=0.05)
ocsvm.fit(X_scaled[:200])  # train on normal samples only
y_pred_svm = ocsvm.predict(X_scaled)

print(classification_report(y_true, y_pred_svm,
      target_names=["Attack (-1)", "Normal (1)"], zero_division=0))

p_svm = precision_score(y_true, y_pred_svm, pos_label=-1, zero_division=0)
r_svm = recall_score(y_true, y_pred_svm, pos_label=-1, zero_division=0)
f_svm = f1_score(y_true, y_pred_svm, pos_label=-1, zero_division=0)

print(f"Attack Detection — Precision: {p_svm:.3f} | Recall: {r_svm:.3f} | F1: {f_svm:.3f}")

# ── Final comparison ───────────────────────────────────────────
print("\n" + "=" * 60)
print("COMPARISON SUMMARY")
print("=" * 60)
print(f"{'Model':<25} {'Precision':>10} {'Recall':>10} {'F1 Score':>10}")
print("-" * 60)
print(f"{'Isolation Forest':<25} {p_if:>10.3f} {r_if:>10.3f} {f_if:>10.3f}")
print(f"{'Local Outlier Factor':<25} {p_lof:>10.3f} {r_lof:>10.3f} {f_lof:>10.3f}")
print(f"{'One-Class SVM':<25} {p_svm:>10.3f} {r_svm:>10.3f} {f_svm:>10.3f}")
print("=" * 60)
print("\nEvaluation complete. Results saved above.")