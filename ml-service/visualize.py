import numpy as np
import joblib
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from sklearn.metrics import confusion_matrix, precision_score, recall_score, f1_score
from sklearn.neighbors import LocalOutlierFactor
from sklearn.svm import OneClassSVM

# ── Load model ─────────────────────────────────────────────────
model  = joblib.load('model.pkl')
scaler = joblib.load('scaler.pkl')

np.random.seed(99)

# ── Test dataset ───────────────────────────────────────────────
normal = np.column_stack([
    np.random.randint(1, 30,    200),
    np.random.uniform(0, 0.1,  200),
    np.random.uniform(100, 600,200),
    np.random.randint(1, 3,    200),
    np.random.randint(1, 8,    200),
    np.random.randint(1, 3,    200),
    np.random.uniform(0, 1000, 200),
])

rate_surge = np.column_stack([
    np.random.randint(200, 500, 15),
    np.random.uniform(0, 0.15, 15),
    np.random.uniform(50, 200,  15),
    np.random.randint(1, 3,     15),
    np.random.randint(1, 5,     15),
    np.random.randint(1, 2,     15),
    np.random.uniform(0, 500,   15),
])

credential_stuffing = np.column_stack([
    np.random.randint(50, 150,  10),
    np.random.uniform(0.7, 1.0, 10),
    np.random.uniform(10, 50,   10),
    np.random.randint(1, 3,     10),
    np.random.randint(1, 3,     10),
    np.random.randint(1, 2,     10),
    np.random.uniform(0, 200,   10),
])

path_scanning = np.column_stack([
    np.random.randint(100, 300, 15),
    np.random.uniform(0.3, 0.6, 15),
    np.random.uniform(50, 200,  15),
    np.random.randint(5, 20,    15),
    np.random.randint(50, 200,  15),
    np.random.randint(1, 4,     15),
    np.random.uniform(0, 300,   15),
])

payload_attack = np.column_stack([
    np.random.randint(20, 80,        10),
    np.random.uniform(0.1, 0.3,      10),
    np.random.uniform(100, 400,      10),
    np.random.randint(1, 3,          10),
    np.random.randint(1, 5,          10),
    np.random.randint(1, 2,          10),
    np.random.uniform(80000, 200000, 10),
])

attacks = np.vstack([rate_surge, credential_stuffing, path_scanning, payload_attack])
X_test  = np.vstack([normal, attacks])
y_true  = np.array([1] * 200 + [-1] * 50)

X_scaled = scaler.transform(X_test)

# ── Predictions ────────────────────────────────────────────────
y_if  = model.predict(X_scaled)

lof = LocalOutlierFactor(n_neighbors=20, contamination=0.05, novelty=True)
lof.fit(X_scaled[:200])
y_lof = lof.predict(X_scaled)

svm = OneClassSVM(kernel='rbf', nu=0.05)
svm.fit(X_scaled[:200])
y_svm = svm.predict(X_scaled)

models      = ['Isolation Forest', 'Local Outlier\nFactor', 'One-Class SVM']
predictions = [y_if, y_lof, y_svm]
colors      = ['#1C7293', '#02C39A', '#6366F1']

# ══════════════════════════════════════════════════════════════
# Figure 1 — Confusion Matrices
# ══════════════════════════════════════════════════════════════
fig, axes = plt.subplots(1, 3, figsize=(15, 5))
fig.suptitle('Confusion Matrices — Anomaly Detection Models',
             fontsize=16, fontweight='bold', y=1.02)

for ax, name, y_pred, color in zip(axes, models, predictions, colors):
    cm = confusion_matrix(y_true, y_pred, labels=[-1, 1])

    im = ax.imshow(cm, interpolation='nearest',
                   cmap=plt.cm.Blues)

    ax.set_title(name.replace('\n', ' '), fontsize=13,
                 fontweight='bold', pad=12)

    classes = ['Attack (-1)', 'Normal (1)']
    tick_marks = np.arange(len(classes))
    ax.set_xticks(tick_marks)
    ax.set_yticks(tick_marks)
    ax.set_xticklabels(classes, fontsize=10)
    ax.set_yticklabels(classes, fontsize=10)

    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, format(cm[i, j], 'd'),
                    ha='center', va='center', fontsize=14,
                    fontweight='bold',
                    color='white' if cm[i, j] > thresh else 'black')

    ax.set_ylabel('True Label', fontsize=11)
    ax.set_xlabel('Predicted Label', fontsize=11)

    p = precision_score(y_true, y_pred, pos_label=-1, zero_division=0)
    r = recall_score(y_true, y_pred, pos_label=-1, zero_division=0)
    f = f1_score(y_true, y_pred, pos_label=-1, zero_division=0)
    ax.set_xlabel(
        f'Predicted Label\nPrecision: {p:.3f}  Recall: {r:.3f}  F1: {f:.3f}',
        fontsize=10
    )

plt.tight_layout()
plt.savefig('confusion_matrices.png', dpi=150, bbox_inches='tight',
            facecolor='white')
print('Saved: confusion_matrices.png')
plt.close()

# ══════════════════════════════════════════════════════════════
# Figure 2 — Model Comparison Bar Chart
# ══════════════════════════════════════════════════════════════
metrics = {
    'Precision': [],
    'Recall':    [],
    'F1 Score':  [],
    'Accuracy':  [],
}

