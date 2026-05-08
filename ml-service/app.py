from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
from features import extract_live_features

app = Flask(__name__)
CORS(app)

FEATURE_COLS = [
    'request_count',
    'error_rate',
    'avg_latency',
    'unique_agents',
    'unique_paths',
    'unique_methods',
    'avg_bytes_in',
]

model  = None
scaler = None

def load_model():
    global model, scaler
    try:
        model  = joblib.load('model.pkl')
        scaler = joblib.load('scaler.pkl')
        print('Model and scaler loaded successfully')
    except FileNotFoundError:
        print('Model not found — run train.py first')


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status':      'healthy',
        'modelLoaded': bool(model is not None),
    })


@app.route('/score', methods=['POST'])
def score():
    if model is None:
        return jsonify({
            'anomaly': False,
            'score':   0.0,
            'action':  'allow',
            'error':   'Model not loaded',
        }), 200

    data = request.get_json()
    ip   = data.get('ip', '0.0.0.0')

    feat_dict = extract_live_features(ip)

    feature_vector = np.array([[
        feat_dict['request_count'],
        feat_dict['error_rate'],
        feat_dict['avg_latency'],
        feat_dict['unique_agents'],
        feat_dict['unique_paths'],
        feat_dict['unique_methods'],
        feat_dict['avg_bytes_in'],
    ]])

    X_scaled   = scaler.transform(feature_vector)
    prediction = model.predict(X_scaled)[0]
    raw_score  = float(model.score_samples(X_scaled)[0])
    normalized = round(max(0, min(100, (-raw_score) * 100)), 2)
    is_anomaly = bool(prediction == -1)
    action     = 'block' if is_anomaly else 'allow'

    return jsonify({
        'ip':       ip,
        'anomaly':  is_anomaly,
        'score':    float(normalized),
        'action':   action,
        'features': {k: float(v) if isinstance(v, (np.floating, np.integer)) else v
                     for k, v in feat_dict.items()},
    })


@app.route('/score/features', methods=['POST'])
def score_features():
    if model is None:
        return jsonify({ 'error': 'Model not loaded' }), 503

    data = request.get_json()

    try:
        feature_vector = np.array([[
            data.get('request_count',  1),
            data.get('error_rate',     0),
            data.get('avg_latency',    0),
            data.get('unique_agents',  1),
            data.get('unique_paths',   1),
            data.get('unique_methods', 1),
            data.get('avg_bytes_in',   0),
        ]])

        X_scaled   = scaler.transform(feature_vector)
        prediction = model.predict(X_scaled)[0]
        raw_score  = float(model.score_samples(X_scaled)[0])
        normalized = round(max(0, min(100, (-raw_score) * 100)), 2)
        is_anomaly = bool(prediction == -1)

        return jsonify({
            'anomaly': is_anomaly,
            'score':   float(normalized),
            'action':  'block' if is_anomaly else 'allow',
        })

    except Exception as e:
        return jsonify({ 'error': str(e) }), 400


@app.route('/model/info', methods=['GET'])
def model_info():
    if model is None:
        return jsonify({ 'error': 'Model not loaded' }), 503

    return jsonify({
        'algorithm':     'Isolation Forest',
        'estimators':    int(model.n_estimators),
        'contamination': float(model.contamination),
        'features':      FEATURE_COLS,
        'version':       '1.0.0',
    })


if __name__ == '__main__':
    load_model()
    print('ML Service running on http://localhost:5001')
    app.run(host='0.0.0.0', port=5001, debug=False)