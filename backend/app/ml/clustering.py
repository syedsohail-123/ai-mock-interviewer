import math
from typing import List, Dict, Any

class AnswerClusteringService:
    """
    Unsupervised ML service using TF-IDF feature extraction and K-Means clustering
    to discover candidate communication patterns, depth distributions, and topic clusters.
    """

    @staticmethod
    def cluster_interview_answers(answers: List[str], n_clusters: int = 2) -> Dict[str, Any]:
        if not answers or len(answers) < 2:
            return {
                "clusters": [{"cluster_id": 0, "size": len(answers), "label": "Foundational Responses", "answers": answers}],
                "insights": ["Answer corpus is too small for multi-cluster segmentation."]
            }

        # 1. Tokenize and build vocabulary for TF-IDF feature matrix
        tokenized_docs = [[w.lower().strip(".,!?;:") for w in doc.split() if len(w) > 2] for doc in answers]
        vocab = sorted(list({w for doc in tokenized_docs for w in doc}))
        
        if not vocab:
            return {"clusters": [], "insights": ["No significant vocabulary extracted."]}

        # Compute Document Frequencies
        df = {word: sum(1 for doc in tokenized_docs if word in doc) for word in vocab}
        n_docs = len(answers)

        # 2. Vectorize docs with TF-IDF
        vectors = []
        for doc in tokenized_docs:
            vec = []
            doc_len = max(1, len(doc))
            for word in vocab:
                tf = doc.count(word) / doc_len
                idf = math.log((1 + n_docs) / (1 + df[word])) + 1.0
                vec.append(tf * idf)
            # Normalize vector L2
            norm = math.sqrt(sum(x * x for x in vec)) or 1.0
            vectors.append([x / norm for x in vec])

        # 3. K-Means Clustering (Deterministic Initialization & Assignment)
        k = min(n_clusters, len(answers))
        # Initial centroids: select first k distinct vectors
        centroids = [vectors[i] for i in range(k)]

        assignments = [0] * len(vectors)
        for _ in range(10): # 10 iterations
            # Assign points to nearest centroid
            new_assignments = []
            for vec in vectors:
                best_cluster = 0
                best_sim = -1.0
                for c_idx, centroid in enumerate(centroids):
                    sim = sum(vec[j] * centroid[j] for j in range(len(vocab)))
                    if sim > best_sim:
                        best_sim = sim
                        best_cluster = c_idx
                new_assignments.append(best_cluster)

            if new_assignments == assignments:
                break
            assignments = new_assignments

            # Recompute centroids
            for c_idx in range(k):
                cluster_points = [vectors[p] for p in range(len(vectors)) if assignments[p] == c_idx]
                if cluster_points:
                    new_centroid = [
                        sum(cluster_points[p][dim] for p in range(len(cluster_points))) / len(cluster_points)
                        for dim in range(len(vocab))
                    ]
                    norm = math.sqrt(sum(x * x for x in new_centroid)) or 1.0
                    centroids[c_idx] = [x / norm for x in new_centroid]

        # 4. Generate Cluster Labels & Insights
        clusters_output = []
        for c_idx in range(k):
            indices = [i for i, a in enumerate(assignments) if a == c_idx]
            cluster_answers = [answers[i] for i in indices]
            
            # Find top characteristic words in this cluster's centroid
            sorted_vocab_indices = sorted(range(len(vocab)), key=lambda idx: centroids[c_idx][idx], reverse=True)
            top_keywords = [vocab[idx] for idx in sorted_vocab_indices[:3] if centroids[c_idx][idx] > 0]
            
            label = " & ".join([w.capitalize() for w in top_keywords]) if top_keywords else f"Theme {c_idx + 1}"
            
            clusters_output.append({
                "cluster_id": c_idx,
                "label": label or f"Cluster {c_idx + 1}",
                "top_keywords": top_keywords,
                "answer_count": len(cluster_answers),
                "answer_indices": indices,
            })

        return {
            "num_clusters": len(clusters_output),
            "clusters": clusters_output,
            "insights": [
                f"Identified {len(clusters_output)} distinct communication/technical themes across candidate answers.",
                f"Dominant themes focused on {', '.join([c['label'] for c in clusters_output if c['label']])}."
            ]
        }

answer_clustering_service = AnswerClusteringService()
