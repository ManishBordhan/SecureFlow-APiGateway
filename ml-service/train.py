import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report
from collect import collect_features


FEATURE_COLS = [
    'request_count',
    'error_rate',
    'avg_latency',
    'unique_agents',
    'unique_paths',
    'unique_methods',
    'avg_bytes_in',
]


def train(contamination=0.05):
    """
    Train an Isolation Forest model on gateway request logs.
    contamination = estimated fraction of anomalous traffic (5%)
    """
    print('=== Collecting training data from MongoDB ===')
    df = collect_features(hours=24)

    if df is None or len(df) < 10:
        print('Not enough data to train — need at least 10 unique IPs')
        print('Generating synthetic training data for demonstration...')
        df = generate_synthetic_data()

    X = df[FEATURE_COLS].values

    # ── scale features ─────────────────────────────────────
    print('\n=== Scaling features ===')
    scaler  = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # ── train Isolation Forest ─────────────────────────────
    print('\n=== Training Isolation Forest ===')
    print(f'Training on {len(X)} samples')
    print(f'Contamination rate: {contamination * 100}%')

    model = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=42,
        verbose=0,
    )
    model.fit(X_scaled)

    # ── evaluate on training data ──────────────────────────
    predictions = model.predict(X_scaled)
    scores      = model.score_samples(X_scaled)

    normal_count  = (predictions ==  1).sum()
    anomaly_count = (predictions == -1).sum()

    print(f'\n=== Training Results ===')
    print(f'Normal samples:  {normal_count}')
    print(f'Anomaly samples: {anomaly_count}')
    print(f'Score range:     {scores.min():.4f} to {scores.max():.4f}')

    # add predictions to dataframe for inspection
    df['prediction'] = predictions
    df['score']      = scores

    print('\n=== Flagged anomalies ===')
    anomalies = df[df['prediction'] == -1][['ip'] + FEATURE_COLS + ['score']]
    if len(anomalies) > 0:
        print(anomalies.to_string())
    else:
        print('No anomalies detected in training data')

    # ── save model and scaler ──────────────────────────────
    joblib.dump(model,  'model.pkl')
    joblib.dump(scaler, 'scaler.pkl')
    print('\n=== Model saved to model.pkl ===')
    print('=== Scaler saved to scaler.pkl ===')

    return model, scaler


def generate_synthetic_data():
    """
    Generate synthetic training data when not enough
    real logs exist. Simulates normal and attack traffic.
    """
    np.random.seed(42)
    n_normal = 200
    n_attack = 10

    # normal traffic patterns
    normal = pd.DataFrame({
        'ip':            [f'192.168.1.{i}' for i in range(n_normal)],
        'request_count': np.random.randint(1, 30, n_normal),
        'error_rate':    np.random.uniform(0, 0.1, n_normal),
        'avg_latency':   np.random.uniform(50, 500, n_normal),
        'unique_agents': np.random.randint(1, 3, n_normal),
        'unique_paths':  np.random.randint(1, 10, n_normal),
        'unique_methods':np.random.randint(1, 3, n_normal),
        'avg_bytes_in':  np.random.uniform(0, 1000, n_normal),
    })

    # attack traffic patterns
    attack = pd.DataFrame({
        'ip':            [f'10.0.0.{i}' for i in range(n_attack)],
        'request_count': np.random.randint(100, 500, n_attack),
        'error_rate':    np.random.uniform(0.5, 1.0, n_attack),
        'avg_latency':   np.random.uniform(1, 10, n_attack),
        'unique_agents': np.random.randint(10, 50, n_attack),
        'unique_paths':  np.random.randint(50, 200, n_attack),
        'unique_methods':np.random.randint(1, 2, n_attack),
        'avg_bytes_in':  np.random.uniform(10000, 100000, n_attack),
    })

    df = pd.concat([normal, attack], ignore_index=True)
    df = df.fillna(0)
    print(f'Generated {len(df)} synthetic samples ({n_normal} normal, {n_attack} attack)')
    return df


if __name__ == '__main__':
    train()