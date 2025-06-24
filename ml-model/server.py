from flask import Flask, jsonify
from flask_cors import CORS
import joblib
from pymongo import MongoClient
import numpy as np
import pandas as pd


app = Flask(__name__)
CORS(app)

# Load Models
att_model = joblib.load("attendance_model.pkl")
adv_att_model = joblib.load("advanced_attendance_model.pkl")
att_encoder = joblib.load("attendance_encoder.pkl")
adv_att_encoder = joblib.load("advanced_attendance_encoder.pkl")

spend_model = joblib.load("spending_model.pkl")
spend_type_model = joblib.load("spending_type_model.pkl")
spend_encoder = joblib.load("spending_encoder.pkl")
spend_type_encoder = joblib.load("spending_type_encoder.pkl")

spend_predictor = joblib.load("spending_regression.pkl")

# DB Connection
client = MongoClient("mongodb://localhost:27017/")
db = client["rfidCampus"]
transactions_col = db["transactions"]
attendances_col = db["attendances"]
users_col = db["users"]

@app.route("/api/predict/<studentId>", methods=["GET"])
def predict(studentId):
    try:
        student = users_col.find_one({ "userId": studentId })
        if not student:
            return jsonify({ "error": "Student not found" }), 404

        # Attendance
        att_data = list(attendances_col.find({ "studentId": studentId }))
        if not att_data: return jsonify({ "error": "No attendance data" }), 400

        total = len(att_data)
        attended = sum(a["status"] == "Attended" for a in att_data)
        late = sum(a["status"] == "Late" for a in att_data)
        absent = sum(a["status"] == "Absent" for a in att_data)
        att_features = np.array([[attended / total, late / total, absent / total]])

        # Transactions
        tx_data = list(transactions_col.find({ "userId": studentId }))
        if not tx_data: return jsonify({ "error": "No transaction data" }), 400

        total_amount = sum(t["amount"] for t in tx_data)
        count = len(tx_data)
        avg_amount = total_amount / count
        tx_features = np.array([[total_amount, count, avg_amount]])

        # Predictions
        att_pred = att_encoder.inverse_transform(att_model.predict(att_features))[0]
        adv_att_pred = adv_att_encoder.inverse_transform(adv_att_model.predict(att_features))[0]

        spend_pred = spend_encoder.inverse_transform(spend_model.predict(tx_features))[0]
        spend_type_pred = spend_type_encoder.inverse_transform(spend_type_model.predict(tx_features))[0]

        predicted_next_spend = float(spend_predictor.predict(tx_features)[0])
        predicted_next_spend = round(predicted_next_spend, 2)

        # Advice
        advice = ""
        if spend_pred == "High" and adv_att_pred == "High Risk of Absence":
            advice = "⚠️ High spender with poor attendance. Consider discussing spending habits."
        elif spend_pred == "Low" and adv_att_pred == "Highly Committed":
            advice = "✅ Excellent attendance and low spending. Student is managing very well."
        elif avg_amount > 100:
            advice = "💳 Suggest setting a spending cap per week."
        else:
            advice = "🧠 Track spending monthly and reward good budgeting."

        return jsonify({
            "studentId": studentId,
            "studentName": student.get("fullName"),
            "attendancePrediction": att_pred,
            "advancedAttendance": adv_att_pred,
            "spendingPrediction": spend_pred,
            "spendingType": spend_type_pred,
            "predictedNextSpend": predicted_next_spend,
            "budgetAdvice": advice
        })
    except Exception as e:
        print("❌ Prediction error:", e)
        return jsonify({ "error": "Server error" }), 500
    

@app.route("/api/predict/future/<studentId>", methods=["GET"])
def predict_future(studentId):
    try:
        # fetch student & past data
        student = users_col.find_one({ "userId": studentId })
        if not student:
            return jsonify({ "error": "Student not found" }), 404

        # Process attendance history
        att_data = list(attendances_col.find({ "studentId": studentId }))
        if len(att_data) < 5:
            return jsonify({ "error": "Not enough attendance history" }), 400
        df_att = pd.DataFrame(att_data)
        df_att['date'] = pd.to_datetime(df_att['date'])
        df_att['week'] = df_att['date'].dt.isocalendar().week
        recent_weeks = df_att[df_att['week'] >= df_att['week'].max() - 3]
        att_rate = (recent_weeks['status'] == 'Attended').sum() / len(recent_weeks)

        # Process transaction history
        tx_data = list(transactions_col.find({ "userId": studentId }))
        df_tx = pd.DataFrame(tx_data)
        df_tx['timestamp'] = pd.to_datetime(df_tx['timestamp'])
        df_tx['week'] = df_tx['timestamp'].dt.isocalendar().week
        recent_tx = df_tx[df_tx['week'] >= df_tx['week'].max() - 3]
        spend_avg = recent_tx['amount'].mean()

        return jsonify({
            "studentId": studentId,
            "studentName": student.get("fullName"),
            "predictedAttendanceRateNextWeek": round(att_rate, 2),
            "predictedSpendingNextWeek": round(spend_avg, 2),
            "personalAdvice": (
                "Keep up the good attendance!" if att_rate > 0.8 else
                "Try to improve attendance next week."
            ),
            "budgetingTip": (
                "Monitor your purchases, you spend a lot!" if spend_avg > 100 else
                "Spending is within normal range."
            )
        })
    except Exception as e:
        print("❌ Future prediction error:", e)
        return jsonify({ "error": "Internal server error" }), 500


if __name__ == "__main__":
    app.run(port=5001, debug=True)