for y_pred in predictions:
    metrics['Precision'].append(precision_score(y_true, y_pred, pos_label=-1, zero_division=0))
    metrics['Recall'].append(recall_score(y_true, y_pred, pos_label=-1, zero_division=0))
    metrics['F1 Score'].append(f1_score(y_true, y_pred, pos_label=-1, zero_division=0))
    metrics['Accuracy'].append(np.mean(y_true == y_pred))

x     = np.arange(len(models))
width = 0.2
fig, ax = plt.subplots(figsize=(13, 7))

metric_colors = ['#1C7293', '#02C39A', '#6366F1', '#F59E0B']
bars_list = []

for idx, (metric, vals) in enumerate(metrics.items()):
    offset = (idx - 1.5) * width
    bars = ax.bar(x + offset, vals, width,
                  label=metric,
                  color=metric_colors[idx],
                  alpha=0.85,
                  edgecolor='white',
                  linewidth=0.5)
    bars_list.append(bars)

    for bar, val in zip(bars, vals):
        ax.text(bar.get_x() + bar.get_width() / 2,
                bar.get_height() + 0.01,
                f'{val:.3f}',
                ha='center', va='bottom',
                fontsize=9, fontweight='bold')

ax.set_xlabel('Model', fontsize=13, fontweight='bold')
ax.set_ylabel('Score', fontsize=13, fontweight='bold')
ax.set_title('ML Model Comparison — Anomaly Detection Performance',
             fontsize=15, fontweight='bold', pad=15)
ax.set_xticks(x)
ax.set_xticklabels(['Isolation Forest', 'Local Outlier Factor', 'One-Class SVM'],
                   fontsize=12)
ax.set_ylim(0, 1.12)
ax.legend(fontsize=11, loc='upper left')
ax.grid(axis='y', alpha=0.3, linestyle='--')
ax.set_facecolor('#F8FBFF')
fig.patch.set_facecolor('white')

ax.axhline(y=1.0, color='gray', linestyle='--', alpha=0.4, linewidth=1)

plt.tight_layout()
plt.savefig('model_comparison.png', dpi=150, bbox_inches='tight',
            facecolor='white')
print('Saved: model_comparison.png')
plt.close()

# ══════════════════════════════════════════════════════════════
# Figure 3 — Rate Limiting Benchmark Chart
# ══════════════════════════════════════════════════════════════
algos      = ['Token Bucket', 'Sliding Window', 'Fixed Window']
req_sec    = [36.14, 32.47, 32.80]
avg_lat    = [276.22, 307.93, 304.81]
p99_lat    = [367, 411, 411]
max_lat    = [413, 1117, 444]

fig, axes = plt.subplots(1, 3, figsize=(16, 6))
fig.suptitle('Rate Limiting Algorithm Benchmark Comparison',
             fontsize=15, fontweight='bold', y=1.02)

bar_colors = ['#1C7293', '#02C39A', '#6366F1']

# Chart 1 — Requests per second
ax1 = axes[0]
bars = ax1.bar(algos, req_sec, color=bar_colors, alpha=0.85,
               edgecolor='white', linewidth=0.5)
ax1.set_title('Throughput (Req/sec)', fontweight='bold', fontsize=12)
ax1.set_ylabel('Requests per Second', fontsize=11)
ax1.set_ylim(0, 45)
ax1.grid(axis='y', alpha=0.3, linestyle='--')
ax1.set_facecolor('#F8FBFF')
for bar, val in zip(bars, req_sec):
    ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.3,
             f'{val}', ha='center', va='bottom', fontweight='bold', fontsize=11)
ax1.set_xticklabels(algos, fontsize=9)

# Chart 2 — Average latency
ax2 = axes[1]
bars = ax2.bar(algos, avg_lat, color=bar_colors, alpha=0.85,
               edgecolor='white', linewidth=0.5)
ax2.set_title('Average Latency (ms)', fontweight='bold', fontsize=12)
ax2.set_ylabel('Latency (ms)', fontsize=11)
ax2.set_ylim(0, 380)
ax2.grid(axis='y', alpha=0.3, linestyle='--')
ax2.set_facecolor('#F8FBFF')
for bar, val in zip(bars, avg_lat):
    ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 3,
             f'{val}ms', ha='center', va='bottom', fontweight='bold', fontsize=11)
ax2.set_xticklabels(algos, fontsize=9)

# Chart 3 — P99 and Max latency
ax3 = axes[2]
x3     = np.arange(len(algos))
width3 = 0.35
b1 = ax3.bar(x3 - width3/2, p99_lat, width3, label='P99 Latency',
             color=bar_colors, alpha=0.85, edgecolor='white')
b2 = ax3.bar(x3 + width3/2, max_lat, width3, label='Max Latency',
             color=bar_colors, alpha=0.45, edgecolor='white')
ax3.set_title('P99 vs Max Latency (ms)', fontweight='bold', fontsize=12)
ax3.set_ylabel('Latency (ms)', fontsize=11)
ax3.set_xticks(x3)
ax3.set_xticklabels(algos, fontsize=9)
ax3.legend(fontsize=9)
ax3.grid(axis='y', alpha=0.3, linestyle='--')
ax3.set_facecolor('#F8FBFF')

plt.tight_layout()
plt.savefig('benchmark_comparison.png', dpi=150, bbox_inches='tight',
            facecolor='white')
print('Saved: benchmark_comparison.png')
plt.close()

print('\nAll charts generated successfully.')
print('Files: confusion_matrices.png, model_comparison.png, benchmark_comparison.png')