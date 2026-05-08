from pymongo import MongoClient
import pandas as pd
from datetime import datetime, timedelta

def collect_features(mongo_uri='mongodb://localhost:27017/', 
                     db_name='gateway_db',
                     hours=24):
    """
    Pull request logs from MongoDB and engineer
    features per IP for model training and scoring.
    """
    client = MongoClient(mongo_uri)
    db     = client[db_name]

    # pull logs from last N hours
    since = datetime.utcnow() - timedelta(hours=hours)
    logs  = list(db.requestlogs.find(
        { 'createdAt': { '$gte': since } },
        {
            'ip':         1,
            'statusCode': 1,
            'latencyMs':  1,
            'method':     1,
            'userAgent':  1,
            'bytesIn':    1,
            'path':       1,
            'createdAt':  1,
        }
    ))

    client.close()

    if not logs:
        print('No logs found in MongoDB')
        return None

    df = pd.DataFrame(logs)
    print(f'Loaded {len(df)} request logs from MongoDB')

    # ── engineer features per IP ───────────────────────────
    features = df.groupby('ip').agg(
        request_count  = ('ip',         'count'),
        error_rate     = ('statusCode', lambda x: (x >= 400).mean()),
        avg_latency    = ('latencyMs',  'mean'),
        unique_agents  = ('userAgent',  'nunique'),
        unique_paths   = ('path',       'nunique'),
        unique_methods = ('method',     'nunique'),
        avg_bytes_in   = ('bytesIn',    'mean'),
    ).reset_index()

    # fill any nulls
    features = features.fillna(0)

    print(f'Engineered features for {len(features)} unique IPs')
    print(features.describe())

    return features


if __name__ == '__main__':
    df = collect_features()
    if df is not None:
        df.to_csv('data.csv', index=False)
        print('Saved to data.csv')