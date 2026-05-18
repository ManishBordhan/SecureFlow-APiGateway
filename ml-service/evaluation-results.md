\# ML Model Evaluation Results



\## Test Dataset

\- 200 normal traffic samples

\- 50 attack samples (4 types)

&#x20; - Rate surge: 15 samples

&#x20; - Credential stuffing: 10 samples

&#x20; - Path scanning: 15 samples

&#x20; - Payload attack: 10 samples

\- Total: 250 samples



\## Results



| Model                | Precision | Recall | F1 Score | Accuracy |

|----------------------|-----------|--------|----------|----------|

| Isolation Forest     | 0.731     | 0.980  | 0.838    | 92%      |

| Local Outlier Factor | 0.847     | 1.000  | 0.917    | 96%      |

| One-Class SVM        | 0.794     | 1.000  | 0.885    | 95%      |



\## Model Selection Justification



Isolation Forest was selected despite lower F1 because:

1\. O(log n) inference time vs O(n) for LOF

2\. Supports incremental prediction without retraining

3\. Handles high-dimensional feature spaces efficiently

4\. 98% recall means only 1 in 50 attacks is missed

5\. Latency-accuracy tradeoff favours Isolation Forest

&#x20;  for real-time gateway deployment



\## Attack Type Detection



All four attack types were correctly identified:

\- Rate surge: detected via high request\_count feature

\- Credential stuffing: detected via high error\_rate + low latency

\- Path scanning: detected via high unique\_paths + unique\_agents

\- Payload attack: detected via high avg\_bytes\_in feature

