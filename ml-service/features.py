from pymongo import MongoClient
from datetime import datetime, timedelta
import numpy as np


def extract_live_features(ip, mongo_uri='mongodb://localhost:27017/',
                          db_name='gateway_db',
                          window_minutes=5):
    """
    Extract features for a single IP from recent request logs.
    Used for real-time scoring of incoming requests.
    """
    client = MongoClient(mongo_uri)
    db     = client[db_name]

    since = datetime.utcnow() - timedelta(minutes=window_minutes)

    logs = list(db.requestlogs.find(
        {
            'ip':        ip,
            'createdAt': { '$gte': since },
        },
        {
            'statusCode': 1,
            'latencyMs':  1,
            'method':     1,
            'userAgent':  1,
            'bytesIn':    1,
            'path':       1,
        }
    ))

    client.close()

    if not logs:
        # no history — treat as new clean IP
        return {
            'request_count':  1,
            'error_rate':     0.0,
            'avg_latency':    0.0,
            'unique_agents':  1,
            'unique_paths':   1,
            'unique_methods': 1,
            'avg_bytes_in':   0.0,
        }

    # ── calculate features ─────────────────────────────────
    request_count  = len(logs)
    error_count    = sum(1 for l in logs if l.get('statusCode', 200) >= 400)
    error_rate     = error_count / request_count
    latencies      = [l.get('latencyMs', 0) for l in logs]
    avg_latency    = float(np.mean(latencies)) if latencies else 0.0
    unique_agents  = len(set(l.get('userAgent', '') for l in logs))
    unique_paths   = len(set(l.get('path', '') for l in logs))
    unique_methods = len(set(l.get('method', '') for l in logs))
    bytes_in       = [l.get('bytesIn', 0) for l in logs]
    avg_bytes_in   = float(np.mean(bytes_in)) if bytes_in else 0.0

    return {
        'request_count':  request_count,
        'error_rate':     round(error_rate, 4),
        'avg_latency':    round(avg_latency, 2),
        'unique_agents':  unique_agents,
        'unique_paths':   unique_paths,
        'unique_methods': unique_methods,
        'avg_bytes_in':   round(avg_bytes_in, 2),
    }


if __name__ == '__main__':
    # test with localhost IP
    features = extract_live_features('::1')
    print('Features for ::1:', features)