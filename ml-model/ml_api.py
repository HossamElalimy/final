from flask import Flask, request, jsonify
import numpy as np

app = Flask(__name__)

@app.route("/predict", methods=["POST"])
def predict_behavior():
    data = request.get_json()
    predictions = []

    for student in data["students"]:
        attended_rate = student["attendance"].count("Attended") / max(len(student["attendance"]), 1)
        avg_spend = np.mean(student["transactions"]) if student["transactions"] else 0

        attendancePrediction = (
            "Excellent attendance expected" if attended_rate > 0.9 else
            "Moderate attendance with some risk" if attended_rate > 0.7 else
            "Likely to miss future sessions"
        )

        spendingPrediction = (
            "High spender" if avg_spend > 100 else
            "Moderate spender" if avg_spend > 50 else
            "Low spending pattern"
        )

        predictions.append({
            "studentId": student["studentId"],
            "studentName": student["studentName"],
            "attendancePrediction": attendancePrediction,
            "spendingPrediction": spendingPrediction
        })

    return jsonify(predictions)

if __name__ == "__main__":
    app.run(port=8000)
