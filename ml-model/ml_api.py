from flask import Flask, request, jsonify
import joblib
import os

app = Flask(__name__)

# === Load Trained Models ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = BASE_DIR

attendance_model = joblib.load(os.path.join(MODELS_DIR, "attendance_model.pkl"))
advanced_attendance_model = joblib.load(os.path.join(MODELS_DIR, "advanced_attendance_model.pkl"))
spending_model = joblib.load(os.path.join(MODELS_DIR, "spending_model.pkl"))
spending_type_model = joblib.load(os.path.join(MODELS_DIR, "spending_type_model.pkl"))
spending_regressor = joblib.load(os.path.join(MODELS_DIR, "spending_regression.pkl"))

# === Predict Endpoint ===
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()

        if not isinstance(data, list):
            return jsonify({"error": "Expected a list of student data"}), 400

        results = []

        attendance_map = {0: "Low attendance expected", 1: "High attendance expected"}
        reliability_map = {0: "May miss some lectures", 1: "Likely to attend regularly"}
        spending_label_map = {0: "Low", 1: "Medium", 2: "High"}
        spending_type_map = {0: "Essentials", 1: "Mixed", 2: "Luxuries"}

        for student in data:
            studentId = student.get("studentId")
            attendance_features = student.get("attendanceFeatures", [])
            spending_features = student.get("spendingFeatures", [])

            if not studentId or not attendance_features or not spending_features:
                continue

            att_pred = attendance_model.predict([attendance_features])[0]
            att_raw = attendance_features[0]
            late_raw = attendance_features[1]
            absent_raw = attendance_features[2]

            total = att_raw + late_raw + absent_raw
            if total == 0:
                att_prob = late_prob = absent_prob = 0
            else:
                att_prob = att_raw / total
                late_prob = late_raw / total
                absent_prob = absent_raw / total



            reliability_pred = advanced_attendance_model.predict([attendance_features])[0]
            
            pred_avg = float(spending_regressor.predict([spending_features])[0])
            transactions_per_day = min(spending_features[1], 1)
            transactions_per_week = transactions_per_day * 7
            pred_week_spend = pred_avg * transactions_per_week
            pred_month_spend = pred_week_spend * 4
            def classify_spending_category(amount):
                if amount < 500:
                    return 0  # Low
                elif amount < 1500:
                    return 1  # Medium
                else:
                    return 2  # High

            spend_label = classify_spending_category(pred_month_spend)

            spend_type = spending_type_model.predict([spending_features])[0]
      

            

            result = {
    "studentId": studentId,
    "attendancePrediction": int(att_pred),
    "advancedAttendance": int(reliability_pred),
    "attendanceProb": round(att_prob, 2),
    "lateProb": round(late_prob, 2),
    "absenceProb": round(absent_prob, 2),
    "spendingLabel": int(spend_label),
    "spendingType": int(spend_type),
    "predictedAvgSpend": round(pred_avg, 2),

    "predictedSpendingNextWeek": round(pred_week_spend, 2),
    "predictedSpendingNextMonth": round(pred_month_spend, 2)
   
}

            results.append(result)

        return jsonify(results)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# === Budget Assistance Endpoint ===
@app.route("/budget-assist", methods=["POST"])
def budget_assist():
    try:
        data = request.get_json()

        if not isinstance(data, list):
            return jsonify({"error": "Expected a list of student data"}), 400

        results = []

        for student in data:
            studentId = student.get("studentId")
            spending_features = student.get("spendingFeatures", [])

            if not studentId or not spending_features:
                continue

            predicted_spend = float(spending_regressor.predict([spending_features])[0])
            advice = get_budget_advice(predicted_spend)

            result = {
                "studentId": studentId,
                "predictedSpendingNextWeek": round(predicted_spend, 2),
                **advice
            }

            results.append(result)

        return jsonify(results)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# === Advice Generator ===
def get_budget_advice(avg_spend):
    if avg_spend < 50:
        return {
            "personalAdvice": "Excellent control over spending.",
            "budgetingTip": "Consider saving small amounts weekly."
        }
    elif avg_spend < 150:
        return {
            "personalAdvice": "Your spending is moderate.",
            "budgetingTip": "Keep an eye on wants vs needs."
        }
    else:
        return {
            "personalAdvice": "You're spending quite a lot.",
            "budgetingTip": "Try setting a weekly cap for better control."
        }


if __name__ == "__main__":
    app.run(port=5001, debug=True)
