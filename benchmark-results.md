\# Rate Limiting Algorithm Benchmark Results



\## Test Configuration

\- Tool: autocannon

\- Connections: 10 concurrent

\- Duration: 30 seconds

\- Endpoint: GET /proxy/posts/1

\- Authentication: JWT Bearer token

\- Date: April 2026



\## Results



| Metric              | Token Bucket | Sliding Window | Fixed Window |

|---------------------|-------------|----------------|--------------|

| Avg Requests/sec    | 36.14       | 32.47          | 32.80        |

| Avg Latency         | 276.22ms    | 307.93ms       | 304.81ms     |

| p99 Latency         | 367ms       | 411ms          | 411ms        |

| Max Latency         | 413ms       | 1117ms         | 444ms        |

| Latency Stdev       | 30.65ms     | 45.49ms        | 37.19ms      |

| Total Requests      | 1084        | 974            | 984          |



\## Findings



1\. Token Bucket achieved 11% higher throughput than Sliding Window

&#x20;  and Fixed Window under identical traffic conditions.



2\. Sliding Window exhibited the highest latency spike (1117ms max)

&#x20;  due to sorted set operations (ZREMRANGEBYSCORE + ZCARD) being

&#x20;  more expensive than simple counter operations under concurrency.



3\. Fixed Window and Sliding Window showed near-identical average

&#x20;  throughput (within 1%) but Fixed Window had lower latency spikes,

&#x20;  consistent with its O(1) counter design.



4\. Token Bucket showed the most consistent latency distribution

&#x20;  (stdev 30.65ms vs 45.49ms for Sliding Window), making it the

&#x20;  most predictable algorithm under load.



\## Conclusion



Token Bucket is the recommended algorithm for high-throughput

production use where burst tolerance is acceptable. Sliding Window

is recommended where strict per-window accuracy is required and

throughput can be sacrificed. Fixed Window is suitable for simple

use cases where O(1) operations are preferred over accuracy.

